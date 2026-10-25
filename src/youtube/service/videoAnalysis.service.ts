import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config();
import { VideoContext, TopComment } from '../dto/video.dto';

interface CachedVideoContext {
  video: VideoContext;
  cachedAt: number;
}

interface VideoItem {
  id: string;
  snippet?: {
    title: string | null;
    description: string | null;
    thumbnails: { default: { url: string }; medium?: { url: string }; high?: { url: string } };
    publishedAt: string | null;
    channelTitle: string | null;
    channelId: string | null;
  };
  contentDetails?: { duration: string };
  statistics?: {
    viewCount: string | null;
    likeCount: string | null;
    commentCount: string | null;
  };
}

interface CommentsResponse {
  items: TopComment[];
}

@Injectable()
export class VideoAnalysisService {

  private readonly baseApiUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly apiKey = process.env.YOUTUBE_API_KEY || '';

  private contextCache = new Map<string, CachedVideoContext>();
  private cacheMaxAge = 60 * 5; // 5 minutes

  async analyzeVideo(url: string): Promise<VideoContext> {
    console.log('[VideoAnalysisService] Analyzing video URL:', url);

    let videoId = this.extractVideoId(url);

    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube video link.');
    }

    const cached = this.contextCache.get(videoId);
    if (cached && !this.isCacheExpired(cached)) {
      return cached.video;
    }

    try {
      console.log('[VideoAnalysisService] Fetching video data for:', videoId);
      const [videoData, commentsResponse] = await Promise.all([
        this.fetchVideoData(videoId),
        this.fetchComments(videoId),
      ]);

      const video: VideoContext = {
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
        comments: commentsResponse.items || [],
      };

      // Cache with timestamp
      const cachedContext: CachedVideoContext = {
        video,
        cachedAt: Date.now(),
      };

      this.contextCache.set(videoId, cachedContext);

      return video;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[VideoAnalysisService] Failed to analyze video:', errorMsg);

      this.contextCache.delete(videoId);

      throw new Error(`Failed to analyze YouTube video: ${errorMsg}`);
    }
  }

  async getContextById(videoId: string): Promise<VideoContext> {
    const cached = this.contextCache.get(videoId);

    if (cached && !this.isCacheExpired(cached)) {
      return cached.video;
    }

    return this.analyzeVideo(`https://www.youtube.com/watch?v=${videoId}`);
  }

  private async fetchVideoData(videoId: string): Promise<VideoItem> {
    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoId,
      maxResults: '1',
      key: this.apiKey,
    });

    const url = `${this.baseApiUrl}/videos?${params.toString()}`;

    console.log('[VideoAnalysisService] Fetching video data from:', url);

    const response = await this.retryRequest(url);

    if (!response || (response as any).status !== 200) {
      throw new Error(`YouTube API request failed: ${(response as any)?.statusText || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.items ? data.items[0] : {} as VideoItem;
  }

  private async fetchComments(videoId: string): Promise<CommentsResponse> {
    console.log('[VideoAnalysisService] Attempting to fetch comments for video:', videoId);

    // YouTube Comments API v3 requires filter parameter (parentId or id)
    // Note: Top-level comments cannot be fetched without a specific comment ID or reply parent ID
    const params = new URLSearchParams({
      part: 'snippet',
      videoId: videoId,
      maxResults: '25',
      textFormat: 'plainText',
      parentId: '',
      key: this.apiKey,
    });

    const url = `${this.baseApiUrl}/commentThreads?${params.toString()}`;

    try {
      console.log('[VideoAnalysisService] Comments API URL:', url);

      const response = await this.retryRequest(url);

      if (!response) {
        console.warn('[VideoAnalysisService] No response from comments API');
        return { items: [] };
      }

      const status = (response as any).status || 0;
      console.log('[VideoAnalysisService] Comments API status:', status);

      if (status !== 200) {
        const statusText = (response as any).statusText || '';
        console.warn('[VideoAnalysisService] Comments API error:', status, statusText);
        return { items: [] };
      }

      const data = await response.json();
      console.log(data)
      const items = data.items || [];

      if (items.length === 0) {
        console.log('[VideoAnalysisService] No comments found for video');
      } else {
        console.log(`[VideoAnalysisService] Found ${items.length} comments`);
      }

      return { items: items.map((item: any) => this.mapComment(item)) };
    } catch (error) {
      console.error('[VideoAnalysisService] Error fetching comments:', error);
      throw error;
    }
  }

  private extractVideoId(url: string): string | null {
    console.log('[VideoAnalysisService] Extracting video ID from:', url);

    // Try main pattern: youtube.com/watch?v=VIDEO_ID
    const match1 = url.match(/(?:youtube\.com\/watch\?v=)([^&\s]+)/);
    if (match1 && match1[1]) {
      console.log('[VideoAnalysisService] Pattern 1 matched, extracted:', match1[1].trim());
      return match1[1].trim();
    }

    // Try pattern: youtu.be/VIDEO_ID
    const match2 = url.match(/youtu\.be\/([^?\s]+)/);
    if (match2 && match2[1]) {
      console.log('[VideoAnalysisService] Pattern 2 matched, extracted:', match2[1].trim());
      return match2[1].trim();
    }

    // Try pattern: /embed/VIDEO_ID
    const match3 = url.match(/\/embed\/([^"\s]+)/);
    if (match3 && match3[1]) {
      console.log('[VideoAnalysisService] Pattern 3 matched, extracted:', match3[1].trim());
      return match3[1].trim();
    }

    console.warn('[VideoAnalysisService] Could not extract video ID from URL');
    return null;
  }

  private parseDuration(durationString?: string): number {
    if (!durationString) return 0;

    const match = durationString.match(/PT?(\d+H)?(\d+M)?(\d+S)?/);

    if (!match) return 0;

    const hours = parseInt((match[1] || '').replace('H', '')) * 3600;
    const minutes = parseInt((match[2] || '').replace('M', '')) * 60;
    const seconds = parseInt((match[3] || '') || '0');

    return hours + minutes + seconds;
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
    } else if (snippet.commentText) {
      textDisplay = snippet.commentText;
    }

    const topLevel = snippet.topLevelComment?.snippet || { authorName: '' };
    const authorName = topLevel.authorName || snippet.authorDisplayName || 'Unknown';

    return {
      id: item.id,
      authorName,
      authorChannelId: topLevel.authorChannelId || '',
      authorProfileImageUrl: topLevel.authorProfileImageUrl || '',
      textDisplay,
      likeCount: snippet.likeCount ? parseInt(snippet.likeCount) : null,
      publishedAt: topLevel.publishedAt || '',
    };
  }

  private isCacheExpired(item: { cachedAt: number }): boolean {
    return Date.now() - item.cachedAt > this.cacheMaxAge * 1000;
  }

  private async retryRequest(url: string): Promise<any> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.status === 401) {
          throw new Error('YouTube API: Invalid API key');
        }
        if (response.status === 403) {
          throw new Error('YouTube API: Quota exceeded or invalid credentials');
        }

        return response;
      } catch (error) {
        if (attempt < 3) {
          console.warn(`[VideoAnalysisService] Retry ${attempt}/3 for:`, url);
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

  getApiKeyStatus(): { hasKey: boolean; keyLength: number } {
    return {
      hasKey: this.apiKey.length > 0,
      keyLength: this.apiKey.length,
    };
  }

  getCacheStats(): { cachedVideos: number; maxAgeMinutes: number } {
    return {
      cachedVideos: this.contextCache.size,
      maxAgeMinutes: this.cacheMaxAge / 60000,
    };
  }
}
