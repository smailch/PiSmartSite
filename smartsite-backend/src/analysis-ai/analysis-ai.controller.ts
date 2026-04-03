import { Body, Controller, Param, Post } from '@nestjs/common';
import { AnalysisAiService } from './analysis-ai.service';
import { AnalyzeProjectDto } from './dto/analyze-project.dto';
import { AssistantInitialReportDto } from './dto/assistant-initial-report.dto';
import { ProjectAssistantChatDto } from './dto/project-assistant-chat.dto';
import type { ProjectAiInsightsResponseDto } from './dto/project-ai-insights-response.dto';

@Controller('projects')
export class AnalysisAiController {
  constructor(private readonly analysisAiService: AnalysisAiService) {}

  /**
   * POST /projects/:projectId/analysis/ai-insights
   * (Si un préfixe global `api` est ajouté plus tard : /api/projects/... )
   */
  @Post(':projectId/analysis/ai-insights')
  async analyzeProjectInsights(
    @Param('projectId') projectId: string,
    @Body() _body: AnalyzeProjectDto,
  ): Promise<ProjectAiInsightsResponseDto> {
    return this.analysisAiService.generateInsights(projectId);
  }

  /** POST /projects/:projectId/analysis/assistant/initial-report — rapport projet + tâches (Groq). */
  @Post(':projectId/analysis/assistant/initial-report')
  async assistantInitialReport(
    @Param('projectId') projectId: string,
    @Body() _body: AssistantInitialReportDto,
  ): Promise<{ report: string }> {
    return this.analysisAiService.initialAssistantReport(projectId);
  }

  /** POST /projects/:projectId/analysis/assistant/chat — assistant métier (Groq, texte). */
  @Post(':projectId/analysis/assistant/chat')
  async assistantChat(
    @Param('projectId') projectId: string,
    @Body() body: ProjectAssistantChatDto,
  ): Promise<{ reply: string }> {
    return this.analysisAiService.chatProject(projectId, body);
  }
}
