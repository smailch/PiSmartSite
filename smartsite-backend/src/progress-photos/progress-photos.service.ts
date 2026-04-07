import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProgressPhoto, ProgressPhotoDocument } from './progress-photos.schema';
import { CreateProgressPhotoDto, ValidatePhotoDto } from './dto/create-progress-photo.dto';

@Injectable()
export class ProgressPhotosService {
  constructor(
    @InjectModel(ProgressPhoto.name)
    private progressPhotoModel: Model<ProgressPhotoDocument>,
  ) {}

  // POST — Upload une photo
  async create(createProgressPhotoDto: CreateProgressPhotoDto): Promise<ProgressPhoto> {
    const newPhoto = new this.progressPhotoModel(createProgressPhotoDto);
    return newPhoto.save();
  }

  // GET — Toutes les photos
  async findAll(): Promise<ProgressPhoto[]> {
    return this.progressPhotoModel.find().sort({ createdAt: -1 }).exec();
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
