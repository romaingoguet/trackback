import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { UNID_PROMPT } from './core/unid.prompt';
import { TopComment } from '../youtube/dto/video.dto';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

export interface ContextData {
  videoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string;
  publishedAt: string;
  channelTitle: string;
  viewCount: number | null;
  lengthSeconds: number;
  comments: TopComment[]
}

export interface TrackCandidate {
  youtubeLink: string;
  timestamp: number;
  note: string;
  createdAt: Date;
}

@Injectable()
export class GeminiResponseService {

  private apiKey = process.env.GEMINI_API_KEY || '';

  async identifyTrack(
    content: ContextData & { trackCandidates?: TrackCandidate[] }
  ): Promise<{ result: any; error?: string }> {

    if (!this.apiKey) {
      return { result: null, error: 'GEMINI_API_KEY not configured in .env' };
    }

    console.log(`content: ${content.comments[0].id} ${content.comments.length}`)

    const prompt = UNID_PROMPT + this.buildContext(content);

    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${this.apiKey}`,
        { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = response.data;

      console.log(data)

      if (data.candidates?.[0]?.content?.parts) {
        return { result: JSON.parse(data.candidates[0].content.parts[0].text || '') };
      }

      if (data.error) {
        return { result: null, error: data.error.message };
      }

      return { result: null, error: 'Unknown response format' };

    } catch (error: any) {
      console.error('[GeminiResponseService] API call failed:', error.response?.data || error.message);
      return { result: null, error: error.response?.data?.error?.message || error.message };
    }
  }

  private buildContext(content: ContextData & { trackCandidates?: TrackCandidate[] }): string {
    const videoSection = `VIDEO CONTEXT:
- Title: ${content.title}
- Published: ${content.publishedAt}
- Duration: ${this.formatDuration(content.lengthSeconds)}
- Views: ${content.viewCount?.toLocaleString() || 'N/A'}
- Channel: ${content.channelTitle}
- Comments: ${JSON.stringify(content.comments)}
- Description:
${content.description || '(No description)'}

`;
    const thumbnail = content.thumbnailUrl ? `\n- Thumbnail: ${content.thumbnailUrl.split('/').pop()}` : '';

    let candidatesSection;
    if (content.trackCandidates?.length) {
      candidatesSection = `TRACK CANDIDATES FROM DATABASE:
${content.trackCandidates.map(c => `- [${c.timestamp}s] ${c.youtubeLink}
  Note: ${c.note}`).join('\n')}`;
    } else {
      candidatesSection = 'TRACK CANDIDATES: None found in database for this video.';
    }

    return `${videoSection}${thumbnail}\n\n${candidatesSection}\n\n`;
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  }
}
