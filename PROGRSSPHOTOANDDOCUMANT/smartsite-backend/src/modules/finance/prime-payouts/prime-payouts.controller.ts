import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { PrimePayoutsService } from './prime-payouts.service';

@Controller('finance/primes')
export class PrimePayoutsController {
  constructor(private readonly primePayoutsService: PrimePayoutsService) {}

  @Get('pending-count')
  async pendingCount() {
    const count = await this.primePayoutsService.countPending();
    return { count };
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.primePayoutsService.findAll(status);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body('status') status: unknown) {
    if (status !== 'PENDING' && status !== 'PROCESSED') {
      throw new BadRequestException('status must be PENDING or PROCESSED');
    }
    return this.primePayoutsService.setStatus(id, status);
  }
}
