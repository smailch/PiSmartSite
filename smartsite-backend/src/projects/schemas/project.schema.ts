import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

@Schema()
export class Project {
  @Prop({ required: true, maxlength: 150 })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: Date, default: null })
  startDate: Date | null;

  @Prop({ type: Date, default: null })
  endDate: Date | null;

  @Prop({ enum: ['En cours', 'Terminé', 'En retard'], default: 'En cours' })
  status: string;

  @Prop({
    required: true,
    enum: ['Construction', 'Rénovation', 'Maintenance', 'Autre'],
    default: 'Autre',
  })
  type: string;

  @Prop({ min: 0 })
  budget?: number;

  @Prop()
  location?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  createdBy: mongoose.Schema.Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export type ProjectDocument = Project & Document;
export const ProjectSchema = SchemaFactory.createForClass(Project);

/**
 * Sécurité supplémentaire côté schéma:
 * quand un projet est supprimé via findOneAndDelete/findByIdAndDelete,
 * on supprime aussi les tâches liées pour éviter les orphelins.
 */
ProjectSchema.pre('findOneAndDelete', async function cascadeDeleteTasks() {
  const query = this as unknown as {
    getFilter: () => Record<string, unknown>;
    model: { db: { model: (name: string) => mongoose.Model<any> } };
  };

  const filter = query.getFilter();
  const projectId = filter?._id;
  if (!projectId) return;

  const TaskModel = query.model.db.model('Task');
  await TaskModel.deleteMany({ projectId });
});