import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from '../schemas/project.schema';

@Injectable()
export class AddStartEndDatesMigration {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  async migrate() {
    const projects = await this.projectModel.find({}).exec();
    for (const project of projects) {
      if (!project.startDate) {
        project.startDate = project.createdAt || null;
      }
      if (!project.endDate) {
        project.endDate = null;
      }
      await project.save();
    }
    console.log('Migration completed: start_date and end_date added to all projects.');
  }
}