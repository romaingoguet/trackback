import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../core/supabase.service';
import { CreateTrackCandidateDto, TrackCandidate } from '../dto/trackcandidate.dto';

@Injectable()
export class TrackCandidatesService {
  private readonly tableName = 'track_candidates';
  private readonly logger = new Logger(TrackCandidatesService.name);

  async saveTrackCandidate(data: CreateTrackCandidateDto): Promise<TrackCandidate> {
    const { youtubeLink, timestamp, note } = data;

    console.log(youtubeLink)
    console.log(timestamp)

    try {
      const supabase = SupabaseService.supabase;
      const { data: inserted, error } = await supabase
        .from(this.tableName)
        .insert([
          {
            youtube_link: youtubeLink,
            timestamp,
            note: note || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        const msg = error.message || String(error);
        throw new Error(`Failed to save track candidate: ${msg}`);
      }

      return inserted;
    } catch (error) {
      const errorMsg = (error as Error).message || String(error);
      this.logger.error(`Save track candidate error: ${errorMsg}`, (error as Error).stack);
      throw new Error(`Failed to save track candidate: ${errorMsg}`);
    }
  }

  async getAllTrackCandidates(): Promise<TrackCandidate[]> {
    try {
      const supabase = SupabaseService.supabase;
      const data = await supabase.from(this.tableName).select('*').order('created_at', { ascending: false });

      // Handle Supabase response format
      if (Array.isArray(data)) {
        return data;
      }

      if (typeof data === 'object' && data.data) {
        return Array.isArray(data.data) ? data.data : [];
      }

      return [];
    } catch (error) {
      const errorMsg = (error as Error).message || String(error);
      this.logger.error(`Get all track candidates error: ${errorMsg}`, (error as Error).stack);
      throw new Error(`Failed to fetch track candidates: ${errorMsg}`);
    }
  }

  async getTrackCandidateById(id: string): Promise<TrackCandidate | { error: string }> {
    try {
      const supabase = SupabaseService.supabase;
      const result = await supabase.from(this.tableName).select('*').eq('id', id).single();

      // Handle Supabase response format for failures
      if ('error' in result && result.error) {
        return { error: String(result.error.message || result.error) };
      }

      return result.data as TrackCandidate; // Cast to proper type when no error
    } catch (error) {
      const errorMsg = (error as Error).message || String(error);
      this.logger.error(`Get track candidate by ID error: ${errorMsg}`, (error as Error).stack);
      throw new Error(`Failed to fetch track candidate: ${errorMsg}`);
    }
  }

  async updateTrackCandidate(id: string, data: Partial<CreateTrackCandidateDto>): Promise<TrackCandidate | { error: string }> {
    try {
      const supabase = SupabaseService.supabase;
      const { data: updated, error } = await supabase
        .from(this.tableName)
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: String(error.message || error) };
      }

      return updated;
    } catch (error) {
      const errorMsg = (error as Error).message || String(error);
      this.logger.error(`Update track candidate error: ${errorMsg}`, (error as Error).stack);
      throw new Error(`Failed to update track candidate: ${errorMsg}`);
    }
  }

  async deleteTrackCandidate(id: string): Promise<void> {
    try {
      const supabase = SupabaseService.supabase;
      const { data, error } = await supabase.from(this.tableName).delete().eq('id', id);

      if (error) {
        throw new Error(`Failed to delete track candidate: ${String(error.message || error)}`);
      }

      // Check if record exists before deletion
      if (!data) {
        throw new Error('No track candidate found with that ID');
      }
    } catch (error) {
      const errorMsg = (error as Error).message || String(error);
      this.logger.error(`Delete track candidate error: ${errorMsg}`, (error as Error).stack);
      throw new Error(`Failed to delete track candidate: ${errorMsg}`);
    }
  }

  async findByYouTubeLinkPrefix(prefix: string): Promise<TrackCandidate[]> {
    try {
      const supabase = SupabaseService.supabase;
      const data = await supabase.from(this.tableName).select('*').ilike('youtube_link', `${prefix}%`);

      // Handle Supabase response format
      if (Array.isArray(data)) {
        return data;
      }

      if (typeof data === 'object' && data.data) {
        return Array.isArray(data.data) ? data.data : [];
      }

      return [];
    } catch (error) {
      const errorMsg = (error as Error).message || String(error);
      this.logger.error(`Find track candidates by YouTube link prefix error: ${errorMsg}`, (error as Error).stack);
      throw new Error(`Failed to search track candidates: ${errorMsg}`);
    }
  }
}
