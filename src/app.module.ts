import { Module } from '@nestjs/common';
import { RecordingsModule } from './recordings/recordings.module';
import { YoutubeModule } from './youtube/video.module';
import { FindingModule } from './finding/finding.module';

@Module({
  imports: [RecordingsModule, YoutubeModule, FindingModule],
})
export class AppModule {}
