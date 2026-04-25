import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type PrimePayoutDocument = PrimePayout & Document;

@Schema({ timestamps: true })
export class PrimePayout {
  @Prop({ type: Types.ObjectId, ref: 'Job', required: true })
  jobId: Types.ObjectId;

  @Prop({ required: true })
  jobTitle: string;

  @Prop({ type: Types.ObjectId, ref: 'Human', required: true })
  humanResourceId: Types.ObjectId;

  @Prop({ required: true })
  employeeName: string;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true, min: 1, max: 12 })
  month: number;

  @Prop({ required: true, min: 0 })
  amountDt: number;

  @Prop({ required: true, min: 0, max: 30 })
  pointsMensuel: number;

  @Prop({
    enum: ['PENDING', 'PROCESSED'],
    default: 'PENDING',
  })
  status: string;

  /** Row origin (e.g. SMS top 3 notification). */
  @Prop({ default: 'SMS_TOP3' })
  source: string;

  @Prop()
  smsNotifiedAt?: Date;
}

export const PrimePayoutSchema = SchemaFactory.createForClass(PrimePayout);

PrimePayoutSchema.index(
  { jobId: 1, humanResourceId: 1, year: 1, month: 1 },
  { unique: true },
);
