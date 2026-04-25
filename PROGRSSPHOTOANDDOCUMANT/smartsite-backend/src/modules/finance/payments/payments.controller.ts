import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  BadRequestException,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { StripeService } from './stripe.service';
import { CreateStripeSessionDto } from './dto/create-stripe-session.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
  ) {}

  // ✅ CASH
  @Post()
  async create(@Body() dto: CreatePaymentDto) {
    if (dto.method === 'CARD') {
      throw new BadRequestException(
        'Use /payments/stripe-session for card payments',
      );
    }

    return this.paymentsService.create(dto);
  }

@Post('stripe-session')
async createStripeSession(@Body() dto: CreateStripeSessionDto) {
  if (dto.method !== 'CARD') {
    throw new BadRequestException('Stripe only for CARD payments');
  }

  return this.stripeService.createCheckoutSession(dto.invoiceId);
}

  // 🔥 CONFIRM PAYMENT
  @Post('confirm')
  async confirm(@Body('sessionId') sessionId: string) {
    return this.paymentsService.confirmPayment(sessionId);
  }

  // ✅ GET
  @Get('invoice/:invoiceId')
  findByInvoice(@Param('invoiceId') invoiceId: string) {
    return this.paymentsService.findByInvoice(invoiceId);
  }
}