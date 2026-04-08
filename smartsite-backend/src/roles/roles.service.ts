import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Role, RoleDocument } from './roles.schema';
import { Model } from 'mongoose';

@Injectable()
export class RolesService {

  constructor(
    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,
  ) {}

  async create(data: any) {
    const role = new this.roleModel(data);
    return role.save();
  }

  async findAll() {
    return this.roleModel.find();
  }
}