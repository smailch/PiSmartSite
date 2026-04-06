import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DocumentVersionDocument = DocumentVersion & Document;

@Schema({ timestamps: true })
export class DocumentVersion {
  @Prop({ required: true })
  documentId: string; // référence au document parent

  @Prop({ required: true })
  versionNumber: number; // 1, 2, 3...

  @Prop({ required: true })
  fileUrl: string; // URL de cette version du fichier

  @Prop({ required: true })
  uploadedBy: string; // userId qui a uploadé cette version

  @Prop()
  changeNote: string; // note expliquant les changements
}

export const DocumentVersionSchema = SchemaFactory.createForClass(DocumentVersion);
