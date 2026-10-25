export interface VideoContext {
  id: string;
  url: string;
  title: string;
  description: string | null;
  lengthSeconds: number;
  publishedAt: string;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  channelTitle: string | null;
  channelId: string | null;
  thumbnailUrl: string;
  comments: TopComment[];
}

export interface TopComment {
  id: string;
  authorName: string;
  authorChannelId: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  likeCount: number | null;
  publishedAt: string;
}

export interface YouTubeApiResponse {
  kind?: string;
  etag?: string;
  items?: VideoItem[];
  error?: {
    code: number;
    message: string;
    status?: string;
    details?: unknown[];
  };
}

export interface VideoItem {
  kind: string;
  id: string;
  etag: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string | null;
    thumbnails: {
      default: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
    channelTitle: string;
    categoryId: string;
    tags: string[] | null;
    defaultLanguage: string | null;
    localized: {
      title: string;
      description: string | null;
    };
    defaultAudioLanguage: string | null;
  };
  contentDetails: {
    duration: string;
    dimension: string;
    definition: string;
    caption: boolean;
   licensedContent?: boolean;
    projection?: string;
    hasCustomThumbnail?: boolean;
  };
  statistics?: {
    viewCount?: string | null;
    likeCount?: string | null;
    favoriteCount?: string | null;
    commentCount?: string | null;
  };
}
