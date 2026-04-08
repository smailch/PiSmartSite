import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';

import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service'; // ✅ ADD THIS

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    StripeService, // ✅ REQUIRED
  ],
  exports: [
    PaymentsService, // optional but good practice
  ],
})
export class PaymentsModule {}