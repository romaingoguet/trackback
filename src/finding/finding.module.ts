import { Module } from '@nestjs/common';
import { FindingController } from './controller/finding.controller';
import { FindService } from './src/find.service';
import { GeminiResponseService } from './gemini-response.service';
import { YoutubeModule } from '../youtube/video.module';

@Module({
  imports: [YoutubeModule],
  controllers: [FindingController],
  providers: [FindService, GeminiResponseService],
})
export class FindingModule { }
