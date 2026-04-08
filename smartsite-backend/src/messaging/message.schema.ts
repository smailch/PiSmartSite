import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

export type SenderRole = 'Client' | 'AI' | 'Director';
export type ConversationStatus = 'pending' | 'replied';

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: String, required: true })
  conversationId!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  clientName!: string;

  @Prop({ type: String, required: true })
  senderRole!: SenderRole;

  @Prop({ type: String, required: true })
  content!: string;

  @Prop({ type: Boolean, default: false })
  transferredToDirector!: boolean;

  @Prop({ type: String, default: 'pending' })
  status!: ConversationStatus;
}

export const MessageSchema = SchemaFactory.createForClass(Message);