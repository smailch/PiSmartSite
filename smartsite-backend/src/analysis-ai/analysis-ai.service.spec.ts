import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AnalysisAiService } from './analysis-ai.service';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';

describe('AnalysisAiService', () => {
  const mockProjects = { findOne: jest.fn() };
  const mockTasks = { findByProject: jest.fn() };
  const mockConfig = {
    getOrThrow: jest.fn((key: string): string => {
      if (key === 'GROQ_API_KEY') return 'test-key';
      return '';
    }),
    get: jest.fn(<T>(key: string, defaultValue?: T): T | string | number => {
      if (key === 'GROQ_MODEL') return 'llama-3.1-8b-instant';
      if (key === 'GROQ_TIMEOUT_MS') return 5000;
      return defaultValue as T;
    }),
  };

  let service: AnalysisAiService;

  const project = {
    name: 'Projet test',
    description: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    status: 'En cours',
    type: 'Construction',
    budget: 1000,
    spentBudget: 1000,
    location: 'X',
    createdBy: '507f1f77bcf86cd799439011',
  };

  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisAiService,
        { provide: ProjectsService, useValue: mockProjects },
        { provide: TasksService, useValue: mockTasks },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(AnalysisAiService);
    mockProjects.findOne.mockResolvedValue(project);
    mockTasks.findByProject.mockResolvedValue([]);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns groq analysis when JSON valid', async () => {
    const valid = {
      summary: 'Synthèse',
      topRisks: [{ title: 'R', impact: 'high' as const, action: 'A' }],
      nextActions: ['a', 'b', 'c'],
      budgetDelayTradeoff: {
        recommendedMode: 'equilibre' as const,
        estimatedDelayDays: 0,
        estimatedBudgetDeltaPercent: 0,
        rationale: 'x',
      },
      confidence: 0.9,
    };
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(valid) } }],
      }),
    } as unknown as Response);

    const r = await service.generateInsights('507f1f77bcf86cd799439099');
    expect(r.source).toBe('groq');
    expect(r.analysis.summary).toBe('Synthèse');
    expect(r.projectId).toBe('507f1f77bcf86cd799439099');
    expect(r.analysis.topRisks[0].relatedTaskIds).toEqual([]);
    expect(r.analysis.topRisks[0].relatedTasks).toEqual([]);
  });

  it('filtre relatedTaskIds Groq aux tâches du projet', async () => {
    const taskDoc = {
      _id: '507f1f77bcf86cd7994390aa',
      title: 'T1',
      status: 'En cours',
      priority: 'MEDIUM',
      progress: 10,
      duration: 1,
      dependsOn: [],
    };
    mockTasks.findByProject.mockResolvedValue([taskDoc]);

    const valid = {
      summary: 'Synthèse',
      topRisks: [
        {
          title: 'R',
          impact: 'high' as const,
          action: 'A',
          relatedTaskIds: ['507f1f77bcf86cd7994390aa', 'ffffffffffffffffffffffff'],
        },
      ],
      nextActions: ['a', 'b', 'c'],
      budgetDelayTradeoff: {
        recommendedMode: 'equilibre' as const,
        estimatedDelayDays: 0,
        estimatedBudgetDeltaPercent: 0,
        rationale: 'x',
      },
      confidence: 0.9,
    };
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(valid) } }],
      }),
    } as unknown as Response);

    const r = await service.generateInsights('507f1f77bcf86cd799439099');
    expect(r.analysis.topRisks[0].relatedTaskIds).toEqual(['507f1f77bcf86cd7994390aa']);
    expect(r.analysis.topRisks[0].relatedTasks).toEqual([
      { id: '507f1f77bcf86cd7994390aa', title: 'T1' },
    ]);
  });

  it('uses fallback when model output is not valid JSON', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'not-json-at-all' } }],
      }),
    } as unknown as Response);

    const r = await service.generateInsights('507f1f77bcf86cd799439099');
    expect(r.source).toBe('fallback');
    expect(r.analysis.confidence).toBe(0.38);
  });

  it('throws HttpException 429 on Groq rate limit', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as unknown as Response);

    let caught: unknown;
    try {
      await service.generateInsights('507f1f77bcf86cd799439099');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(HttpException);
    expect((caught as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('throws BadGatewayException after invalid JSON from Groq error responses handled', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as unknown as Response);

    await expect(service.generateInsights('507f1f77bcf86cd799439099')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('throws UnauthorizedException on 401', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as unknown as Response);

    await expect(service.generateInsights('507f1f77bcf86cd799439099')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('cas 5: écrase les chiffres erronés du LLM par les métriques backend', async () => {
    const p = {
      ...project,
      budget: 50000,
      spentBudget: 56000,
      endDate: null as Date | null,
    };
    mockProjects.findOne.mockResolvedValue(p);

    const badFromModel = {
      summary: 'Synthèse',
      topRisks: [{ title: 'R', impact: 'high' as const, action: 'A' }],
      nextActions: ['a', 'b', 'c'],
      budgetDelayTradeoff: {
        recommendedMode: 'equilibre' as const,
        estimatedDelayDays: 999,
        estimatedBudgetDeltaPercent: -50.25,
        rationale: 'x',
      },
      confidence: 0.9,
    };
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(badFromModel) } }],
      }),
    } as unknown as Response);

    const r = await service.generateInsights('507f1f77bcf86cd799439099');
    expect(r.source).toBe('groq');
    expect(r.analysis.budgetDelayTradeoff.estimatedBudgetDeltaPercent).toBe(12);
    expect(r.analysis.budgetDelayTradeoff.estimatedDelayDays).toBe(0);
  });

  it('cas 6: fallback applique les mêmes métriques backend quand le JSON LLM est invalide', async () => {
    mockProjects.findOne.mockResolvedValue({
      ...project,
      budget: 50000,
      spentBudget: 45000,
    });

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'not-json' } }],
      }),
    } as unknown as Response);

    const r = await service.generateInsights('507f1f77bcf86cd799439099');
    expect(r.source).toBe('fallback');
    expect(r.analysis.budgetDelayTradeoff.estimatedBudgetDeltaPercent).toBe(-10);
    expect(r.analysis.budgetDelayTradeoff.estimatedDelayDays).toBe(0);
    expect(r.analysis.budgetDelayTradeoff.recommendedMode).toBe('equilibre');
    expect(r.analysis.budgetDelayTradeoff.rationale).toContain('-10');
    expect(r.analysis.topRisks.length).toBeGreaterThanOrEqual(1);
    expect(r.analysis.nextActions.length).toBeGreaterThanOrEqual(1);
  });

  it('cas 3 intégré: budget zéro => delta null en sortie', async () => {
    mockProjects.findOne.mockResolvedValue({
      ...project,
      budget: 0,
      spentBudget: 1000,
    });
    const valid = {
      summary: 'Synthèse',
      topRisks: [{ title: 'R', impact: 'high' as const, action: 'A' }],
      nextActions: ['a', 'b', 'c'],
      budgetDelayTradeoff: {
        recommendedMode: 'equilibre' as const,
        estimatedDelayDays: 0,
        estimatedBudgetDeltaPercent: 99,
        rationale: 'x',
      },
      confidence: 0.9,
    };
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(valid) } }],
      }),
    } as unknown as Response);

    const r = await service.generateInsights('507f1f77bcf86cd799439099');
    expect(r.analysis.budgetDelayTradeoff.estimatedBudgetDeltaPercent).toBeNull();
  });

  it('cas 4 intégré: échéance dépassée et non terminé => delay aligné backend', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
    mockProjects.findOne.mockResolvedValue({
      ...project,
      endDate: new Date('2026-04-01T12:00:00.000Z'),
      status: 'En cours',
    });

    const valid = {
      summary: 'Synthèse',
      topRisks: [{ title: 'R', impact: 'high' as const, action: 'A' }],
      nextActions: ['a', 'b', 'c'],
      budgetDelayTradeoff: {
        recommendedMode: 'equilibre' as const,
        estimatedDelayDays: 0,
        estimatedBudgetDeltaPercent: 0,
        rationale: 'x',
      },
      confidence: 0.9,
    };
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(valid) } }],
      }),
    } as unknown as Response);

    const r = await service.generateInsights('507f1f77bcf86cd799439099');
    expect(r.analysis.budgetDelayTradeoff.estimatedDelayDays).toBe(14);
    jest.useRealTimers();
  });

  it('chatProject rejects when last message is not user', async () => {
    await expect(
      service.chatProject('507f1f77bcf86cd799439099', {
        messages: [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'ok' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('chatProject returns Groq reply', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'Réponse assistant.' } }],
      }),
    } as unknown as Response);

    const r = await service.chatProject('507f1f77bcf86cd799439099', {
      messages: [{ role: 'user', content: 'Résume le projet.' }],
    });
    expect(r.reply).toBe('Réponse assistant.');
  });

  it('initialAssistantReport returns Groq report', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '## Projet\nRapport test.' } }],
      }),
    } as unknown as Response);

    const r = await service.initialAssistantReport('507f1f77bcf86cd799439099');
    expect(r.report).toBe('## Projet\nRapport test.');
  });
});
