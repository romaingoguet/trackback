import * as dotenv from 'dotenv';
dotenv.config();

let _instance: any = null;

interface TopComment {
  id: string;
  textDisplay: string;
  likeCount: number | null;
  publishedAt: string;
}

export class VideoAnalysisService {
  static setInstance(instance: any): void {
    _instance = instance;
  }

  static getInstance(): any {
    if (!_instance) {
      throw new Error('VideoAnalysisService not initialized');
    }
    return _instance;
  }

  private readonly baseApiUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly apiKey = process.env.YOUTUBE_API_KEY || '';

  async analyzeVideo(url: string): Promise<any> {
    console.log('[VideoAnalysisService] Analyzing video URL:', url);
    let videoId = this.extractVideoId(url);

    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube video link.');
    }

    const cached = (this as any).contextCache?.get(videoId);
    if (cached && !this.isCacheExpired(cached)) {
      return cached.video;
    }

    try {
      console.log('[VideoAnalysisService] Fetching video data for:', videoId);
      const [videoData, commentsResponse] = await Promise.all([
        this.fetchVideoData(videoId),
        this.fetchComments(videoId),
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
        comments: (commentsResponse.items || []).map((item: any) => this.mapComment(item)),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[VideoAnalysisService] Failed to analyze video:', errorMsg);
      throw new Error(`Failed to analyze YouTube video: ${errorMsg}`);
    }
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

  private async fetchComments(videoId: string): Promise<any> {
    const params = new URLSearchParams({
      part: 'snippet',
      videoId: videoId,
      maxResults: '70',
      textFormat: 'plainText',
      key: this.apiKey,
    });
    const urlStr = `${this.baseApiUrl}/commentThreads?${params.toString()}`;
    console.log(urlStr)

    try {
      const response = await this.retryRequest(urlStr);
      if (!response) return {};

      const status = (response as any).status || 0;
      if (status !== 200) return {};

      const data = await response.json();
      return { items: data.items };
    } catch (error) {
      console.error('[VideoAnalysisService] Error fetching comments:', error);
      throw error;
    }
  }

  private extractVideoId(url: string): string | null {
    const match1 = url.match(/(?:youtube\.com\/watch\?v=)([^&\s]+)/);
    if (match1 && match1[1]) return match1[1].trim();

    const match2 = url.match(/youtu\.be\/([^?\s]+)/);
    if (match2 && match2[1]) return match2[1].trim();

    const match3 = url.match(/\/embed\/([^"\s]+)/);
    if (match3 && match3[1]) return match3[1].trim();

    console.warn('[VideoAnalysisService] Could not extract video ID from URL');
    return null;
  }

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

  private isCacheExpired(_item: { cachedAt: number }): boolean {

    return true;
    //return Date.now() - item.cachedAt > (60 * 5) * 1000;
  }

  private async retryRequest(url: string): Promise<any> {
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
}
