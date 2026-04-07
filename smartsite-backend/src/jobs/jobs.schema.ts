import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobDocument = Job & Document;

// Sous-document pour AssignedResource
@Schema({ _id: false }) // _id: false pour ne pas générer automatiquement un _id pour chaque resource si pas nécessaire
export class AssignedResource {
  @Prop({ type: Types.ObjectId, ref: 'Resource', required: true })
  resourceId!: Types.ObjectId;

  @Prop({ required: true, enum: ['Human', 'Equipment'] })
  type!: string;

  @Prop() // 🔥 Ajout du name ici
  name?: string;
}

export const AssignedResourceSchema =
  SchemaFactory.createForClass(AssignedResource);

@Schema({ timestamps: true })
export class Job {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Task' })
  taskId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop()
  description!: string;

  @Prop({ required: true })
  startTime!: Date;

  @Prop({ required: true })
  endTime!: Date;

  @Prop({ default: 'Planifié', enum: ['Planifié', 'En cours', 'Terminé'] })
  status!: string;

  // Utilisation du schema enrichi pour les ressources
  @Prop({ type: [AssignedResourceSchema], default: [] })
  assignedResources!: AssignedResource[];
}

export const JobSchema = SchemaFactory.createForClass(Job);