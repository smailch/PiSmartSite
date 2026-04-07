import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HumanDocument = Human & Document;

@Schema({ timestamps: true })
export class Human {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  cin: string;

  @Prop({ type: Date })
  birthDate: Date;

  @Prop()
  phone: string;

  @Prop({ required: true })
  role: string;

  @Prop()
  cvUrl: string;

  @Prop()
  imageUrl: string;

  @Prop({ default: true })
  availability: boolean;
}

export const HumanSchema = SchemaFactory.createForClass(Human);
