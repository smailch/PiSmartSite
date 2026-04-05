import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { Invoice, InvoiceDocument } from '../invoices/schemas/invoice.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';


@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,

    @InjectModel(Invoice.name)
    private invoiceModel: Model<InvoiceDocument>,
  ) {}

  async create(dto: CreatePaymentDto) {

    const invoice = await this.invoiceModel.findById(dto.invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payment = new this.paymentModel(dto);
    await payment.save();

    await this.updateInvoiceStatus(invoice._id.toString());

    return payment;
  }

  async updateInvoiceStatus(invoiceId: string) {
    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payments = await this.paymentModel.find({ invoiceId });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid === 0) {
      invoice.status = 'PENDING';
    } else if (totalPaid < invoice.amount) {
      invoice.status = 'PARTIALLY_PAID';
    } else if (totalPaid >= invoice.amount) {
      invoice.status = 'PAID';
    }

    if (invoice.dueDate < new Date() && invoice.status !== 'PAID') {
      invoice.status = 'OVERDUE';
    }

    await invoice.save();
  }

  async findByInvoice(invoiceId: string) {
    return this.paymentModel.find({ invoiceId });
  }
}