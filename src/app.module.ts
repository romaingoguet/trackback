import { Module } from '@nestjs/common';
import { RecordingsModule } from './recordings/recordings.module';

@Module({
  imports: [RecordingsModule],
})
export class AppModule {}
