import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskDocument } from './schemas/task.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { isTaskLateAt } from './task-late.util';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.migrateLegacyTasks();
    await this.migrateLegacyProjects();
    await this.recomputeBehindScheduleForOpenProjects();
  }

  /** Anciens documents Task sans les nouveaux champs obligatoires */
  private async migrateLegacyTasks(): Promise<void> {
    await this.taskModel
      .updateMany(
        { duration: { $exists: false } },
        {
          $set: {
            duration: 1,
            priority: 'MEDIUM',
            status: 'À faire',
            progress: 0,
          },
        },
      )
      .exec();

    await this.taskModel
      .updateMany(
        { dependsOn: { $exists: false } },
        { $set: { dependsOn: [] } },
      )
      .exec();

    await this.taskModel.updateMany({}, { $unset: { completed: '' } }).exec();

    await this.taskModel
      .updateMany(
        { spentBudget: { $exists: false } },
        { $set: { spentBudget: 0 } },
      )
      .exec();
  }

  /**
   * Migration initiale des projets existants:
   * 1. Initialise spentBudget à 0 si absent.
   * 2. Recalcule depuis les tâches existantes pour chaque projet.
   */
  private async migrateLegacyProjects(): Promise<void> {
    await this.projectModel
      .updateMany(
        { spentBudget: { $exists: false } },
        { $set: { spentBudget: 0 } },
      )
      .exec();

    const projects = await this.projectModel.find().select('_id').lean().exec();
    for (const project of projects) {
      const projectId = String(project._id);
      await this.recalculateProjectSpentBudget(projectId);
    }
  }

  /**
   * Après démarrage : aligne le statut « En retard » des projets ouverts
   * sur le nombre de tâches en retard (seuil : 3).
   */
  private async recomputeBehindScheduleForOpenProjects(): Promise<void> {
    const open = await this.projectModel
      .find({ status: { $ne: 'Terminé' } })
      .select('_id')
      .lean()
      .exec();
    for (const p of open) {
      await this.syncProjectBehindScheduleFromTasks(String(p._id));
    }
  }

  /**
   * Si au moins 3 tâches du projet ont une endDate dépassée et ne sont pas « Terminé »,
   * le projet passe en « En retard » (projets déjà « Terminé » non modifiés).
   */
  private async syncProjectBehindScheduleFromTasks(projectId: string): Promise<void> {
    this.assertValidObjectId(projectId, 'projectId');

    const projectObjectId = new Types.ObjectId(projectId);
    const project = await this.projectModel
      .findById(projectObjectId)
      .select('status')
      .lean()
      .exec();

    if (!project || project.status === 'Terminé') return;

    const taskRows = await this.taskModel
      .find({
        $or: [
          { projectId: projectObjectId },
          { projectId: projectId },
          { $expr: { $eq: [{ $toString: '$projectId' }, projectId] } },
        ],
      })
      .select('_id endDate status')
      .lean()
      .exec();

    const seen = new Set<string>();
    const unique = taskRows.filter((row) => {
      const id = String(row._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const now = new Date();
    const lateCount = unique.filter((t) =>
      isTaskLateAt(t.endDate, t.status != null ? String(t.status) : undefined, now),
    ).length;

    if (lateCount >= 3) {
      await this.projectModel
        .findByIdAndUpdate(projectObjectId, { $set: { status: 'En retard' } })
        .exec();
      this.logger.debug(
        `[behindSchedule] projectId=${projectId} → En retard (${lateCount} late tasks)`,
      );
    }
  }

  /**
   * Recalcule le budget dépensé d'un projet en sommant les spentBudget de toutes ses tâches,
   * puis met à jour le champ spentBudget du document Project.
   * Retourne le nouveau total calculé.
   */
  async recalculateProjectSpentBudget(projectId: string): Promise<number> {
    this.assertValidObjectId(projectId, 'projectId');

    const projectObjectId = new Types.ObjectId(projectId);

    // Comparer projectId en string pour matcher à la fois ObjectId ET chaînes héritées en base.
    // find({ projectId: oid }) seul échoue si des tâches anciennes ont projectId en string.
    const taskRows = await this.taskModel
      .find({
        $or: [
          { projectId: projectObjectId },
          { projectId: projectId },
          { $expr: { $eq: [{ $toString: '$projectId' }, projectId] } },
        ],
      })
      .select('spentBudget projectId')
      .lean()
      .exec();

    // Dédupliquer par _id au cas où $or matcherait le même doc plusieurs fois (ne devrait pas arriver).
    const seen = new Set<string>();
    const uniqueRows = taskRows.filter((row) => {
      const id = String(row._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const taskCount = uniqueRows.length;
    const total = uniqueRows.reduce((sum, row) => {
      const v = row.spentBudget;
      const n =
        typeof v === 'number' && Number.isFinite(v)
          ? v
          : typeof v === 'string'
            ? Number.parseFloat(v) || 0
            : 0;
      return sum + (Number.isFinite(n) ? Math.max(0, n) : 0);
    }, 0);

    this.logger.debug(
      `[recalculate] projectId=${projectId} | tasks trouvées=${taskCount} | total spentBudget=${total}`,
    );

    // Mise à jour explicite avec $set — pas d'ambiguïté sur l'opérateur Mongoose.
    const updated = await this.projectModel
      .findByIdAndUpdate(
        projectObjectId,
        { $set: { spentBudget: total } },
        { new: true },
      )
      .exec();

    if (!updated) {
      this.logger.warn(
        `[recalculate] Projet introuvable pour projectId=${projectId} — spentBudget non mis à jour`,
      );
    } else {
      this.logger.debug(
        `[recalculate] Projet ${projectId} mis à jour → spentBudget=${updated.spentBudget}`,
      );
    }

    return total;
  }

  private assertValidObjectId(id: string, fieldName: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`${fieldName} must be a valid MongoDB ObjectId`);
    }
  }

  private normalizeDependsOn(dependsOn?: string[]): string[] {
    if (!Array.isArray(dependsOn)) return [];

    const unique = new Set<string>();
    for (const depId of dependsOn) {
      if (typeof depId !== 'string') continue;
      const value = depId.trim();
      if (!value) continue;
      unique.add(value);
    }

    return Array.from(unique);
  }

  private toDateOrUndefined(value: unknown): Date | undefined {
    if (!(value instanceof Date)) return undefined;
    if (Number.isNaN(value.getTime())) return undefined;
    return value;
  }

  private resolveTaskDates(params: {
    startDateInput?: Date;
    endDateInput?: Date;
    durationDays: number;
    recomputeEndFromDuration?: boolean;
  }): { startDate?: Date; endDate?: Date } {
    const { startDateInput, endDateInput, durationDays, recomputeEndFromDuration } = params;

    if (!Number.isFinite(durationDays) || durationDays < 1) {
      throw new BadRequestException('duration must be at least 1 day');
    }

    let startDate = this.toDateOrUndefined(startDateInput);
    let endDate = this.toDateOrUndefined(endDateInput);

    // Option "auto-calcul": si startDate est défini mais pas endDate,
    // on calcule endDate = startDate + duration.
    if (startDate && (!endDate || recomputeEndFromDuration)) {
      endDate = new Date(startDate.getTime() + durationDays * MS_PER_DAY);
    }

    // Si endDate est fourni sans startDate, on rétro-calcule startDate.
    if (!startDate && endDate) {
      startDate = new Date(endDate.getTime() - durationDays * MS_PER_DAY);
    }

    if (startDate && endDate && startDate.getTime() >= endDate.getTime()) {
      throw new BadRequestException('startDate must be earlier than endDate');
    }

    return { startDate, endDate };
  }

  private async validateDependencies(
    dependsOn: string[] | undefined,
    projectId: string,
    currentTaskId?: string,
  ): Promise<string[]> {
    const normalized = this.normalizeDependsOn(dependsOn);
    if (normalized.length === 0) return [];

    for (const depId of normalized) {
      this.assertValidObjectId(depId, 'dependsOn[]');
    }

    if (currentTaskId && normalized.includes(currentTaskId)) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    const dependencies = await this.taskModel
      .find({ _id: { $in: normalized } })
      .select('_id projectId')
      .lean()
      .exec();

    if (dependencies.length !== normalized.length) {
      throw new BadRequestException('One or more dependsOn task ids do not exist');
    }

    for (const dependency of dependencies) {
      if (String(dependency.projectId) !== projectId) {
        throw new BadRequestException(
          'All dependencies must belong to the same project as the task',
        );
      }
    }

    return normalized;
  }

  async validateNoCycle(
    taskId: string,
    newDependencyIds: string[],
    projectId: string,
  ): Promise<boolean> {
    if (newDependencyIds.length === 0) return true;

    const targetId = String(taskId);
    const visited = new Set<string>();
    const toVisit: string[] = [...newDependencyIds];

    while (toVisit.length > 0) {
      const batch = toVisit.splice(0, 200).filter((id) => !visited.has(id));
      if (batch.length === 0) continue;

      for (const id of batch) {
        visited.add(id);
      }

      const tasks = await this.taskModel
        .find({ _id: { $in: batch }, projectId })
        .select('_id dependsOn')
        .lean()
        .exec();

      for (const task of tasks) {
        const dependencies = Array.isArray(task.dependsOn)
          ? task.dependsOn.map((depId) => String(depId))
          : [];

        if (dependencies.includes(targetId)) return false;

        for (const depId of dependencies) {
          if (!visited.has(depId)) {
            toVisit.push(depId);
          }
        }
      }
    }

    return true;
  }

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    this.assertValidObjectId(createTaskDto.projectId, 'projectId');
    if (createTaskDto.assignedTo) {
      this.assertValidObjectId(createTaskDto.assignedTo, 'assignedTo');
    }

    const duration = Math.max(1, Math.round(createTaskDto.duration));
    const dependsOn = await this.validateDependencies(
      createTaskDto.dependsOn,
      createTaskDto.projectId,
    );

    const noCycle = await this.validateNoCycle(
      new Types.ObjectId().toString(),
      dependsOn,
      createTaskDto.projectId,
    );
    if (!noCycle) {
      throw new BadRequestException('Dependency cycle detected');
    }

    const { startDate, endDate } = this.resolveTaskDates({
      startDateInput: createTaskDto.startDate,
      endDateInput: createTaskDto.endDate,
      durationDays: duration,
    });

    const progress =
      createTaskDto.status === 'Terminé'
        ? 100
        : Math.min(100, Math.max(0, Math.round(createTaskDto.progress ?? 0)));

    const doc = new this.taskModel({
      ...createTaskDto,
      duration,
      dependsOn,
      startDate,
      endDate,
      progress,
      assignedTo: createTaskDto.assignedTo ?? undefined,
    });

    const created = await doc.save();
    await created.populate('assignedTo', 'firstName lastName role availability');
    await this.recalculateProjectSpentBudget(createTaskDto.projectId);
    await this.syncProjectBehindScheduleFromTasks(createTaskDto.projectId);
    return created;
  }

  async findAll(): Promise<Task[]> {
    return this.taskModel
      .find()
      .populate('assignedTo', 'firstName lastName role availability')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Task> {
    this.assertValidObjectId(id, 'id');
    const task = await this.taskModel
      .findById(id)
      .populate('assignedTo', 'firstName lastName role availability')
      .exec();
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async findByProject(projectId: string): Promise<TaskDocument[]> {
    this.assertValidObjectId(projectId, 'projectId');
    return this.taskModel
      .find({ projectId })
      .populate('assignedTo', 'firstName lastName role availability')
      .exec();
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    this.assertValidObjectId(id, 'id');

    const existingTask = await this.taskModel.findById(id).exec();
    if (!existingTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const oldProjectId = String(existingTask.projectId);

    if (updateTaskDto.projectId) {
      this.assertValidObjectId(updateTaskDto.projectId, 'projectId');
    }
    if (updateTaskDto.assignedTo && typeof updateTaskDto.assignedTo === 'string') {
      this.assertValidObjectId(updateTaskDto.assignedTo, 'assignedTo');
    }

    const effectiveProjectId =
      updateTaskDto.projectId ?? oldProjectId;

    const effectiveDependsOn = Array.isArray(updateTaskDto.dependsOn)
      ? updateTaskDto.dependsOn
      : (existingTask.dependsOn ?? []).map((depId) => String(depId));

    const validatedDependsOn = await this.validateDependencies(
      effectiveDependsOn,
      effectiveProjectId,
      id,
    );

    const noCycle = await this.validateNoCycle(
      id,
      validatedDependsOn,
      effectiveProjectId,
    );
    if (!noCycle) {
      throw new BadRequestException('Dependency cycle detected');
    }

    const effectiveDuration =
      typeof updateTaskDto.duration === 'number'
        ? Math.max(1, Math.round(updateTaskDto.duration))
        : existingTask.duration;

    const { startDate, endDate } = this.resolveTaskDates({
      startDateInput: updateTaskDto.startDate ?? existingTask.startDate,
      endDateInput: updateTaskDto.endDate ?? existingTask.endDate,
      durationDays: effectiveDuration,
      recomputeEndFromDuration:
        typeof updateTaskDto.duration === 'number' && !updateTaskDto.endDate,
    });

    // Construction explicite du payload pour éviter les undefined dans le $set.
    const updatePayload: Record<string, unknown> = {
      ...updateTaskDto,
      duration: effectiveDuration,
      dependsOn: validatedDependsOn,
      startDate,
      endDate,
    };

    // Supprimer les clés undefined pour éviter d'écraser des champs en base avec undefined.
    for (const key of Object.keys(updatePayload)) {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    }

    const effectiveStatus =
      updateTaskDto.status !== undefined
        ? String(updateTaskDto.status)
        : String(existingTask.status ?? '');
    if (effectiveStatus === 'Terminé') {
      updatePayload.progress = 100;
    }

    const updatedTask = await this.taskModel
      .findByIdAndUpdate(id, { $set: updatePayload }, { new: true })
      .populate('assignedTo', 'firstName lastName role availability')
      .exec();

    if (!updatedTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    await this.recalculateProjectSpentBudget(effectiveProjectId);
    if (updateTaskDto.projectId && updateTaskDto.projectId !== oldProjectId) {
      await this.recalculateProjectSpentBudget(oldProjectId);
    }

    await this.syncProjectBehindScheduleFromTasks(effectiveProjectId);
    if (updateTaskDto.projectId && updateTaskDto.projectId !== oldProjectId) {
      await this.syncProjectBehindScheduleFromTasks(oldProjectId);
    }

    return updatedTask;
  }

  async remove(id: string): Promise<Task> {
    this.assertValidObjectId(id, 'id');
    const deletedTask = await this.taskModel.findByIdAndDelete(id).exec();
    if (!deletedTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    const pid = String(deletedTask.projectId);
    await this.recalculateProjectSpentBudget(pid);
    await this.syncProjectBehindScheduleFromTasks(pid);
    return deletedTask;
  }

  /**
   * Passe toutes les tâches du projet à « Terminé » avec progression 100 %.
   * Utilisé quand le projet est clôturé côté planning.
   */
  async markAllTasksCompletedForProject(projectId: string): Promise<number> {
    this.assertValidObjectId(projectId, 'projectId');
    const result = await this.taskModel
      .updateMany(
        { projectId },
        {
          $set: {
            status: 'Terminé',
            progress: 100,
          },
        },
      )
      .exec();
    await this.syncProjectBehindScheduleFromTasks(projectId);
    return result.modifiedCount ?? 0;
  }

  /**
   * Supprime toutes les tâches liées à un projet.
   * Retourne le nombre de tâches supprimées.
   */
  async deleteByProjectId(projectId: string): Promise<number> {
    this.assertValidObjectId(projectId, 'projectId');
    const result = await this.taskModel.deleteMany({ projectId }).exec();
    return result.deletedCount ?? 0;
  }
}
