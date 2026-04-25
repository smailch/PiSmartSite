import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { BadRequestException } from '@nestjs/common';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() createProjectDto: CreateProjectDto) {
    // Ensure start_date and end_date are initialized if not provided
    if (!createProjectDto.startDate) {
      createProjectDto.startDate = new Date();
    }
    if (!createProjectDto.endDate) {
      createProjectDto.endDate = undefined;
    }

    // Validate createdBy explicitly
    if (!createProjectDto.createdBy) {
      throw new BadRequestException('Le champ createdBy est obligatoire');
    }

    // Ensure all fields are validated and passed to the service
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  findAll() {
    // Return all projects with their new fields
    return this.projectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Fetch a single project by ID, including new fields
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    // Update a project with the new fields
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // Remove a project by ID
    return this.projectsService.remove(id);
  }
}