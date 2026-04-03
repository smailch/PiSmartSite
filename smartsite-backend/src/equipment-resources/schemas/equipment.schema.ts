import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EquipmentDocument = Equipment & Document;

@Schema({ timestamps: true })
export class Equipment {
  @Prop({ required: true })
  name: string;

  @Prop()
  category: string;

  @Prop({ unique: true })
  serialNumber: string;

  @Prop()
  model: string;

  @Prop()
  brand: string;

  @Prop()
  purchaseDate: Date;

  @Prop()
  lastMaintenanceDate: Date;

  @Prop()
  location: string;

  @Prop({ default: true })
  availability: boolean;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);
