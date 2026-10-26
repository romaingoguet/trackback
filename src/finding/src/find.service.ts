import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { GeminiResponseService, ContextData, TrackCandidate } from '../gemini-response.service';
import { VideoAnalysisService } from '../../youtube/service/videoAnalysis.service';

@Injectable()
export class FindService {

  constructor(
    private readonly gemini: GeminiResponseService,
    private readonly videoAnalysis: VideoAnalysisService
  ) { }

  async identifyByTrackId(id: string): Promise<{ result: any; error?: string }> {
    try {
      console.log('[FindService] Identifying track by ID:', id);

      // Step 1: Fetch track candidate from database by ID
      const trackCandidate = await this.getTrackCandidateById(id);

      if (!trackCandidate) {
        return {
          result: null,
          error: `Track candidate with ID "${id}" not found in database`
        };
      }

      console.log('[FindService] Found track candidate:', {
        youtubeLink: trackCandidate.youtube_link,
        timestamp: trackCandidate.timestamp,
        note: trackCandidate.note
      });

      // Step 2: Extract video ID from YouTube link
      const videoId = this.extractVideoId(trackCandidate.youtube_link);

      if (!videoId) {
        return {
          result: null,
          error: `Could not extract video ID from URL: ${trackCandidate.youtubeLink}`
        };
      }

      // Step 3: Get YouTube context via VideoAnalysisService
      const videoContext = await this.videoAnalysis.getContextById(videoId);

      if (!videoContext) {
        return {
          result: null,
          error: `Failed to fetch YouTube context for video: ${videoId}`
        };
      }

      console.log('[FindService] Successfully fetched YouTube context');

      // Step 4: Build ContextData with video metadata and track candidate
      const contextData: ContextData = {
        videoId,
        title: videoContext.title || '',
        description: videoContext.description || null,
        thumbnailUrl: videoContext.thumbnailUrl || '',
        publishedAt: videoContext.publishedAt || '',
        channelTitle: videoContext.channelTitle || '',
        viewCount: videoContext.viewCount || null,
        lengthSeconds: videoContext.lengthSeconds || 0,
      };

      const trackCandidates: TrackCandidate[] = [
        {
          youtubeLink: trackCandidate.youtubeLink,
          timestamp: trackCandidate.timestamp,
          note: trackCandidate.note,
          createdAt: trackCandidate.createdAt,
        },
      ];

      // Step 5: Call Gemini response service to identify the track
      const identificationResult = await this.gemini.identifyTrack({
        ...contextData,
        trackCandidates,
      });

      if (identificationResult.error) {
        console.error('[FindService] Identification error:', identificationResult.error);
        return identificationResult;
      }

      return { result: identificationResult.result };

    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[FindService] Failed to identify track:', errorMsg);

      // Don't expose sensitive errors like API keys
      if (errorMsg.includes('GEMINI_API_KEY')) {
        return { result: null, error: 'Gemini API key not configured. Please add GEMINI_API_KEY to .env' };
      }

      return { result: null, error: errorMsg };
    }
  }

  private async getTrackCandidateById(id: string): Promise<any | null> {
    try {
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_ANON_KEY!;
      const supabaseClient = createClient(supabaseUrl, supabaseKey);
      const { data, error }: any = await supabaseClient
        .from('track_candidates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Row not found
          return null;
        }
        console.error('[FindService] Database error fetching track candidate:', error.message);
        throw new Error(`Failed to fetch track candidate: ${error.message}`);
      }

      return data || null;
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[FindService] Error in getTrackCandidateById:', errorMsg);
      return null;
    }
  }

  private extractVideoId(url: string): string | null {
    const match1 = url.match(/(?:youtube\.com\/watch\?v=)([^&\s]+)/);
    if (match1 && match1[1]) return match1[1].trim();

    const match2 = url.match(/youtu\.be\/([^?\s]+)/);
    if (match2 && match2[1]) return match2[1].trim();

    const match3 = url.match(/\/embed\/([^"\s]+)/);
    if (match3 && match3[1]) return match3[1].trim();

    console.warn('[FindService] Could not extract video ID from URL');
    return null;
  }
}
