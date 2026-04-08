import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ===============================
  // 📊 BASIC SUMMARY
  // ===============================
  @Get('project/:projectId')
  getProjectSummary(@Param('projectId') projectId: string) {
    return this.reportsService.getProjectFinancialSummary(projectId);
  }

  // ===============================
  // 🤖 AI REPORT
  // ===============================
  @Get('project/:projectId/ai')
  getAIReport(@Param('projectId') projectId: string) {
    return this.reportsService.getAIReport(projectId);
  }

  // ===============================
  // 📄 PDF DOWNLOAD
  // ===============================
  @Get('project/:projectId/pdf')
  async getPdf(
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportsService.generatePdf(projectId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=report-${projectId}.pdf`,
    );

    res.send(pdfBuffer);
  }
}