import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Human, HumanDocument } from './schemas/human.schema';

@Injectable()
export class HumansService {
  constructor(
    @InjectModel(Human.name) private humanModel: Model<HumanDocument>,
  ) {}

  async findAll(role?: string): Promise<HumanDocument[]> {
    const filter = role ? { role } : {};
    return this.humanModel.find(filter).exec();
  }

  async findOne(id: string): Promise<HumanDocument | null> {
    return this.humanModel.findById(id).exec();
  }
}
