import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource, ResourceDocument } from './schemas/resource.schema';
import { CreateResourceDto } from './dto/create-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectModel(Resource.name)
    private readonly resourceModel: Model<ResourceDocument>,
  ) {}

  async create(dto: CreateResourceDto): Promise<Resource> {
    return this.resourceModel.create(dto);
  }

  async findAll(): Promise<Resource[]> {
    return this.resourceModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Resource> {
    const resource = await this.resourceModel.findById(id).exec();
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }
    return resource;
  }

  async update(id: string, dto: Partial<CreateResourceDto>): Promise<Resource> {
    const resource = await this.resourceModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    return resource;
  }

  async remove(id: string): Promise<void> {
    const result = await this.resourceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Resource not found');
    }
  }
}
