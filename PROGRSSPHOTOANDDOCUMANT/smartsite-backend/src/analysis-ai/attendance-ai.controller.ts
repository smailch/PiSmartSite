import { BadRequestException, Controller, Param, Post, Query } from '@nestjs/common';
import { AnalysisAiService } from './analysis-ai.service';
import type { AttendanceBonusInsightsResponse } from './attendance-bonus.zod';

/**
 * Routes d’analyse IA sur le pointage (Groq).
 * Préfixe commun avec {@link AttendanceController} : `attendance`.
 */
@Controller('attendance')
export class AttendanceAiController {
  constructor(private readonly analysisAiService: AnalysisAiService) {}

  /**
   * POST /attendance/job/:jobId/ai-analysis?year=2026&month=4
   * Analyse mensuelle : points sur jours ouvrables (week-ends exclus), prime en DT.
   * Sans query : mois courant (UTC, aligné sur les dates de pointage).
   */
  @Post('job/:jobId/ai-analysis')
  async analyzeAttendanceBonuses(
    @Param('jobId') jobId: string,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
  ): Promise<AttendanceBonusInsightsResponse> {
    const now = new Date();
    const year = yearStr !== undefined && yearStr !== '' ? Number.parseInt(yearStr, 10) : now.getUTCFullYear();
    const month =
      monthStr !== undefined && monthStr !== '' ? Number.parseInt(monthStr, 10) : now.getUTCMonth() + 1;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      throw new BadRequestException('Invalid year and month parameters (month must be 1–12).');
    }
    return this.analysisAiService.generateAttendanceBonusInsights(jobId, year, month);
  }
}
