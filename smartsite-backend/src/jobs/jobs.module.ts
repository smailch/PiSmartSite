import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { AiAnalysisService } from './ai-analysis.service';
import { Job, JobSchema } from './jobs.schema';
import { JobProgress, JobProgressSchema } from './schemas/job-progress.schema';
import { Resource, ResourceSchema } from '../resources/schemas/resource.schema';
import { Human, HumanSchema } from '../human-resources/schemas/human.schema';
import { Equipment, EquipmentSchema } from '../equipment-resources/schemas/equipment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: JobProgress.name, schema: JobProgressSchema },
      { name: Resource.name, schema: ResourceSchema },
      { name: Equipment.name, schema: EquipmentSchema },
      { name: Human.name, schema: HumanSchema },
    ]),
  ],
  controllers: [JobsController],
  providers: [JobsService, AiAnalysisService],
})
export class JobsModule {}