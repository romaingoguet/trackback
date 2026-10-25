import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { VideoAnalysisService } from '../service/videoAnalysis.service';
import { VideoContext } from '../dto/video.dto';

@Controller('youtube')
export class VideoController {
  private readonly service: VideoAnalysisService;

  constructor(service: VideoAnalysisService) {
    this.service = service;
  }

  @Post('analyze')
  async analyzeVideo(
    @Body('url') url: string,
  ): Promise<{ success: boolean; video: VideoContext | null; error?: string }> {
    try {
      const video = await this.service.analyzeVideo(url);
      return { success: true, video };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMsg, video: null };
    }
  }

  @Get(':id/context')
  async getContext(
    @Param('id') id: string,
  ): Promise<{ success: boolean; video: VideoContext | null; error?: string }> {
    try {
      const video = await this.service.getContextById(id);
      return { success: true, video };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMsg, video: null };
    }
  }

  @Get(':id/description')
  async getDescription(@Param('id') id: string): Promise<string> {
    try {
      const { description } = await this.service.getContextById(id);
      return description || '';
    } catch (error) {
      throw new Error(`Failed to get video description: ${error}`);
    }
  }

  @Get(':id/length')
  async getLength(@Param('id') id: string): Promise<number> {
    try {
      const { lengthSeconds } = await this.service.getContextById(id);
      return lengthSeconds || 0;
    } catch (error) {
      throw new Error(`Failed to get video length: ${error}`);
    }
  }

  @Get(':id/comments')
  async getTopComments(
    @Param('id') id: string,
  ): Promise<{ comments: VideoContext['comments']; error?: string }> {
    try {
      const video = await this.service.getContextById(id);
      return { comments: video.comments };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error), comments: [] };
    }
  }
}
