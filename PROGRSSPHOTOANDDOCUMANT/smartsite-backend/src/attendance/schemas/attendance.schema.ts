import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Job' })
  jobId: Types.ObjectId;

  /** Même référence que les jobs : identifiant document Human */
  @Prop({ required: true, type: Types.ObjectId, ref: 'Human' })
  resourceId: Types.ObjectId;

  /** Start of calendar day (UTC) for grouping */
  @Prop({ required: true })
  date: Date;

  @Prop()
  checkIn?: string;

  @Prop()
  checkOut?: string;

  @Prop({ required: true, enum: ['present', 'absent'], default: 'present' })
  status: 'present' | 'absent';
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

AttendanceSchema.index(
  { jobId: 1, resourceId: 1, date: 1 },
  { unique: true },
);
