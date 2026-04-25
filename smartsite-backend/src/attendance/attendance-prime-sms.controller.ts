import {
  BadRequestException,
  Controller,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AttendancePrimeSmsService } from './attendance-prime-sms.service';

/**
 * SMS de motivation aux employés les mieux primés sur le pointage mensuel.
 */
@Controller('attendance')
export class AttendancePrimeSmsController {
  constructor(private readonly attendancePrimeSmsService: AttendancePrimeSmsService) {}

  /**
   * POST /attendance/job/:jobId/prime-sms/top3?year=2026&month=4
   * Envoie un SMS aux 3 employés avec la plus forte prime (prime &gt; 0) sur le mois.
   */
  @Post('job/:jobId/prime-sms/top3')
  async sendTopThreePrimeSms(
    @Param('jobId') jobId: string,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
  ) {
    const now = new Date();
    const year =
      yearStr !== undefined && yearStr !== ''
        ? Number.parseInt(yearStr, 10)
        : now.getUTCFullYear();
    const month =
      monthStr !== undefined && monthStr !== ''
        ? Number.parseInt(monthStr, 10)
        : now.getUTCMonth() + 1;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      throw new BadRequestException('Invalid year and month parameters (month 1–12).');
    }
    return this.attendancePrimeSmsService.sendMotivationSmsToTopThreePrimeEarners(
      jobId,
      year,
      month,
    );
  }

  /**
   * POST /attendance/job/:jobId/prime-invoice/top3?year=2026&month=4
   * Enfile les 3 meilleures primes en facturation sans envoyer de SMS (SMS au traitement finance).
   */
  @Post('job/:jobId/prime-invoice/top3')
  async queueTopThreePrimeForInvoice(
    @Param('jobId') jobId: string,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
  ) {
    const now = new Date();
    const year =
      yearStr !== undefined && yearStr !== ''
        ? Number.parseInt(yearStr, 10)
        : now.getUTCFullYear();
    const month =
      monthStr !== undefined && monthStr !== ''
        ? Number.parseInt(monthStr, 10)
        : now.getUTCMonth() + 1;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      throw new BadRequestException('Invalid year and month parameters (month 1–12).');
    }
    return this.attendancePrimeSmsService.queueTopThreePrimeForInvoice(jobId, year, month);
  }
}
