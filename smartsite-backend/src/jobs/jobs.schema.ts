import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobDocument = Job & Document;

@Schema({ timestamps: true })
export class Job {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Task' })
  taskId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ default: 'Planifié', enum: ['Planifié', 'En cours', 'Terminé'] })
  status: string;

  @Prop([
    {
      resourceId: { type: Types.ObjectId, ref: 'Resource', required: true },
      type: { type: String, enum: ['Human', 'Equipment'], required: true },
    },
  ])
  assignedResources: { resourceId: Types.ObjectId; type: string }[];
}

export const JobSchema = SchemaFactory.createForClass(Job);
