import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProgressPhoto, ProgressPhotoDocument } from './progress-photos.schema';
import { CreateProgressPhotoDto, ValidatePhotoDto } from './dto/create-progress-photo.dto';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class ProgressPhotosService {
  constructor(
    @InjectModel(ProgressPhoto.name)
    private progressPhotoModel: Model<ProgressPhotoDocument>,
    @Inject(forwardRef(() => ProjectsService))
    private readonly projectsService: ProjectsService,
  ) {}

  private isClientRole(roleName?: string): boolean {
    return String(roleName ?? '').trim() === 'Client';
  }

  // POST — Upload une photo
  async create(createProgressPhotoDto: CreateProgressPhotoDto): Promise<ProgressPhoto> {
    const newPhoto = new this.progressPhotoModel(createProgressPhotoDto);
    return newPhoto.save();
  }

  // GET — Toutes les photos
  async findAll(): Promise<ProgressPhoto[]> {
    return this.progressPhotoModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * Client : uniquement les photos des projets dont il est le `clientId`. Staff : toutes.
   */
  async findAllForRequestUser(u: { sub: string; roleName?: string }): Promise<ProgressPhoto[]> {
    if (!this.isClientRole(u.roleName)) {
      return this.findAll();
    }
    const projects = await this.projectsService.findAllByClientId(u.sub);
    if (projects.length === 0) {
      return [];
    }
    const projectIds = projects.map((p) => {
      const id = (p as unknown as { _id: Types.ObjectId | string })._id;
      return new Types.ObjectId(String(id));
    });
    return this.progressPhotoModel
      .find({ projectId: { $in: projectIds } } as Record<string, unknown>)
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Photos d’un projet filtrées pour un client (même contenu que findByProject si accès autorisé).
   */
  async findByProjectForRequestUser(
    u: { sub: string; roleName?: string },
    projectId: string,
  ): Promise<ProgressPhoto[]> {
    if (!this.isClientRole(u.roleName)) {
      return this.findByProject(projectId);
    }
    await this.projectsService.assertRequestCanAccessProject(u, projectId);
    return this.findByProject(projectId);
  }

  async findApprovedByProjectForRequestUser(
    u: { sub: string; roleName?: string },
    projectId: string,
  ): Promise<ProgressPhoto[]> {
    if (!this.isClientRole(u.roleName)) {
      return this.findApprovedByProject(projectId);
    }
    await this.projectsService.assertRequestCanAccessProject(u, projectId);
    return this.findApprovedByProject(projectId);
  }

  async getLatestProgressForRequestUser(
    u: { sub: string; roleName?: string },
    projectId: string,
  ) {
    if (!this.isClientRole(u.roleName)) {
      return this.getLatestProgress(projectId);
    }
    await this.projectsService.assertRequestCanAccessProject(u, projectId);
    return this.getLatestProgress(projectId);
  }

  // GET — Photos par projet
  async findByProject(projectId: string): Promise<ProgressPhoto[]> {
    return this.progressPhotoModel
      .find({ projectId })
      .sort({ takenAt: -1 })
      .exec();
  }

  // GET — Photos en attente de validation (pour superviseur)
  async findPending(): Promise<ProgressPhoto[]> {
    return this.progressPhotoModel
      .find({ validationStatus: 'pending' })
      .sort({ createdAt: 1 })
      .exec();
  }

  // GET — Photos approuvées d'un projet (pour consultation client)
  async findApprovedByProject(projectId: string): Promise<ProgressPhoto[]> {
    return this.progressPhotoModel
      .find({ projectId, validationStatus: 'approved' })
      .sort({ takenAt: -1 })
      .exec();
  }

  // GET — Une photo par ID
  async findOne(id: string): Promise<ProgressPhoto> {
    const photo = await this.progressPhotoModel.findById(id).exec();
    if (!photo) throw new NotFoundException(`Photo #${id} not found`);
    return photo;
  }

  // PATCH — Valider ou rejeter une photo (superviseur)
  async validate(id: string, validatePhotoDto: ValidatePhotoDto): Promise<ProgressPhoto> {
    const updated = await this.progressPhotoModel
      .findByIdAndUpdate(id, validatePhotoDto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Photo #${id} not found`);
    return updated;
  }

  // DELETE — Supprimer une photo
  async remove(id: string): Promise<ProgressPhoto> {
    const deleted = await this.progressPhotoModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`Photo #${id} not found`);
    return deleted;
  }

  // Update photo details
async update(id: string, updateData: { caption?: string; estimatedProgress?: number }): Promise<ProgressPhoto> {
  const updated = await this.progressPhotoModel
    .findByIdAndUpdate(id, updateData, { new: true })
    .exec();
  if (!updated) throw new NotFoundException(`Photo #${id} not found`);
  return updated;
}

  // GET — Dernier avancement estimé d'un projet
  async getLatestProgress(projectId: string): Promise<{ projectId: string; latestProgress: number }> {
    const latestPhoto = await this.progressPhotoModel
      .findOne({ projectId, validationStatus: 'approved', estimatedProgress: { $exists: true } })
      .sort({ takenAt: -1 })
      .exec();

    return {
      projectId,
      latestProgress: latestPhoto?.estimatedProgress ?? 0,
    };
  }
}
