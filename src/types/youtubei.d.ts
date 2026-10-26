declare module 'youtubei.js' {
  export interface SearchResponseItem {
    videoId: string;
    videoTitle?: string | null;
    thumbnailUrl?: string | null;
    channelId: string;
    channelTitle?: string | null;
    duration?: string;
    viewCount?: string;
    isLive?: boolean;
    authorThumbnailUrl?: string | null;
    isOwned?: boolean;
  }

  export interface VideoDetailsResponse {
    videoId: string;
    title?: string;
    thumbnailUrl?: string;
    description?: string;
    channelId: string;
    channelTitle?: string;
    duration: string;
    viewCount: string;
    likeCount: string;
    commentCount: string;
    authorThumbnailUrl?: string | null;
    isOwned?: boolean;
  }

  export interface ChannelDetailsResponse {
    channelId: string;
    title?: string;
    handle?: string;
    description?: string;
    thumbnailUrl?: string;
    avatarThumbnailUrl?: string;
    bannerImage?: string[];
    subscriberCount?: string;
    joinedDate?: string;
  }

  export class YouTube {
    constructor(apiKey: string);
    getVideoDetails(videoId: string): Promise<VideoDetailsResponse>;
    search(query: string, options?: any): Promise<any[]>;
    getPlaylistInfo(playlistId: string): Promise<any>;
    getRelatedVideos(videoId: string): Promise<any[]>;
    getChannel(channelId: string): Promise<ChannelDetailsResponse>;
  }

  export interface PlaylistItem {
    videoId: string;
    videoTitle?: string | null;
    thumbnailUrl?: string | null;
    duration?: string;
    author?: {
      channelId: string;
      channelName?: string | null;
      authorThumbnailUrl?: string | null;
    };
  }
}
