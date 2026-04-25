import { Module } from '@nestjs/common';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { PrimePayoutsModule } from './prime-payouts/prime-payouts.module';
import { PayrollModule } from './payroll/payroll.module';

@Module({
  imports: [InvoicesModule, PaymentsModule, ReportsModule, PrimePayoutsModule, PayrollModule],
})
export class FinanceModule {}