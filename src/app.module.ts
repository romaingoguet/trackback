import { Module } from '@nestjs/common';
import { RecordingsModule } from './recordings/recordings.module';
import { YoutubeModule } from './youtube/video.module';

@Module({
  imports: [RecordingsModule, YoutubeModule],
})
export class AppModule {}
