import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_FACE_ID'
  | 'PASSWORD_RESET'
  | 'PASSWORD_RESET_REQUEST'
  | 'FACE_REGISTERED'
  | 'PROFILE_UPDATED';

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true })
  action!: AuditAction;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId!: Types.ObjectId | null;

  @Prop({ required: true })
  email!: string;

  @Prop({ default: 'unknown' })
  ip!: string;

  @Prop({ default: 'unknown' })
  userAgent!: string;

  @Prop({ default: false })
  suspicious!: boolean;

@Prop({ type: String, default: null })
reason!: string | null;

  @Prop({ default: false })
  read!: boolean;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
