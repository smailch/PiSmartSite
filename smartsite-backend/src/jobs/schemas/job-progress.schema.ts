import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobProgressDocument = JobProgress & Document;

@Schema({ _id: false })
export class JobProgressSafetyStatus {
  @Prop({ required: true, default: false })
  helmet: boolean;

  @Prop({ required: true, default: false })
  vest: boolean;
}

export const JobProgressSafetyStatusSchema = SchemaFactory.createForClass(
  JobProgressSafetyStatus,
);

@Schema({ _id: false })
export class JobProgressAiAnalysis {
  @Prop({
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  })
  dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @Prop({ type: [String], default: [] })
  detectedObjects: string[];

  @Prop({ type: JobProgressSafetyStatusSchema })
  safetyStatus?: JobProgressSafetyStatus;

  @Prop({ required: true, default: '' })
  message: string;
}

export const JobProgressAiAnalysisSchema = SchemaFactory.createForClass(
  JobProgressAiAnalysis,
);

@Schema({ _id: false })
export class JobProgressStep {
  @Prop({ required: true })
  step: string;

  @Prop({ required: true, default: false })
  completed: boolean;

  @Prop({ required: true, default: Date.now })
  date: Date;

  @Prop()
  photoUrl?: string;

  @Prop({ type: JobProgressAiAnalysisSchema })
  aiAnalysis?: JobProgressAiAnalysis;
}

export const JobProgressStepSchema =
  SchemaFactory.createForClass(JobProgressStep);

@Schema({ timestamps: true })
export class JobProgress {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Job', unique: true })
  jobId: Types.ObjectId;

  @Prop({ type: [JobProgressStepSchema], default: [] })
  steps: JobProgressStep[];
}

export const JobProgressSchema = SchemaFactory.createForClass(JobProgress);
