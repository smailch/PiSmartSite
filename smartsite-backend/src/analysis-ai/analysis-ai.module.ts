import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysisAiController } from './analysis-ai.controller';
import { AnalysisAiService } from './analysis-ai.service';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [ConfigModule, ProjectsModule, TasksModule],
  controllers: [AnalysisAiController],
  providers: [AnalysisAiService],
})
export class AnalysisAiModule {}
