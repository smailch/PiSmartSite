import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { join } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobsService } from './jobs.service';
import { AiAnalysisService } from './ai-analysis.service';
import { CreateJobDto } from './create-job.dto';
import { UpdateJobDto } from './update-job.dto';
import { UpdateJobProgressDto } from './dto/update-job-progress.dto';
import { Job } from './jobs.schema';
import { progressMulterOptions, PROGRESS_UPLOAD_DIR } from './multer-progress.config';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly aiAnalysisService: AiAnalysisService,
  ) {}

  @Post()
  async create(@Body() createJobDto: CreateJobDto): Promise<Job> {
    return this.jobsService.create(createJobDto);
  }

  @Get()
  async findAll(): Promise<
    (Job & { progressPercentage: number; assignedResources?: unknown })[]
  > {
    return this.jobsService.findAll();
  }

  @Get(':id/progress')
  async getProgress(@Param('id') id: string) {
    return this.jobsService.getJobProgress(id);
  }

  @Put(':id/progress')
  async putProgress(
    @Param('id') id: string,
    @Body() dto: UpdateJobProgressDto,
  ) {
    return this.jobsService.updateJobProgress(id, dto);
  }

  @Post(':id/progress/photo')
  @UseInterceptors(FileInterceptor('file', progressMulterOptions))
  async uploadProgressPhoto(
    @Param('id') id: string,
    @Query('stepIndex', ParseIntPipe) stepIndex: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file?.filename) {
      throw new BadRequestException('Image file is required');
    }
    const absolutePath = join(PROGRESS_UPLOAD_DIR, file.filename);
    const aiAnalysis = await this.aiAnalysisService.analyzeImageFile(
      absolutePath,
      file.originalname,
    );

    const relative = `/uploads/progress/${file.filename}`;
    const host = req.get('host') ?? `localhost:${3200}`;
    const protocol = req.protocol;
    const photoUrl = `${protocol}://${host}${relative}`;

    return this.jobsService.uploadProgressPhoto(id, stepIndex, photoUrl, aiAnalysis);
  }

  @Delete(':id/progress/photo')
  async deleteProgressPhoto(
    @Param('id') id: string,
    @Query('stepIndex', ParseIntPipe) stepIndex: number,
  ) {
    return this.jobsService.removeProgressPhoto(id, stepIndex);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Job> {
    return this.jobsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
  ): Promise<Job> {
    return this.jobsService.update(id, updateJobDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.jobsService.remove(id);
    return { message: 'Job deleted successfully' };
  }
}
