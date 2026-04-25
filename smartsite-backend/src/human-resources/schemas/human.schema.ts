import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HumanDocument = Human & Document;

@Schema({ timestamps: true })
export class Human {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  cin: string;

  @Prop({ required: true })
  birthDate: Date;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  role: string;

  @Prop()
  cvUrl: string;

  @Prop()
  imageUrl: string;

  @Prop({ default: true })
  availability: boolean;

  @Prop({ min: 0, default: 0 })
  monthlySalaryDt: number;
}

export const HumanSchema = SchemaFactory.createForClass(Human);
