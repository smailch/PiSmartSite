import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProgressPhotosService } from './progress-photos.service';
import { CreateProgressPhotoDto, ValidatePhotoDto } from './dto/create-progress-photo.dto';
import { AiEstimationService } from './ai-estimation.service';

@Controller('progress-photos')
export class ProgressPhotosController {
  constructor(private readonly progressPhotosService: ProgressPhotosService,
     private readonly aiEstimationService: AiEstimationService,
  ) {}

 
   // NEW: Upload photo with file
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/progress-photos',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `photo-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
    }),
  )
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    // Construct the URL for the uploaded file
    const photoUrl = `/uploads/progress-photos/${file.filename}`;

     let estimatedProgress = 0;
    
    try {
      estimatedProgress = await this.aiEstimationService.estimateProgress(photoUrl);
      console.log(`AI estimated progress: ${estimatedProgress}%`);
    } catch (error) {
      console.error('AI estimation failed, using 0%', error);
    }

    // Create the progress photo in the database
    return this.progressPhotosService.create({
      projectId: body.projectId,
      uploadedBy: body.uploadedBy,
      photoUrl: photoUrl,
      caption: body.caption,
      takenAt: body.takenAt,
     estimatedProgress: estimatedProgress, // IA automatique
      
    });
  }
 
  // POST /progress-photos
  @Post()
  create(@Body() createProgressPhotoDto: CreateProgressPhotoDto) {
    return this.progressPhotosService.create(createProgressPhotoDto);
  }

  // GET /progress-photos
  @Get()
  findAll() {
    return this.progressPhotosService.findAll();
  }

  // GET /progress-photos/pending  ← pour le superviseur
  @Get('pending')
  findPending() {
    return this.progressPhotosService.findPending();
  }

  // GET /progress-photos/project/:projectId
  @Get('project/:projectId')
  findByProject(@Param('projectId') projectId: string) {
    return this.progressPhotosService.findByProject(projectId);
  }

  // GET /progress-photos/project/:projectId/approved  ← pour le client
  @Get('project/:projectId/approved')
  findApprovedByProject(@Param('projectId') projectId: string) {
    return this.progressPhotosService.findApprovedByProject(projectId);
  }

  // GET /progress-photos/project/:projectId/latest-progress
  @Get('project/:projectId/latest-progress')
  getLatestProgress(@Param('projectId') projectId: string) {
    return this.progressPhotosService.getLatestProgress(projectId);
  }

  // GET /progress-photos/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.progressPhotosService.findOne(id);
  }

  // PATCH /progress-photos/:id/validate  ← superviseur valide ou rejette
  @Patch(':id/validate')
  validate(@Param('id') id: string, @Body() validatePhotoDto: ValidatePhotoDto) {
    return this.progressPhotosService.validate(id, validatePhotoDto);
  }

  // PATCH /progress-photos/:id - Update caption or estimated progress
@Patch(':id')
async update(
  @Param('id') id: string,
  @Body() updateData: { caption?: string; estimatedProgress?: number },
) {
  return this.progressPhotosService.update(id, updateData);
}

  // DELETE /progress-photos/:id
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.progressPhotosService.remove(id);
  }
}
