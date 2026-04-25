import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, ProjectDocument } from './schemas/project.schema';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private readonly tasksService: TasksService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  private assertValidObjectId(id: string, fieldName: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`${fieldName} must be a valid MongoDB ObjectId`);
    }
  }

  static isClientRole(roleName?: string): boolean {
    return String(roleName ?? '').trim() === 'Client';
  }

  /**
   * Liste : pour le rôle Client, uniquement les projets dont il est le `clientId`.
   */
  async findAllForRequestUser(u: { sub: string; roleName?: string }): Promise<Project[]> {
    if (ProjectsService.isClientRole(u.roleName)) {
      return this.findAllByClientId(u.sub);
    }
    return this.findAll();
  }

  async findAllByClientId(clientUserId: string): Promise<Project[]> {
    this.assertValidObjectId(clientUserId, 'clientUserId');
    const projects = await this.projectModel
      .find({ clientId: clientUserId } as Record<string, unknown>)
      .exec();
    return projects.map(
      (project) => this.mapProject(project) as unknown as Project,
    );
  }

  /**
   * Un client ne peut accéder qu’à ses projets (clientId = sub JWT).
   */
  async assertRequestCanAccessProject(
    u: { sub: string; roleName?: string },
    projectId: string,
  ): Promise<Project> {
    this.assertValidObjectId(projectId, 'id');
    const p = await this.projectModel.findById(projectId).exec();
    if (!p) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
    if (ProjectsService.isClientRole(u.roleName)) {
      if (!p.clientId || String(p.clientId) !== String(u.sub)) {
        throw new ForbiddenException('Access denied to this project');
      }
    }
    return { ...this.mapProject(p) } as unknown as Project;
  }

  private mapProject(
    project: ProjectDocument,
  ) {
    return {
      ...project.toObject(),
      startDate: project.startDate || null,
      endDate: project.endDate || null,
      spentBudget: project.spentBudget ?? 0,
    };
  }

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const newProject = new this.projectModel(createProjectDto);
    const saved = await newProject.save();
    if (saved.clientId) {
      await this.usersService.addUserProjectId(String(saved.clientId), String(saved._id));
    }
    return this.mapProject(saved) as unknown as Project;
  }

  async findAll(): Promise<Project[]> {
    const projects = await this.projectModel.find().exec();
    return projects.map(
      (project) => this.mapProject(project) as unknown as Project,
    );
  }

  async findOne(id: string): Promise<Project> {
    this.assertValidObjectId(id, 'id');
    const project = await this.projectModel.findById(id).exec();
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return {
      ...this.mapProject(project),
    } as unknown as Project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    this.assertValidObjectId(id, 'id');
    const existing = await this.projectModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    const oldClientId = existing.clientId ? String(existing.clientId) : null;

    const updatedProject = await this.projectModel
      .findByIdAndUpdate(id, { $set: updateProjectDto }, { new: true })
      .exec();
    if (!updatedProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const newClientId = updatedProject.clientId
      ? String(updatedProject.clientId)
      : null;
    if (oldClientId !== newClientId) {
      if (oldClientId) {
        await this.usersService.removeUserProjectId(oldClientId, id);
      }
      if (newClientId) {
        await this.usersService.addUserProjectId(newClientId, id);
      }
    }

    if (updateProjectDto.status === 'Terminé') {
      await this.tasksService.markAllTasksCompletedForProject(id);
    }
    return {
      ...this.mapProject(updatedProject),
    } as unknown as Project;
  }

  async remove(id: string): Promise<Project> {
    this.assertValidObjectId(id, 'id');

    const existingProject = await this.projectModel.findById(id).exec();
    if (!existingProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    if (existingProject.clientId) {
      await this.usersService.removeUserProjectId(
        String(existingProject.clientId),
        id,
      );
    }

    await this.tasksService.deleteByProjectId(id);

    const deletedProject = await this.projectModel.findByIdAndDelete(id).exec();
    if (!deletedProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return {
      ...this.mapProject(deletedProject),
    } as unknown as Project;
  }
}
