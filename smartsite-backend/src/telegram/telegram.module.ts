import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { AnalysisAiModule } from '../analysis-ai/analysis-ai.module';

@Module({
  imports: [ProjectsModule, TasksModule, AnalysisAiModule],
  providers: [TelegramService],
})
export class TelegramModule {}
