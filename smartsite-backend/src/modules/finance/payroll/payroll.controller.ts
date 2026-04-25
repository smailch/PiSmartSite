import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { PayrollService } from './payroll.service';

@Controller('finance/payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  /**
   * GET /finance/payroll/monthly?year=2026&month=4
   */
  @Get('monthly')
  async monthly(
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
      throw new BadRequestException('Invalid year and month (month 1–12).');
    }
    return this.payrollService.getMonthlyPayroll(year, month);
  }
}
