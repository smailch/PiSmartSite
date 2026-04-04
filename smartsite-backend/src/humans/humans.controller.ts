import { Controller, Get, Param, Query } from '@nestjs/common';
import { HumansService } from './humans.service';

@Controller('humans')
export class HumansController {
  constructor(private readonly humansService: HumansService) {}

  @Get()
  findAll(@Query('role') role?: string) {
    return this.humansService.findAll(role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.humansService.findOne(id);
  }
}
