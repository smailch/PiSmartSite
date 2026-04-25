import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProgressPhotosController } from './progress-photos.controller';
import { ProgressPhotosService } from './progress-photos.service';
import { ProgressPhoto, ProgressPhotoSchema } from './progress-photos.schema';
import { AiEstimationService } from './ai-estimation.service';
import { ProjectsModule } from '../projects/projects.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    forwardRef(() => ProjectsModule),
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      { name: ProgressPhoto.name, schema: ProgressPhotoSchema },
    ]),
  ],
  controllers: [ProgressPhotosController],
  providers: [ProgressPhotosService, AiEstimationService],
  
})
export class ProgressPhotosModule {}
