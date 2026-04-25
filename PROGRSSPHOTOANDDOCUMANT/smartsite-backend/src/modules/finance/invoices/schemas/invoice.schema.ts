import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ required: true })
  vendorName: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true })
  issueDate: Date;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({
    enum: ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'],
    default: 'PENDING',
  })
  status: string;

  @Prop({ default: false })
  isArchived: boolean;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);