import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AnalysisAiController } from './analysis-ai.controller';
import { AnalysisAiService } from './analysis-ai.service';
import { AnalyzeProjectDto } from './dto/analyze-project.dto';
import { AssistantInitialReportDto } from './dto/assistant-initial-report.dto';
import { ProjectAssistantChatDto } from './dto/project-assistant-chat.dto';

describe('AnalysisAiController', () => {
  const analysisPayload = {
    projectId: '507f1f77bcf86cd799439099',
    generatedAt: new Date().toISOString(),
    source: 'groq' as const,
    analysis: {
      summary: 'S',
      topRisks: [
        {
          title: 'R',
          impact: 'medium' as const,
          action: 'A',
          relatedTaskIds: [] as string[],
          relatedTasks: [] as { id: string; title: string }[],
        },
      ],
      nextActions: ['1', '2', '3'],
      budgetDelayTradeoff: {
        recommendedMode: 'equilibre' as const,
        estimatedDelayDays: 0,
        estimatedBudgetDeltaPercent: 0,
        rationale: 'r',
      },
      confidence: 0.8,
    },
  };

  it('returns 200 payload from service', async () => {
    const mockService = {
      generateInsights: jest.fn().mockResolvedValue(analysisPayload),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalysisAiController],
      providers: [{ provide: AnalysisAiService, useValue: mockService }],
    }).compile();

    const controller = module.get(AnalysisAiController);
    const body = new AnalyzeProjectDto();
    await expect(
      controller.analyzeProjectInsights('507f1f77bcf86cd799439099', body),
    ).resolves.toEqual(analysisPayload);
    expect(mockService.generateInsights).toHaveBeenCalledWith('507f1f77bcf86cd799439099');
  });

  it('returns initial report from service', async () => {
    const mockService = {
      generateInsights: jest.fn(),
      initialAssistantReport: jest.fn().mockResolvedValue({ report: '## Projet\n…' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalysisAiController],
      providers: [{ provide: AnalysisAiService, useValue: mockService }],
    }).compile();

    const controller = module.get(AnalysisAiController);
    await expect(
      controller.assistantInitialReport('507f1f77bcf86cd799439099', new AssistantInitialReportDto()),
    ).resolves.toEqual({ report: '## Projet\n…' });
    expect(mockService.initialAssistantReport).toHaveBeenCalledWith('507f1f77bcf86cd799439099');
  });

  it('returns assistant reply from service', async () => {
    const mockService = {
      generateInsights: jest.fn(),
      initialAssistantReport: jest.fn(),
      chatProject: jest.fn().mockResolvedValue({ reply: 'Voici une réponse.' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalysisAiController],
      providers: [{ provide: AnalysisAiService, useValue: mockService }],
    }).compile();

    const controller = module.get(AnalysisAiController);
    const dto = new ProjectAssistantChatDto();
    dto.messages = [{ role: 'user', content: 'Bonjour' }];
    await expect(controller.assistantChat('507f1f77bcf86cd799439099', dto)).resolves.toEqual({
      reply: 'Voici une réponse.',
    });
    expect(mockService.chatProject).toHaveBeenCalledWith('507f1f77bcf86cd799439099', dto);
  });

  it('propagates NotFoundException', async () => {
    const mockService = {
      generateInsights: jest.fn().mockRejectedValue(new NotFoundException('missing')),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalysisAiController],
      providers: [{ provide: AnalysisAiService, useValue: mockService }],
    }).compile();

    const controller = module.get(AnalysisAiController);
    await expect(
      controller.analyzeProjectInsights('507f1f77bcf86cd799439099', new AnalyzeProjectDto()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
