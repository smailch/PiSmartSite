import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  BadRequestException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type JwtUser = { sub?: string; roleName?: string };

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  private getUser(req: { user: JwtUser }): { sub: string; roleName?: string } {
    const u = req.user;
    if (!u?.sub) {
      throw new BadRequestException('Invalid authentication payload');
    }
    return { sub: String(u.sub), roleName: u.roleName };
  }

  @Post()
  create(
    @Request() req: { user: JwtUser },
    @Body() createProjectDto: CreateProjectDto,
  ) {
    if (ProjectsService.isClientRole(this.getUser(req).roleName)) {
      throw new ForbiddenException('Clients cannot create projects');
    }
    if (!createProjectDto.startDate) {
      createProjectDto.startDate = new Date();
    }
    if (!createProjectDto.endDate) {
      createProjectDto.endDate = undefined;
    }
    if (!createProjectDto.createdBy) {
      throw new BadRequestException('Le champ createdBy est obligatoire');
    }
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  findAll(@Request() req: { user: JwtUser }) {
    return this.projectsService.findAllForRequestUser(this.getUser(req));
  }

  @Get(':id')
  async findOne(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
  ) {
    await this.projectsService.assertRequestCanAccessProject(this.getUser(req), id);
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    if (ProjectsService.isClientRole(this.getUser(req).roleName)) {
      throw new ForbiddenException('Clients cannot update projects');
    }
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  remove(@Request() req: { user: JwtUser }, @Param('id') id: string) {
    if (ProjectsService.isClientRole(this.getUser(req).roleName)) {
      throw new ForbiddenException('Clients cannot delete projects');
    }
    return this.projectsService.remove(id);
  }
}
