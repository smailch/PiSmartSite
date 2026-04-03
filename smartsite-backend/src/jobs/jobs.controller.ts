import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './create-job.dto';
import { UpdateJobDto } from './update-job.dto';
import { Job } from './jobs.schema';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ✅ CREATE
  @Post()
  async create(@Body() createJobDto: CreateJobDto): Promise<Job> {
    return this.jobsService.create(createJobDto);
  }

  // ✅ READ ALL
  @Get()
  async findAll(): Promise<Job[]> {
    return this.jobsService.findAll();
  }

  // ✅ READ ONE
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Job> {
    return this.jobsService.findOne(id);
  }

  // ✅ UPDATE
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
  ): Promise<Job> {
    return this.jobsService.update(id, updateJobDto);
  }

  // ✅ DELETE
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.jobsService.remove(id);
    return { message: 'Job deleted successfully' };
  }
}
