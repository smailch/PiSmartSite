import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, ProjectDocument } from './schemas/project.schema';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private readonly tasksService: TasksService,
  ) {}

  private assertValidObjectId(id: string, fieldName: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`${fieldName} must be a valid MongoDB ObjectId`);
    }
  }

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const newProject = new this.projectModel(createProjectDto);
    return newProject.save();
  }

  async findAll(): Promise<Project[]> {
    const projects = await this.projectModel.find().exec();
    return projects.map(project => ({
      ...project.toObject(),
      startDate: project.startDate || null,
      endDate: project.endDate || null,
      spentBudget: project.spentBudget ?? 0,
    }));
  }

  async findOne(id: string): Promise<Project> {
    this.assertValidObjectId(id, 'id');
    const project = await this.projectModel.findById(id).exec();
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    // toObject() garantit que spentBudget (default: 0) est toujours inclus,
    // même sur des documents antérieurs à l'ajout du champ.
    return {
      ...project.toObject(),
      spentBudget: project.spentBudget ?? 0,
    } as unknown as Project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    this.assertValidObjectId(id, 'id');
    // $set explicite : ne jamais écraser spentBudget (calculé côté TasksService).
    const updatedProject = await this.projectModel
      .findByIdAndUpdate(id, { $set: updateProjectDto }, { new: true })
      .exec();
    if (!updatedProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    if (updateProjectDto.status === 'Terminé') {
      await this.tasksService.markAllTasksCompletedForProject(id);
    }
    return updatedProject;
  }

  async remove(id: string): Promise<Project> {
    this.assertValidObjectId(id, 'id');

    const existingProject = await this.projectModel.findById(id).exec();
    if (!existingProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Cascade delete explicite des tâches liées au projet.
    await this.tasksService.deleteByProjectId(id);

    const deletedProject = await this.projectModel.findByIdAndDelete(id).exec();
    if (!deletedProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return deletedProject;
  }
}