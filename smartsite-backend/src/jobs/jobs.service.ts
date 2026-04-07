import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Job, JobDocument } from './jobs.schema';
import { JobProgress, JobProgressDocument } from './schemas/job-progress.schema';
import { Resource, ResourceDocument } from '../resources/schemas/resource.schema';
import {
  CreateJobDto,
  AssignedResourceDto,
} from './create-job.dto';
import { UpdateJobDto } from './update-job.dto';
import { UpdateJobProgressDto } from './dto/update-job-progress.dto';
import type { AiAnalysisResult } from './ai-analysis.service';
import { PROGRESS_UPLOAD_DIR } from './multer-progress.config';
import { Human, HumanDocument } from '../human-resources/schemas/human.schema';
import { Equipment, EquipmentDocument } from '../equipment-resources/schemas/equipment.schema';


const DEFAULT_STEP_LABELS = ['Préparation', 'Exécution', 'Finalisation'] as const;

export type SerializedProgressStep = {
  step: string;
  completed: boolean;
  date: string;
  photoUrl?: string;
  aiAnalysis?: {
    dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    detectedObjects: string[];
    safetyStatus: { helmet: boolean; vest: boolean };
    message: string;
  };
};

export type JobProgressResponse = {
  steps: SerializedProgressStep[];
  percentage: number;
};

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(JobProgress.name)
    private jobProgressModel: Model<JobProgressDocument>,
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
    @InjectModel(Equipment.name)
        private equipmentModel: Model<EquipmentDocument>,
         @InjectModel(Human.name)
            private humanModel: Model<HumanDocument>,
  ) {}

async create(createJobDto: CreateJobDto): Promise<Job> {
  await this.validateAssignedResources(createJobDto.assignedResources);

  const assignedResources = await Promise.all(
    (createJobDto.assignedResources || []).map(async (r) => {
      let name = '';

      if (r.type === 'Human') {
        const human = await this.humanModel.findById(r.resourceId);
        name = human
          ? `${human.firstName} ${human.lastName}`
          : 'Unknown';
      }

      if (r.type === 'Equipment') {
        const equip = await this.equipmentModel.findById(r.resourceId);
        name = equip?.name || 'Unknown';
      }

      return {
        resourceId: new Types.ObjectId(r.resourceId),
        type: r.type,
        name, // ✅ STOCKÉ DIRECT
      };
    })
  );

  const createdJob = new this.jobModel({
    ...createJobDto,
    taskId: new Types.ObjectId(createJobDto.taskId),
    assignedResources,
  });

  return createdJob.save();
}
  async findAll(): Promise<
    (Job & { progressPercentage: number; assignedResources?: unknown })[]
  > {
    // Ne pas populate `resourceId` : le schéma pointe vers `Resource` alors que les ids
    // sont ceux des collections Human / Equipment — populate écraserait l’id par null.
    const jobs = await this.jobModel.find().lean().exec();
    if (!jobs.length) return [];

    const ids = jobs.map((j) => j._id);
    const progresses = await this.jobProgressModel
      .find({ jobId: { $in: ids } })
      .lean()
      .exec();

    const byJobId = new Map(progresses.map((p) => [String(p.jobId), p]));

    return jobs.map((job) => {
      const p = byJobId.get(String(job._id));
      const steps = this.normalizeSteps(p?.steps);
      const progressPercentage = this.computePercentage(steps);
      return {
        ...(job as Job),
        progressPercentage,
      };
    });
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobModel.findById(id).exec();
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

async update(id: string, updateJobDto: UpdateJobDto): Promise<Job> {
  if (updateJobDto.assignedResources?.length) {
    await this.validateAssignedResources(
      updateJobDto.assignedResources as AssignedResourceDto[],
    );
  }

  const payload: Record<string, unknown> = { ...updateJobDto };

  // ✅ taskId
  if (updateJobDto.taskId) {
    payload.taskId = new Types.ObjectId(updateJobDto.taskId);
  }

  // 🔥 AJOUT IMPORTANT : enrichir avec name
  if (updateJobDto.assignedResources) {
    const enrichedResources = await Promise.all(
      updateJobDto.assignedResources.map(async (r) => {
        let name = '';

        if (r.type === 'Human') {
          const human = await this.humanModel.findById(r.resourceId);
          name = human
            ? `${human.firstName} ${human.lastName}`
            : 'Unknown';
        }

        if (r.type === 'Equipment') {
          const equip = await this.equipmentModel.findById(r.resourceId);
          name = equip?.name || 'Unknown';
        }

        return {
          resourceId: new Types.ObjectId(r.resourceId),
          type: r.type,
          name, // ✅ AJOUTÉ ICI
        };
      })
    );

    payload.assignedResources = enrichedResources;
  }

  const updated = await this.jobModel.findByIdAndUpdate(id, payload, {
    new: true,
  });

  if (!updated) throw new NotFoundException('Job not found');

  return updated;
}
  async remove(id: string): Promise<void> {
    const deleted = await this.jobModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Job not found');
    await this.jobProgressModel.deleteMany({ jobId: new Types.ObjectId(id) });
  }

  async getJobProgress(jobId: string): Promise<JobProgressResponse> {
    await this.ensureJobExists(jobId);
    const doc = await this.ensureDefaultProgress(jobId);
    const steps = this.normalizeSteps(doc.steps);
    const percentage = this.computePercentage(steps);
    return {
      steps: this.serializeSteps(steps),
      percentage,
    };
  }

  async updateJobProgress(
    jobId: string,
    dto: UpdateJobProgressDto,
  ): Promise<JobProgressResponse> {
    await this.ensureJobExists(jobId);
    const doc = await this.ensureDefaultProgress(jobId);
    const existing = this.normalizeSteps(doc.steps);
    const incoming = this.normalizeSteps(dto.steps);

    if (incoming.length === 0) {
      throw new BadRequestException('steps must be a non-empty array');
    }

    const merged = incoming.map((step, index) => {
      const prev = existing[index];
      const date =
        step.date ??
        (step.completed !== prev?.completed && step.completed
          ? new Date()
          : prev?.date ?? new Date());
      return {
        step: step.step,
        completed: step.completed,
        date,
        photoUrl: step.photoUrl ?? prev?.photoUrl,
        aiAnalysis: step.aiAnalysis ?? prev?.aiAnalysis,
      };
    });

    doc.set('steps', merged);
    await doc.save();

    const steps = this.normalizeSteps(doc.steps);
    const percentage = this.computePercentage(steps);
    return {
      steps: this.serializeSteps(steps),
      percentage,
    };
  }

  async uploadProgressPhoto(
    jobId: string,
    stepIndex: number,
    photoUrl: string,
    aiAnalysis: AiAnalysisResult,
  ): Promise<{ photoUrl: string; aiAnalysis: AiAnalysisResult }> {
    await this.ensureJobExists(jobId);
    const doc = await this.ensureDefaultProgress(jobId);
    const steps = this.normalizeSteps(doc.steps);

    if (
      !Number.isInteger(stepIndex) ||
      stepIndex < 0 ||
      stepIndex >= steps.length
    ) {
      throw new BadRequestException('Invalid step index');
    }

    steps[stepIndex] = {
      ...steps[stepIndex],
      photoUrl,
      aiAnalysis: {
        dangerLevel: aiAnalysis.dangerLevel,
        detectedObjects: [...aiAnalysis.detectedObjects],
        safetyStatus: {
          helmet: aiAnalysis.safetyStatus.helmet,
          vest: aiAnalysis.safetyStatus.vest,
        },
        message: aiAnalysis.message,
      },
    };
    doc.set('steps', steps);
    await doc.save();

    return { photoUrl, aiAnalysis };
  }

  async removeProgressPhoto(
    jobId: string,
    stepIndex: number,
  ): Promise<JobProgressResponse> {
    await this.ensureJobExists(jobId);
    const doc = await this.ensureDefaultProgress(jobId);
    const steps = this.normalizeSteps(doc.steps);

    if (
      !Number.isInteger(stepIndex) ||
      stepIndex < 0 ||
      stepIndex >= steps.length
    ) {
      throw new BadRequestException('Invalid step index');
    }

    const prevUrl = steps[stepIndex]?.photoUrl;
    steps[stepIndex] = {
      ...steps[stepIndex],
      photoUrl: undefined,
      aiAnalysis: undefined,
    };
    doc.set('steps', steps);
    await doc.save();

    if (prevUrl) {
      const rel = prevUrl.split('/uploads/progress/')[1];
      if (rel) {
        try {
          await unlink(join(PROGRESS_UPLOAD_DIR, rel));
        } catch {
          /* ignore missing file */
        }
      }
    }

    const out = this.normalizeSteps(doc.steps);
    return {
      steps: this.serializeSteps(out),
      percentage: this.computePercentage(out),
    };
  }

private async validateAssignedResources(
  assigned: AssignedResourceDto[] | undefined,
): Promise<void> {
  if (!assigned?.length) return;

  for (const ar of assigned) {
    let res;

    if (ar.type === 'Human') {
      res = await this.humanModel.findById(ar.resourceId).exec();
    } else if (ar.type === 'Equipment') {
      res = await this.equipmentModel.findById(ar.resourceId).exec();
    }

    if (!res) {
      throw new BadRequestException(`Resource not found: ${ar.resourceId}`);
    }
  }
}
  private async ensureJobExists(jobId: string): Promise<void> {
    const exists = await this.jobModel.exists({ _id: jobId });
    if (!exists) throw new NotFoundException('Job not found');
  }

  private async ensureDefaultProgress(
    jobId: string,
  ): Promise<JobProgressDocument> {
    const oid = new Types.ObjectId(jobId);
    let doc = await this.jobProgressModel.findOne({ jobId: oid }).exec();
    if (!doc) {
      const steps = DEFAULT_STEP_LABELS.map((label) => ({
        step: label,
        completed: false,
        date: new Date(),
      }));
      doc = await this.jobProgressModel.create({ jobId: oid, steps });
    } else {
      const steps = this.normalizeSteps(doc.steps);
      if (steps.length === 0) {
        doc.set(
          'steps',
          DEFAULT_STEP_LABELS.map((label) => ({
            step: label,
            completed: false,
            date: new Date(),
          })),
        );
        await doc.save();
      }
    }
    return doc;
  }

  private normalizeSteps(raw: unknown): {
    step: string;
    completed: boolean;
    date: Date;
    photoUrl?: string;
    aiAnalysis?: {
      dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      detectedObjects: string[];
      safetyStatus: { helmet: boolean; vest: boolean };
      message: string;
    };
  }[] {
    const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (!Array.isArray(raw)) return [];
    return raw.map((s: Record<string, unknown>) => {
      const ai = s?.aiAnalysis as Record<string, unknown> | undefined;
      let aiAnalysis:
        | {
            dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
            detectedObjects: string[];
            safetyStatus: { helmet: boolean; vest: boolean };
            message: string;
          }
        | undefined;
      if (ai && typeof ai === 'object' && levels.includes(ai.dangerLevel as string)) {
        const ss = ai.safetyStatus as Record<string, unknown> | undefined;
        const helmet =
          ss && typeof ss.helmet === 'boolean' ? ss.helmet : false;
        const vest = ss && typeof ss.vest === 'boolean' ? ss.vest : false;
        aiAnalysis = {
          dangerLevel: ai.dangerLevel as
            | 'LOW'
            | 'MEDIUM'
            | 'HIGH'
            | 'CRITICAL',
          detectedObjects: Array.isArray(ai.detectedObjects)
            ? (ai.detectedObjects as string[])
            : [],
          safetyStatus: { helmet, vest },
          message: typeof ai.message === 'string' ? ai.message : '',
        };
      }
      return {
        step: typeof s?.step === 'string' ? s.step : '',
        completed: Boolean(s?.completed),
        date: s?.date ? new Date(s.date as string | Date) : new Date(),
        photoUrl:
          typeof s?.photoUrl === 'string' && s.photoUrl.length > 0
            ? s.photoUrl
            : undefined,
        ...(aiAnalysis ? { aiAnalysis } : {}),
      };
    });
  }

  private serializeSteps(
    steps: {
      step: string;
      completed: boolean;
      date: Date;
      photoUrl?: string;
      aiAnalysis?: {
        dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        detectedObjects: string[];
        safetyStatus: { helmet: boolean; vest: boolean };
        message: string;
      };
    }[],
  ): SerializedProgressStep[] {
    return steps.map((s) => ({
      step: s.step,
      completed: s.completed,
      date: s.date.toISOString(),
      ...(s.photoUrl ? { photoUrl: s.photoUrl } : {}),
      ...(s.aiAnalysis
        ? {
            aiAnalysis: {
              dangerLevel: s.aiAnalysis.dangerLevel,
              detectedObjects: [...s.aiAnalysis.detectedObjects],
              safetyStatus: {
                helmet: s.aiAnalysis.safetyStatus.helmet,
                vest: s.aiAnalysis.safetyStatus.vest,
              },
              message: s.aiAnalysis.message,
            },
          }
        : {}),
    }));
  }

  private computePercentage(steps: { completed: boolean }[]): number {
    if (!Array.isArray(steps) || steps.length === 0) return 0;
    const completed = steps.filter((s) => s.completed).length;
    return Math.round((completed / steps.length) * 100);
  }
}
