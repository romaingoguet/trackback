import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { GeminiResponseService, ContextData, TrackCandidate } from '../gemini-response.service';

interface VideoContext {
  id: string;
  title: string;
  description: string | null;
  lengthSeconds: number;
  publishedAt: string;
  viewCount: number | null;
  channelTitle: string;
}

interface TopComment {
  id: string;
  textDisplay: string;
  likeCount: number | null;
  publishedAt: string;
}

// interface CommentsData {
//   comments: any[];
//   nextPageToken: string | null;
// }

@Injectable()
export class FindService {

  public readonly baseApiUrl = 'https://www.googleapis.com/youtube/v3';
  public readonly apiKey = process.env.YOUTUBE_API_KEY || '';

  constructor(
    private readonly gemini: GeminiResponseService,
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

      // Step 3: Fetch video data once (this also gets comments filtered by keywords)
      const videoData = await this.analyzeVideo(`https://www.youtube.com/watch?v=${videoId}`);

      if (!videoData) {
        return {
          result: null,
          error: `Failed to fetch YouTube context for video: ${videoId}`
        };
      }

      console.log('[FindService] Successfully fetched YouTube context');

      // Step 4: Build track candidates from database
      const trackCandidates: TrackCandidate[] = [
        {
          youtubeLink: trackCandidate.youtube_link,
          timestamp: trackCandidate.timestamp,
          note: trackCandidate.note,
          createdAt: trackCandidate.createdAt || new Date().toISOString(),
        },
      ];

      // Extract videoId as non-null since we validated it earlier
      const validVideoId = videoId!;

      // Step 5: Batch-by-batch comment analysis with pagination until goals are done
      const maxTotalComments = 1000;
      let currentBatchIndex = 0;

      let nextPageToken: string | undefined = undefined;

      // Loop to fetch comment batches and analyze each with LLM until goals are done
      while (currentBatchIndex < maxTotalComments) {
        try {
          const commentsData = await this.fetchOtherComments(validVideoId, nextPageToken);

          console.log(commentsData)

          const filteredComments = this.filterComments(commentsData.comments);
          console.log(`filtered comments : ${filteredComments.length}`)

          // Check if we've processed enough comments for this batch
          if (commentsData.comments && commentsData.comments.length > 0) {
            currentBatchIndex += commentsData.comments.length;
            nextPageToken = commentsData.nextPageToken || null;
            console.log(`[FindService] Fetched batch: ${commentsData.comments.length} comments. Position: ${currentBatchIndex}/${maxTotalComments}`);
            if (currentBatchIndex >= maxTotalComments) {
              break;
            }
          }

          // Build context with video data and CURRENT BATCH only for LLM
          const videoContext = await this.getVideoContext(videoData);

          // Step 7: Send context to LLM for identification - sending ONLY the current batch
          const batchContext: ContextData & { trackCandidates?: TrackCandidate[] } = {
            videoId: videoContext.id,
            title: videoContext.title || '',
            description: videoContext.description || null,
            thumbnailUrl: videoData.thumbnailUrl || '',
            publishedAt: videoContext.publishedAt || '',
            channelTitle: videoContext.channelTitle || '',
            viewCount: videoContext.viewCount || null,
            lengthSeconds: videoContext.lengthSeconds || 0,
            comments: filteredComments,
            trackCandidates: trackCandidates
          };

          console.log(`[FindService] Batch analysis: Sending ${commentsData.comments.length} comments to LLM`);

          const identificationResult = await this.gemini.identifyTrack(batchContext);

          console.log(identificationResult)

          if (identificationResult.error) {
            console.error('[FindService] Identification error:', identificationResult.error);
          } else if (identificationResult.result?.identified === true) {
            // Positive result found! Return immediately.
            console.log('[FindService] Positive identification found');
            return { result: identificationResult.result };
          } else {
            // No result or identified: false - continue to next batch
            console.log(`[FindService] Batch analysis: No positive identification. Continuing...`);
          }
        } catch (error: any) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('[FindService] Error fetching comments:', errorMsg);

          if (errorMsg.includes('YouTube API')) {
            // YouTube-specific errors, continue on quota exceeded or retryable errors
            console.log('[FindService] Continuing despite YouTube API error...');
          } else {
            throw error;
          }
        }
      }

      // All batches exhausted without positive result
      console.log('[FindService] All comment batches analyzed without positive identification');
      return { result: null };

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

  // Helper function to fetch video context for LLM
  async getVideoContext(videoData): Promise<VideoContext> {
    return {
      id: videoData.id,
      title: videoData.title || '',
      description: videoData.description || null,
      lengthSeconds: videoData.lengthSeconds || 0,
      publishedAt: videoData.publishedAt || '',
      viewCount: videoData.viewCount || null,
      channelTitle: videoData.channelTitle || '',
    };
  }

  // Public retryRequest method for batch fetching
  async retryRequest(url: string): Promise<any> {
    return this._retryRequest(url);
  }

  private async _retryRequest(url: string): Promise<any> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.status === 401) throw new Error('YouTube API: Invalid API key');
        if (response.status === 403) throw new Error('YouTube API: Quota exceeded or invalid credentials');

        return response;
      } catch (error) {
        if (attempt < 3) {
          await this.delay(1000 * Math.pow(2, attempt - 1));
        } else {
          throw error instanceof Error ? error : new Error('Request failed after retries');
        }
      }
    }
    throw new Error('Request failed after retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async analyzeVideo(url: string): Promise<any> {
    console.log('[VideoAnalysisService] Analyzing video URL:', url);
    let videoId = this.extractVideoId(url);

    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube video link.');
    }

    try {
      console.log('[VideoAnalysisService] Fetching video data for:', videoId);
      const [videoData] = await Promise.all([
        this.fetchVideoData(videoId),
      ]);

      return {
        id: videoData.id || '',
        url: url,
        title: videoData.snippet?.title || '',
        description: videoData.snippet?.description || null,
        lengthSeconds: this.parseDuration(videoData.contentDetails?.duration),
        publishedAt: videoData.snippet?.publishedAt || '',
        viewCount: videoData.statistics?.viewCount ? parseInt(videoData.statistics.viewCount) : null,
        likeCount: videoData.statistics?.likeCount ? parseInt(videoData.statistics.likeCount) : null,
        commentCount: videoData.statistics?.commentCount ? parseInt(videoData.statistics.commentCount) : null,
        channelTitle: videoData.snippet?.channelTitle || '',
        channelId: videoData.snippet?.channelId || '',
        thumbnailUrl: this.getBestThumbnail(videoData.snippet?.thumbnails),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[VideoAnalysisService] Failed to analyze video:', errorMsg);
      throw new Error(`Failed to analyze YouTube video: ${errorMsg}`);
    }
  }

  filterComments(commentsResponse: TopComment[]): TopComment[] {
    return commentsResponse.filter(comment => {
      return this.keywords.some(keyword =>
        comment.textDisplay.toLowerCase().includes(keyword.toLowerCase())
      );
    });
  }

  async getContextById(videoId: string): Promise<any> {
    return this.analyzeVideo(`https://www.youtube.com/watch?v=${videoId}`);
  }

  private async fetchVideoData(videoId: string): Promise<any> {
    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoId,
      maxResults: '1',
      key: this.apiKey,
    });
    const urlStr = `${this.baseApiUrl}/videos?${params.toString()}`;

    const response = await this.retryRequest(urlStr);
    if (!response || (response as any).status !== 200) {
      throw new Error(`YouTube API request failed: ${(response as any)?.statusText || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.items ? data.items[0] : {};
  }

  async fetchCommentsWithPagination(videoId: string, maxResults: number = 70): Promise<{ comments: TopComment[]; nextPageToken: string | null }> {
    const params = new URLSearchParams({
      part: 'snippet',
      videoId: videoId,
      maxResults: String(maxResults),
      textFormat: 'plainText',
      key: this.apiKey,
    });

    const response = await this.retryRequest(`${this.baseApiUrl}/commentThreads?${params.toString()}`);
    if (!response || (response as any).status !== 200) {
      throw new Error('YouTube API request failed');
    }

    const data = await response.json();
    const comments: TopComment[] = data.items.map((item: any) => this.mapComment(item));

    return {
      comments,
      nextPageToken: (data as any).nextPageToken || null
    };
  }

  private readonly keywords = ['tracklist', 'track', 'song', 'music', 'artist', '@', ':', 'timestamp', 'time', 'unid', 'uid'];

  private parseDuration(durationString?: string): number {
    if (!durationString) return 0;
    const match = durationString.match(/PT?(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    return parseInt(match[1]?.replace('H', '') || '0') * 3600 +
      parseInt(match[2]?.replace('M', '') || '0') * 60 +
      parseInt(match[3] || '0');
  }

  private getBestThumbnail(thumbnails?: { default?: { url: string }; medium?: { url: string }; high?: { url: string } }): string {
    if (thumbnails?.high?.url) return thumbnails.high.url;
    if (thumbnails?.medium?.url) return thumbnails.medium.url;
    return thumbnails?.default?.url || '';
  }

  private mapComment(item: any): TopComment {
    const snippet = item.snippet || {};
    let textDisplay = '';

    if (snippet.textDisplay) {
      textDisplay = snippet.textDisplay;
    } else if (snippet.topLevelComment?.snippet?.textDisplay) {
      textDisplay = snippet.topLevelComment.snippet.textDisplay;
    }

    const topLevel = snippet.topLevelComment?.snippet || { publishedAt: '' };

    return {
      id: item.id,
      textDisplay,
      likeCount: snippet.likeCount ? parseInt(snippet.likeCount) : null,
      publishedAt: topLevel.publishedAt || '',
    };
  }

  // Helper to fetch comments with pagination
  async fetchOtherComments(validVideoId: string, nextPageToken: string | undefined = undefined): Promise<{ comments: TopComment[]; nextPageToken: string | null }> {
    const params = new URLSearchParams({
      part: 'snippet',
      videoId: validVideoId,
      maxResults: String(70),
      textFormat: 'plainText',
      key: process.env.YOUTUBE_API_KEY || '',
      ...(nextPageToken ? { pageToken: nextPageToken } : {}),
    });

    const response = await this.retryRequest(`${this.baseApiUrl}/commentThreads?${params.toString()}`);

    if (!response || (response as any).status !== 200) {
      console.log('[FindService] API request failed');
      return { comments: [], nextPageToken: null };
    }

    const data = await response.json();

    console.log('--data')
    console.log(data.items[1].snippet)

    // Map raw YouTube API comments to our format
    let batchComments: TopComment[] = [];

    batchComments = (data.items || []).map((item: any) => ({
      id: item.id,
      textDisplay: item.snippet?.topLevelComment?.snippet?.textDisplay || '',
      likeCount: item.snippet?.topLevelComment?.snippet?.likeCount ? parseInt(item.snippet?.topLevelComment?.snippet?.likeCount) : null,
      publishedAt: item.snippet?.topLevelComment?.snippet?.publishedAt || '',
    }));

    const nextPage = (data as any).nextPageToken || null;

    if (!batchComments || batchComments.length === 0) {
      console.log('[FindService] No more comments available');
      return { comments: [], nextPageToken: nextPage };
    }

    return { comments: batchComments, nextPageToken: nextPage };
  }
}
