import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProgressPhotoDocument = ProgressPhoto & Document;

@Schema({ timestamps: true })
export class ProgressPhoto {
  @Prop({ required: true })
  projectId: string; // référence au projet

  @Prop({ required: true })
  uploadedBy: string; // userId (Project Manager)

  @Prop({ required: true })
  photoUrl: string; // URL de la photo

  @Prop()
  caption: string; // description de la photo

  @Prop({ required: true })
  takenAt: Date; // date de prise de la photo sur le terrain

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  validationStatus: string; // statut de validation par le superviseur

  @Prop()
  validatedBy: string; // userId du superviseur

  @Prop()
  validationNote: string; // commentaire du superviseur

  @Prop()
  estimatedProgress: number; // % d'avancement estimé (IA optionnelle, 0-100)
}

export const ProgressPhotoSchema = SchemaFactory.createForClass(ProgressPhoto);
