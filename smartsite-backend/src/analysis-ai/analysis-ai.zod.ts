import { z } from 'zod';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const riskImpactSchema = z.enum(['low', 'medium', 'high']);

const topRiskSchema = z.object({
  title: z.string().min(1),
  impact: riskImpactSchema,
  action: z.string().min(1),
  relatedTaskIds: z.array(z.string().regex(OBJECT_ID_RE)).max(8).optional(),
});

export const enrichedTopRiskSchema = z.object({
  title: z.string().min(1),
  impact: riskImpactSchema,
  action: z.string().min(1),
  relatedTaskIds: z.array(z.string()).max(8),
  relatedTasks: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
    }),
  ),
});

const budgetDelayTradeoffSchema = z.object({
  recommendedMode: z.enum(['economique', 'equilibre', 'accelere']),
  estimatedDelayDays: z.number().finite(),
  estimatedBudgetDeltaPercent: z.union([z.number().finite(), z.null()]),
  rationale: z.string().min(1),
});

export const aiAnalysisPayloadSchema = z.object({
  summary: z.string().min(1),
  topRisks: z.array(topRiskSchema),
  nextActions: z.array(z.string().min(1)),
  budgetDelayTradeoff: budgetDelayTradeoffSchema,
  confidence: z.number().min(0).max(1),
});

export type AiAnalysisPayload = z.infer<typeof aiAnalysisPayloadSchema>;

export const aiAnalysisResponsePayloadSchema = z.object({
  summary: z.string().min(1),
  topRisks: z.array(enrichedTopRiskSchema),
  nextActions: z.array(z.string().min(1)),
  budgetDelayTradeoff: budgetDelayTradeoffSchema,
  confidence: z.number().min(0).max(1),
});

export type AiAnalysisResponsePayload = z.infer<typeof aiAnalysisResponsePayloadSchema>;

export const projectAiInsightsResponseSchema = z.object({
  projectId: z.string().min(1),
  generatedAt: z.string().min(1),
  source: z.enum(['groq', 'fallback']),
  analysis: aiAnalysisResponsePayloadSchema,
});

export type ProjectAiInsightsResponse = z.infer<typeof projectAiInsightsResponseSchema>;

export function parseAiAnalysisPayload(raw: unknown): AiAnalysisPayload {
  return aiAnalysisPayloadSchema.parse(raw);
}
