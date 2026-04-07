import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Invoice, InvoiceDocument } from '../invoices/schemas/invoice.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Invoice.name)
    private invoiceModel: Model<InvoiceDocument>,

    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,
  ) {}

  async getProjectFinancialSummary(projectId: string) {
    const invoices = await this.invoiceModel.find({ projectId });

    const totalInvoiced = invoices.reduce((sum, i) => sum + i.amount, 0);

    const payments = await this.paymentModel.find({
      invoiceId: { $in: invoices.map(i => i._id) },
    });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    const totalPending = totalInvoiced - totalPaid;

    const overdueInvoices = invoices.filter(
      (i) =>
        i.status !== 'PAID' &&
        new Date(i.dueDate) < new Date()
    );

    const overdueAmount = overdueInvoices.reduce(
      (sum, i) => sum + i.amount,
      0
    );

    return {
      totalInvoiced,
      totalPaid,
      totalPending,
      overdueAmount,
      invoiceCount: invoices.length,
    };
  }
}