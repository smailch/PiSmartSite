import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DocumentDocument = ProjectDocument & Document;

@Schema({ timestamps: true })
export class ProjectDocument {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  projectId: string; // référence au projet (Module 2 - Smail)

  @Prop({ required: true })
  uploadedBy: string; // userId (Module 1 - Ahmed)

  @Prop({ required: true })
  fileUrl: string; // chemin ou URL du fichier stocké

  @Prop({ required: true })
  fileType: string; // ex: 'pdf', 'docx', 'xlsx', 'png'

  @Prop({ default: 1 })
  currentVersion: number;

  @Prop({
    type: String,
    enum: ['plan', 'report', 'contract', 'invoice', 'other'],
    default: 'other',
  })
  category: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ProjectDocumentSchema = SchemaFactory.createForClass(ProjectDocument);
