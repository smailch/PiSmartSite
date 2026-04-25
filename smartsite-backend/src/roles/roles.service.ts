import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Role, RoleDocument } from './roles.schema';
import { Model } from 'mongoose';

/** Rôles métier attendus par l’app (noms stables pour JWT / contrôles d’accès). */
const DEFAULT_ROLES: { name: string; permissions: string[] }[] = [
  { name: 'Admin', permissions: ['*'] },
  { name: 'Client', permissions: [] },
  { name: 'Project Manager', permissions: [] },
  { name: 'Site Engineer', permissions: [] },
  { name: 'Financier', permissions: [] },
  { name: 'Director', permissions: [] },
];

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,
  ) {}

  async onModuleInit() {
    for (const r of DEFAULT_ROLES) {
      const exists = await this.roleModel.findOne({ name: r.name });
      if (!exists) {
        await this.roleModel.create({
          name: r.name,
          permissions: r.permissions,
        });
        this.logger.log(`Rôle créé : ${r.name}`);
      }
    }
  }

  async create(data: any) {
    const role = new this.roleModel(data);
    return role.save();
  }

  async findAll() {
    return this.roleModel.find();
  }
}