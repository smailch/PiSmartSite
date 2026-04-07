import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Human, HumanDocument } from './schemas/human.schema';
import { CreateHumanDto } from './dto/create-human.dto';
import { UpdateHumanDto } from './dto/update-human.dto';

@Injectable()
export class HumanResourcesService {
  constructor(
    @InjectModel(Human.name)
    private humanModel: Model<HumanDocument>,
  ) {}

  async create(createHumanDto: CreateHumanDto): Promise<Human> {
    const created = new this.humanModel(createHumanDto);
    return created.save();
  }

  async findAll(role?: string): Promise<Human[]> {
    const q = role?.trim();
    if (q) {
      return this.humanModel.find({ role: q }).exec();
    }
    return this.humanModel.find().exec();
  }

  async findOne(id: string): Promise<Human> {
    const human = await this.humanModel.findById(id);
    if (!human) throw new NotFoundException('Human not found');
    return human;
  }

  async update(id: string, updateHumanDto: UpdateHumanDto): Promise<Human> {
    const updated = await this.humanModel.findByIdAndUpdate(
      id,
      updateHumanDto,
      { new: true },
    );
    if (!updated) throw new NotFoundException('Human not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.humanModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Human not found');
  }
}
