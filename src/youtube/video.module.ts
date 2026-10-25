import { Module } from '@nestjs/common';
import { VideoController } from './controller/video.controller';
import { VideoAnalysisService } from './service/videoAnalysis.service';

@Module({
  controllers: [VideoController],
  providers: [VideoAnalysisService],
  exports: [VideoAnalysisService]
})
export class YoutubeModule { }
