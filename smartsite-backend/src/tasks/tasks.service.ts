import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskDocument } from './schemas/task.schema';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class TasksService implements OnModuleInit {
  constructor(@InjectModel(Task.name) private taskModel: Model<TaskDocument>) {}

  async onModuleInit(): Promise<void> {
    await this.migrateLegacyTasks();
  }

  /** Anciens documents sans les nouveaux champs obligatoires */
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
        {
          $set: {
            dependsOn: [],
          },
        },
      )
      .exec();

    await this.taskModel.updateMany({}, { $unset: { completed: '' } }).exec();
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

    const doc = new this.taskModel({
      ...createTaskDto,
      duration,
      dependsOn,
      startDate,
      endDate,
      assignedTo: createTaskDto.assignedTo ?? undefined,
    });

    const created = await doc.save();
    await created.populate('assignedTo', 'name email');
    return created;
  }

  async findAll(): Promise<Task[]> {
    return this.taskModel
      .find()
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Task> {
    this.assertValidObjectId(id, 'id');
    const task = await this.taskModel
      .findById(id)
      .populate('assignedTo', 'name email')
      .exec();
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async findByProject(projectId: string): Promise<Task[]> {
    this.assertValidObjectId(projectId, 'projectId');
    return this.taskModel
      .find({ projectId })
      .populate('assignedTo', 'name email')
      .exec();
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    this.assertValidObjectId(id, 'id');

    const existingTask = await this.taskModel.findById(id).exec();
    if (!existingTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (updateTaskDto.projectId) {
      this.assertValidObjectId(updateTaskDto.projectId, 'projectId');
    }
    if (updateTaskDto.assignedTo && typeof updateTaskDto.assignedTo === 'string') {
      this.assertValidObjectId(updateTaskDto.assignedTo, 'assignedTo');
    }

    const effectiveProjectId =
      updateTaskDto.projectId ?? String(existingTask.projectId);

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

    const updatePayload: UpdateTaskDto = {
      ...updateTaskDto,
      duration: effectiveDuration,
      dependsOn: validatedDependsOn,
      startDate,
      endDate,
    };

    const updatedTask = await this.taskModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .populate('assignedTo', 'name email')
      .exec();

    if (!updatedTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return updatedTask;
  }

  async remove(id: string): Promise<Task> {
    this.assertValidObjectId(id, 'id');
    const deletedTask = await this.taskModel.findByIdAndDelete(id).exec();
    if (!deletedTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return deletedTask;
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
