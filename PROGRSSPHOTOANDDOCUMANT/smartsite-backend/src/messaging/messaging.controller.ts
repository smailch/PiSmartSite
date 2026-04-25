import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ── Client pose une question ──────────────────────────────────
  // POST /messaging/ask
  @Post('ask')
  async askQuestion(
    @Request() req,
    @Body() body: {
      question: string;
      conversationId: string;
      sessionHistory: Array<{ role: string; content: string }>;
    },
  ) {
    return this.messagingService.askQuestion(
      req.user.sub,
      req.user.fullName,
      body.question,
      body.conversationId,
      body.sessionHistory || [],
    );
  }

  // ── Director voit toutes les conversations ────────────────────
  // GET /messaging/conversations
  @Get('conversations')
  getAllConversations() {
    return this.messagingService.getAllConversations();
  }

  // ── Director répond ───────────────────────────────────────────
  // POST /messaging/reply/:conversationId
  @Post('reply/:conversationId')
  directorReply(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body('content') content: string,
  ) {
    return this.messagingService.directorReply(
      conversationId,
      req.user.sub,
      req.user.fullName,
      content,
    );
  }

  // ── Client récupère sa conversation ──────────────────────────
  // GET /messaging/my-conversation/:conversationId
  @Get('my-conversation/:conversationId')
  getClientConversation(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagingService.getClientConversation(req.user.sub, conversationId);
  }

  // ── Vérifier réponse Director ─────────────────────────────────
  // GET /messaging/check-reply/:conversationId
  @Get('check-reply/:conversationId')
  checkDirectorReply(@Param('conversationId') conversationId: string) {
    return this.messagingService.checkDirectorReply(conversationId);
  }
}