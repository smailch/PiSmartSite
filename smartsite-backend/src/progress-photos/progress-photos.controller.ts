import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProgressPhotosService } from './progress-photos.service';
import {
  CreateProgressPhotoDto,
  ValidatePhotoDto,
} from './dto/create-progress-photo.dto';
import { AiEstimationService } from './ai-estimation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from '../projects/projects.service';

type JwtUser = { sub?: string; roleName?: string };

@Controller('progress-photos')
@UseGuards(JwtAuthGuard)
export class ProgressPhotosController {
  private readonly logger = new Logger(ProgressPhotosController.name);

  constructor(
    private readonly progressPhotosService: ProgressPhotosService,
    private readonly aiEstimationService: AiEstimationService,
    private readonly projectsService: ProjectsService,
  ) {}

  private getUser(req: { user: JwtUser }): { sub: string; roleName?: string } {
    const u = req.user;
    if (!u?.sub) {
      throw new BadRequestException('Invalid authentication payload');
    }
    return { sub: String(u.sub), roleName: u.roleName };
  }

  private rejectIfClient(roleName: string | undefined) {
    if (ProjectsService.isClientRole(roleName)) {
      throw new ForbiddenException(
        'This action is not available for client accounts',
      );
    }
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/progress-photos',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `photo-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async uploadPhoto(
    @Request() req: { user: JwtUser },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    this.rejectIfClient(this.getUser(req).roleName);
    const photoUrl = `/uploads/progress-photos/${file.filename}`;

    let estimatedProgress = 0;
    try {
      estimatedProgress =
        await this.aiEstimationService.estimateProgress(photoUrl);
      this.logger.debug(`AI estimated progress: ${estimatedProgress}%`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`AI estimation failed, using 0%: ${msg}`);
    }

    const taskId =
      typeof body.taskId === 'string' && body.taskId.trim()
        ? body.taskId.trim()
        : undefined;
    const jobId =
      typeof body.jobId === 'string' && body.jobId.trim()
        ? body.jobId.trim()
        : undefined;

    return this.progressPhotosService.create({
      projectId: body.projectId,
      ...(taskId ? { taskId } : {}),
      ...(jobId ? { jobId } : {}),
      uploadedBy: body.uploadedBy,
      photoUrl: photoUrl,
      caption: body.caption,
      takenAt: body.takenAt,
      estimatedProgress: estimatedProgress,
    });
  }

  @Post()
  create(
    @Request() req: { user: JwtUser },
    @Body() createProgressPhotoDto: CreateProgressPhotoDto,
  ) {
    this.rejectIfClient(this.getUser(req).roleName);
    return this.progressPhotosService.create(createProgressPhotoDto);
  }

  @Get()
  findAll(@Request() req: { user: JwtUser }) {
    return this.progressPhotosService.findAllForRequestUser(this.getUser(req));
  }

  @Get('pending')
  findPending(@Request() req: { user: JwtUser }) {
    this.rejectIfClient(this.getUser(req).roleName);
    return this.progressPhotosService.findPending();
  }

  @Get('project/:projectId')
  findByProject(
    @Request() req: { user: JwtUser },
    @Param('projectId') projectId: string,
  ) {
    return this.progressPhotosService.findByProjectForRequestUser(
      this.getUser(req),
      projectId,
    );
  }

  @Get('project/:projectId/approved')
  findApprovedByProject(
    @Request() req: { user: JwtUser },
    @Param('projectId') projectId: string,
  ) {
    return this.progressPhotosService.findApprovedByProjectForRequestUser(
      this.getUser(req),
      projectId,
    );
  }

  @Get('project/:projectId/latest-progress')
  getLatestProgress(
    @Request() req: { user: JwtUser },
    @Param('projectId') projectId: string,
  ) {
    return this.progressPhotosService.getLatestProgressForRequestUser(
      this.getUser(req),
      projectId,
    );
  }

  @Get(':id')
  async findOne(@Request() req: { user: JwtUser }, @Param('id') id: string) {
    const photo = await this.progressPhotosService.findOne(id);
    await this.projectsService.assertRequestCanAccessProject(
      this.getUser(req),
      String(photo.projectId),
    );
    return photo;
  }

  @Patch(':id/validate')
  validate(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() validatePhotoDto: ValidatePhotoDto,
  ) {
    this.rejectIfClient(this.getUser(req).roleName);
    return this.progressPhotosService.validate(id, validatePhotoDto);
  }

  @Patch(':id')
  async update(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() updateData: { caption?: string; estimatedProgress?: number },
  ) {
    this.rejectIfClient(this.getUser(req).roleName);
    return this.progressPhotosService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Request() req: { user: JwtUser }, @Param('id') id: string) {
    this.rejectIfClient(this.getUser(req).roleName);
    return this.progressPhotosService.remove(id);
  }
}
