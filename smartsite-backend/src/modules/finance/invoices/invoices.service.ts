import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(Invoice.name)
    private invoiceModel: Model<InvoiceDocument>,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto) {

    if (new Date(createInvoiceDto.dueDate) <= new Date(createInvoiceDto.issueDate)) {
      throw new BadRequestException('Due date must be after issue date');
    }

    const invoice = new this.invoiceModel(createInvoiceDto);
    return invoice.save();
  }

  async findAll() {
    return this.invoiceModel.find({ isArchived: false });
  }

  async findOne(id: string) {
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(id: string, updateData: Partial<CreateInvoiceDto>) {
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Cannot modify a paid invoice');
    }

    Object.assign(invoice, updateData);
    return invoice.save();
  }

  async softDelete(id: string) {
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) throw new NotFoundException('Invoice not found');

    invoice.isArchived = true;
    return invoice.save();
  }
}