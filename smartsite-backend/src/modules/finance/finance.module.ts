import { Module } from '@nestjs/common';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [InvoicesModule, PaymentsModule, ReportsModule],
})
export class FinanceModule {}