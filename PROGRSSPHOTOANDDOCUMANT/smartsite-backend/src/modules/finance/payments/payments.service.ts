import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Payment, PaymentDocument } from './schemas/payment.schema';
import { Invoice, InvoiceDocument } from '../invoices/schemas/invoice.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';

const Stripe = require('stripe');

@Injectable()
export class PaymentsService {
  private stripe: InstanceType<typeof Stripe> | null = null;

  constructor(
    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,

    @InjectModel(Invoice.name)
    private invoiceModel: Model<InvoiceDocument>,
  ) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (key) {
      this.stripe = new Stripe(key);
    }
  }

  // ===============================
  // ✅ CASH PAYMENT
  // ===============================
  async create(dto: CreatePaymentDto) {
    if (dto.method === 'CARD') {
      throw new BadRequestException(
        'Use /payments/stripe-session for card payments',
      );
    }

    const invoice = await this.invoiceModel.findById(dto.invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payment = new this.paymentModel({
      ...dto,
      paymentDate: new Date(dto.paymentDate),
    });

    await payment.save();
    await this.updateInvoiceStatus(invoice._id.toString());

    return payment;
  }

  // ===============================
  // 🔥 CONFIRM STRIPE PAYMENT
  // ===============================
  async confirmPayment(sessionId: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe payments are not configured');
    }
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      throw new BadRequestException('Payment not completed');
    }

    const invoiceId = session.metadata?.invoiceId;

    if (!invoiceId) {
      throw new BadRequestException('Missing invoiceId');
    }

    // 🚨 prevent duplicate
    const existing = await this.paymentModel.findOne({
      referenceNumber: session.id,
    });

    if (existing) {
      return existing;
    }

    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const amount = session.amount_total / 100;

    const payment = new this.paymentModel({
      invoiceId,
      amount,
      paymentDate: new Date(),
      method: 'CARD',
      referenceNumber: session.id,
    });

    await payment.save();
    await this.updateInvoiceStatus(invoiceId);

    return payment;
  }

  // ===============================
  // ✅ UPDATE INVOICE STATUS
  // ===============================
  async updateInvoiceStatus(invoiceId: string) {
    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payments = await this.paymentModel.find({ invoiceId });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid === 0) {
      invoice.status = 'PENDING';
    } else if (totalPaid < invoice.amount) {
      invoice.status = 'PARTIALLY_PAID';
    } else {
      invoice.status = 'PAID';
    }

    if (invoice.dueDate < new Date() && invoice.status !== 'PAID') {
      invoice.status = 'OVERDUE';
    }

    await invoice.save();
  }

  // ===============================
  // ✅ GET PAYMENTS
  // ===============================
  async findByInvoice(invoiceId: string) {
    return this.paymentModel.find({ invoiceId });
  }
}