import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { AnalysisAiModule } from '../analysis-ai/analysis-ai.module';

@Module({
  imports: [ConfigModule, ProjectsModule, TasksModule, AnalysisAiModule],
  providers: [TelegramService],
})
export class TelegramModule {}
