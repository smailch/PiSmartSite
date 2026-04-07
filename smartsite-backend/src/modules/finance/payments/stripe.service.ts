import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument } from '../invoices/schemas/invoice.schema';
import { ConfigService } from '@nestjs/config';

const Stripe = require('stripe');

@Injectable()
export class StripeService {
  private stripe: any;

  constructor(
    @InjectModel(Invoice.name)
    private invoiceModel: Model<InvoiceDocument>,
    private configService: ConfigService, // ✅ proper env handling
  ) {
    const key = this.configService.get<string>('STRIPE_SECRET_KEY');
console.log("ENV RAW:", process.env.STRIPE_SECRET_KEY);
console.log("CONFIG:", this.configService.get('STRIPE_SECRET_KEY'));
    if (!key) {
      throw new InternalServerErrorException(
        'STRIPE_SECRET_KEY is missing. Check your .env file',
      );
    }

    this.stripe = new Stripe(key, {
      apiVersion: '2024-06-20',
    });
  }

  async createCheckoutSession(invoiceId: string) {
  const invoice = await this.invoiceModel.findById(invoiceId);

  if (!invoice) {
    throw new NotFoundException('Invoice not found');
  }

  const session = await this.stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',

    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice ${invoice._id}`,
          },
          unit_amount: Math.round(invoice.amount * 100),
        },
        quantity: 1,
      },
    ],

    success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `http://localhost:3000/cancel`,

    metadata: {
      invoiceId: invoice._id.toString(),
    },
  });

  return {
    url: session.url,
    sessionId: session.id, // 🔥 important
  };
}
}