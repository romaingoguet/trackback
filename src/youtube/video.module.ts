import { Module } from '@nestjs/common';
import { VideoController } from './controller/video.controller';
import { FindService } from 'src/finding/src/find.service';
import { GeminiResponseService } from '../finding/gemini-response.service';

@Module({
  controllers: [VideoController],
  providers: [FindService, GeminiResponseService],
  exports: []
})
export class YoutubeModule { }
