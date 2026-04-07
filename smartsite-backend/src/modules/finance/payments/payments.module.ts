import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';

import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Invoice.name, schema: InvoiceSchema }, // 🔥 THIS WAS MISSING
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}