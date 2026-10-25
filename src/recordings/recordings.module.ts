import { Module } from '@nestjs/common';
import { TrackCandidatesController } from './controller/trackcandidates.controller';
import { TrackCandidatesService as SupabaseTrackCandidatesService } from './service/supabase.service';

@Module({
  controllers: [TrackCandidatesController],
  providers: [SupabaseTrackCandidatesService],
})
export class RecordingsModule { }
