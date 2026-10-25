export class CreateTrackCandidateDto {
  youtubeLink: string;
  timestamp: string;
  note?: string | null;
}

export interface TrackCandidate {
  id: string;
  youtubeLink: string;
  timestamp: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}
