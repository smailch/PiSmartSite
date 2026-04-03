import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Model } from 'mongoose';

/**
 * Méthodes de domaine exposées par le document Task.
 * Elles encapsulent la logique métier liée aux dépendances entre tâches.
 */
export interface TaskMethods {
  /**
   * Retourne les identifiants des tâches qui dépendent directement de cette tâche.
   * Utilise une requête MongoDB pour rechercher toutes les tâches dont `dependsOn` contient `this._id`.
   */
  getBlockedTasks(): Promise<Types.ObjectId[]>;

  /**
   * Indique si la tâche peut être marquée comme "Terminé".
   * Une tâche est marquable comme terminée uniquement si toutes les tâches dont elle dépend
   * ont déjà le statut "Terminé".
   */
  canMarkAsDone(): Promise<boolean>;
}

@Schema()
export class Task {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  duration: number;

  @Prop({ required: true, enum: ['HIGH', 'MEDIUM', 'LOW'] })
  priority: string;

  @Prop({
    enum: ['À faire', 'En cours', 'Terminé'],
    default: 'À faire',
  })
  status: string;

  @Prop({ min: 0, max: 100, default: 0 })
  progress: number;

  /**
   * Liste des tâches dont dépend celle‑ci.
   * Chaque entrée est un ObjectId de Task.
   */
  @Prop({ type: [Types.ObjectId], ref: 'Task', default: [] })
  dependsOn: Types.ObjectId[];

  /**
   * Date de début planifiée de la tâche.
   * Peut être calculée à partir des dépendances et du planning projet.
   */
  @Prop({ type: Date, required: false })
  startDate?: Date;

  /**
   * Date de fin planifiée de la tâche.
   * Peut être calculée comme startDate + durée.
   */
  @Prop({ type: Date, required: false })
  endDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  assignedTo?: Types.ObjectId | null;

  @Prop({ min: 0, default: 0 })
  spentBudget: number;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export type TaskDocument = Task & Document & TaskMethods;
export const TaskSchema = SchemaFactory.createForClass(Task);

// Index utile pour accélérer les suppressions par projet (cascade delete).
TaskSchema.index({ projectId: 1 });

// ------------------------------
// Méthodes d'instance (dépendances)
// ------------------------------

/**
 * Nettoie les références dans `dependsOn` quand une tâche est supprimée.
 * Évite de laisser des dépendances cassées dans les autres tâches.
 */
TaskSchema.pre('findOneAndDelete', async function cleanupTaskDependencies() {
  const query = this as unknown as {
    getFilter: () => Record<string, unknown>;
    model: { db: { model: (name: string) => Model<TaskDocument> } };
  };

  const filter = query.getFilter();
  const taskId = filter?._id;
  if (!taskId) return;

  const TaskModel = query.model.db.model('Task');
  await TaskModel.updateMany(
    { dependsOn: taskId },
    { $pull: { dependsOn: taskId } },
  ).exec();
});

TaskSchema.methods.getBlockedTasks = async function getBlockedTasks(): Promise<Types.ObjectId[]> {
  // `this` est le document Task courant
  const selfId = this._id as Types.ObjectId;

  // On récupère toutes les tâches qui référencent cette tâche dans leur tableau `dependsOn`.
  const TaskModel = this.model('Task') as Model<TaskDocument>;
  const blocked = await TaskModel.find({ dependsOn: selfId }).select('_id').exec();

  return blocked.map((t) => t._id as Types.ObjectId);
};

TaskSchema.methods.canMarkAsDone = async function canMarkAsDone(): Promise<boolean> {
  // Aucune dépendance → la tâche peut être terminée.
  if (!Array.isArray(this.dependsOn) || this.dependsOn.length === 0) {
    return true;
  }

  const TaskModel = this.model('Task') as Model<TaskDocument>;

  // On charge toutes les tâches dont dépend celle‑ci.
  const dependencies = await TaskModel.find({ _id: { $in: this.dependsOn } })
    .select('status')
    .exec();

  // Si pour une raison quelconque aucune dépendance valide n'est trouvée,
  // on considère par sécurité que la tâche ne peut PAS être clôturée.
  if (dependencies.length === 0) {
    return false;
  }

  // La tâche est marquable comme terminée seulement si toutes les dépendances
  // ont le statut strictement "Terminé".
  return dependencies.every((task) => task.status === 'Terminé');
};
