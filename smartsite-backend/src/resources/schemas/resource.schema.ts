import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ResourceDocument = Resource & Document;

@Schema({ timestamps: true })
export class Resource {
  @Prop({
    required: true,
    enum: ['Human', 'Equipment'],
  })
  type: 'Human' | 'Equipment';

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  role: string;

  @Prop({ default: true })
  availability: boolean;
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);
