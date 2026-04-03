import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Equipment, EquipmentDocument } from './schemas/equipment.schema';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectModel(Equipment.name)
    private equipmentModel: Model<EquipmentDocument>,
  ) {}

  async create(dto: CreateEquipmentDto): Promise<Equipment> {
    return new this.equipmentModel(dto).save();
  }

  async findAll(): Promise<Equipment[]> {
    return this.equipmentModel.find().exec();
  }

  async findOne(id: string): Promise<Equipment> {
    const equipment = await this.equipmentModel.findById(id);
    if (!equipment) throw new NotFoundException('Equipment not found');
    return equipment;
  }

  async update(id: string, dto: UpdateEquipmentDto): Promise<Equipment> {
    const updated = await this.equipmentModel.findByIdAndUpdate(
      id,
      dto,
      { new: true },
    );
    if (!updated) throw new NotFoundException('Equipment not found');
    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    const deleted = await this.equipmentModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Equipment not found');
    return { message: 'Equipment deleted successfully' };
  }
}
