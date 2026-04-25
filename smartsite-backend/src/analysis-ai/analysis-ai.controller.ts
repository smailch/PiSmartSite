import { Body, Controller, Param, Post, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { AnalysisAiService } from './analysis-ai.service';
import { AnalyzeProjectDto } from './dto/analyze-project.dto';
import { AssistantInitialReportDto } from './dto/assistant-initial-report.dto';
import { ProjectAssistantChatDto } from './dto/project-assistant-chat.dto';
import type { ProjectAiInsightsResponseDto } from './dto/project-ai-insights-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from '../projects/projects.service';

type JwtUser = { sub?: string; roleName?: string };

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class AnalysisAiController {
  constructor(
    private readonly analysisAiService: AnalysisAiService,
    private readonly projectsService: ProjectsService,
  ) {}

  private getUser(req: { user: JwtUser }): { sub: string; roleName?: string } {
    const u = req.user;
    if (!u?.sub) {
      throw new BadRequestException('Invalid authentication payload');
    }
    return { sub: String(u.sub), roleName: u.roleName };
  }

  @Post(':projectId/analysis/ai-insights')
  async analyzeProjectInsights(
    @Request() req: { user: JwtUser },
    @Param('projectId') projectId: string,
    @Body() _body: AnalyzeProjectDto,
  ): Promise<ProjectAiInsightsResponseDto> {
    await this.projectsService.assertRequestCanAccessProject(this.getUser(req), projectId);
    return this.analysisAiService.generateInsights(projectId);
  }

  @Post(':projectId/analysis/assistant/initial-report')
  async assistantInitialReport(
    @Request() req: { user: JwtUser },
    @Param('projectId') projectId: string,
    @Body() _body: AssistantInitialReportDto,
  ): Promise<{ report: string }> {
    await this.projectsService.assertRequestCanAccessProject(this.getUser(req), projectId);
    return this.analysisAiService.initialAssistantReport(projectId);
  }

  @Post(':projectId/analysis/assistant/chat')
  async assistantChat(
    @Request() req: { user: JwtUser },
    @Param('projectId') projectId: string,
    @Body() body: ProjectAssistantChatDto,
  ): Promise<{ reply: string }> {
    await this.projectsService.assertRequestCanAccessProject(this.getUser(req), projectId);
    return this.analysisAiService.chatProject(projectId, body);
  }
}
