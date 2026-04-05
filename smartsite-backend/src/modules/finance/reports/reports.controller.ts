import { Controller, Get, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('project/:projectId')
  getProjectSummary(@Param('projectId') projectId: string) {
    return this.reportsService.getProjectFinancialSummary(projectId);
  }
}