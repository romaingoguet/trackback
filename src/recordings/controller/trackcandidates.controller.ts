import { Controller, Post, Body, Get, Param, Patch, Delete } from '@nestjs/common';
import { CreateTrackCandidateDto } from '../dto/trackcandidate.dto';
import { TrackCandidatesService } from '../service/supabase.service';

@Controller('recordings')
export class TrackCandidatesController {
  private readonly service: TrackCandidatesService;

  constructor(service: TrackCandidatesService) {
    this.service = service;
  }

  @Post()
  async saveTrackCandidate(@Body() data: CreateTrackCandidateDto): Promise<{ message: string }> {
    await this.service.saveTrackCandidate(data);
    return { message: 'Track candidate saved successfully' };
  }

  @Get()
  async getAllTrackCandidates() {
    const candidates = await this.service.getAllTrackCandidates();
    return candidates;
  }

  @Get(':id')
  async getTrackCandidate(@Param('id') id: string) {
    const candidate = await this.service.getTrackCandidateById(id);
    return candidate;
  }

  @Patch(':id')
  async updateTrackCandidate(
    @Param('id') id: string,
    @Body() data: Partial<CreateTrackCandidateDto>
  ): Promise<{ message: string }> {
    await this.service.updateTrackCandidate(id, data);
    return { message: 'Track candidate updated successfully' };
  }

  @Delete(':id')
  async deleteTrackCandidate(@Param('id') id: string): Promise<{ message: string }> {
    await this.service.deleteTrackCandidate(id);
    return { message: 'Track candidate deleted successfully' };
  }
}
