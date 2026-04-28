import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProjectDocument, DocumentDocument } from './documents.schema';
import {
  DocumentVersion,
  DocumentVersionDocument,
} from './document-versions.schema';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  AddVersionDto,
} from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(ProjectDocument.name)
    private documentModel: Model<DocumentDocument>,
    @InjectModel(DocumentVersion.name)
    private versionModel: Model<DocumentVersionDocument>,
  ) {}

  // ─── CRUD Documents ───────────────────────────────────────────

  async create(createDocumentDto: CreateDocumentDto): Promise<ProjectDocument> {
    const newDocument = new this.documentModel(createDocumentDto);
    return newDocument.save();
  }

  async findAll(): Promise<ProjectDocument[]> {
    return this.documentModel.find({ isActive: true }).exec();
  }

  async findByProject(projectId: string): Promise<ProjectDocument[]> {
    return this.documentModel.find({ projectId, isActive: true }).exec();
  }

  async search(query: string): Promise<ProjectDocument[]> {
    return this.documentModel
      .find({
        isActive: true,
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } },
          { aiSummary: { $regex: query, $options: 'i' } },
        ],
      })
      .exec();
  }

  async findOne(id: string): Promise<ProjectDocument> {
    const document = await this.documentModel.findById(id).exec();
    if (!document) throw new NotFoundException(`Document #${id} not found`);
    return document;
  }

  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
  ): Promise<ProjectDocument> {
    const updated = await this.documentModel
      .findByIdAndUpdate(id, updateDocumentDto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Document #${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<ProjectDocument> {
    // Soft delete : on désactive le document
    const deleted = await this.documentModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();
    if (!deleted) throw new NotFoundException(`Document #${id} not found`);
    return deleted;
  }

  // ─── Gestion des versions ─────────────────────────────────────

  async addVersion(
    documentId: string,
    addVersionDto: AddVersionDto,
  ): Promise<DocumentVersion> {
    const document = await this.findOne(documentId);

    // Incrémenter le numéro de version
    const newVersionNumber = document.currentVersion + 1;
    await this.documentModel.findByIdAndUpdate(documentId, {
      currentVersion: newVersionNumber,
      fileUrl: addVersionDto.fileUrl, // mettre à jour l'URL du fichier courant
    });

    // Enregistrer la nouvelle version
    const version = new this.versionModel({
      documentId,
      versionNumber: newVersionNumber,
      fileUrl: addVersionDto.fileUrl,
      uploadedBy: addVersionDto.uploadedBy,
      changeNote: addVersionDto.changeNote,
    });

    return version.save();
  }

  async getVersions(documentId: string): Promise<DocumentVersion[]> {
    return this.versionModel
      .find({ documentId })
      .sort({ versionNumber: -1 })
      .exec();
  }
}
