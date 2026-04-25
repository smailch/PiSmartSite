import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysisAiController } from './analysis-ai.controller';
import { AttendanceAiController } from './attendance-ai.controller';
import { AnalysisAiService } from './analysis-ai.service';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [ConfigModule, ProjectsModule, TasksModule, AttendanceModule, JobsModule],
  controllers: [AnalysisAiController, AttendanceAiController],
  providers: [AnalysisAiService],
  exports: [AnalysisAiService],
})
export class AnalysisAiModule {}
