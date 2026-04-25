import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  // GET /audit-logs → tous les logs
  @Get()
  findAll(@Query('suspicious') suspicious?: string) {
    return this.auditLogService.findAll(suspicious === 'true');
  }

  // GET /audit-logs/unread-count → nombre d'alertes non lues
  @Get('unread-count')
  countUnread() {
    return this.auditLogService.countUnreadSuspicious();
  }

  // GET /audit-logs/ai-summary → résumé IA Groq
  @Get('ai-summary')
  getAiSummary() {
    return this.auditLogService.getAiSummary();
  }

  // PATCH /audit-logs/mark-all-read → marquer tout comme lu
  @Patch('mark-all-read')
  markAllAsRead() {
    return this.auditLogService.markAllAsRead();
  }

  // PATCH /audit-logs/:id/read → marquer un seul comme lu
  @Patch(':id/read')
  markOneAsRead(@Param('id') id: string) {
    return this.auditLogService.markOneAsRead(id);
  }
}
