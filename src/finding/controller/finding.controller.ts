import { Controller, Get, Param } from '@nestjs/common';
import { FindService } from '../src/find.service';

@Controller('finding')
export class FindingController {

  constructor(private readonly findService: FindService) {}

  @Get(':id')
  async identifyTrack(@Param('id') id: string) {
    return this.findService.identifyByTrackId(id);
  }
}
