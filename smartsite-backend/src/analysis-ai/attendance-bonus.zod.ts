import { z } from 'zod';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const nullableNonNegativeDt = z.preprocess(
  (v) =>
    v === null || v === undefined || v === "" ? null : v,
  z.union([z.null(), z.coerce.number().nonnegative()]),
);

export const travailleurBonusSchema = z.object({
  resourceId: z.string().regex(OBJECT_ID_RE),
  nomAffiche: z.string().min(1),
  /** Points de présence mensuels (échelle 0–30, jours ouvrables, week-ends exclus). */
  scorePerformance: z.coerce.number().min(0).max(30),
  /** Prime en dinars tunisiens (DT) selon le barème serveur. */
  montantPrimeSuggere: nullableNonNegativeDt,
  montantBonusSuggere: nullableNonNegativeDt,
  justification: z.string().min(1),
  pointsForts: z.array(z.string().min(1)).max(6),
});

export const attendanceBonusAnalysisPayloadSchema = z.object({
  summary: z.string().min(1),
  recommendationsEquipe: z.array(z.string().min(1)).max(8),
  travailleurs: z.array(travailleurBonusSchema),
  confiance: z.coerce.number().min(0).max(1),
});

export type AttendanceBonusAnalysisPayload = z.infer<
  typeof attendanceBonusAnalysisPayloadSchema
>;
export type TravailleurBonusRow = z.infer<typeof travailleurBonusSchema>;

export const attendanceBonusInsightsResponseSchema = z.object({
  jobId: z.string().min(1),
  jobTitle: z.string().min(1),
  annee: z.number().int(),
  mois: z.number().int().min(1).max(12),
  generatedAt: z.string().min(1),
  source: z.enum(['groq', 'fallback']),
  reglePrime: z
    .string()
    .min(1)
    .describe(
      'Rappel du barème : points sur jours ouvrables, week-ends exclus ; 30→50 DT, 29→30 DT, 28→10 DT',
    ),
  backendMetrics: z.array(
    z.object({
      resourceId: z.string(),
      displayName: z.string(),
      annee: z.number().int(),
      mois: z.number().int().min(1).max(12),
      joursOuvrables: z.number().int().nonnegative(),
      joursPresentsOuvrables: z.number().int().nonnegative(),
      joursAbsentsPointesOuvrables: z.number().int().nonnegative(),
      joursOuvrablesSansPointage: z.number().int().nonnegative(),
      pointsMensuel: z.number().min(0).max(30),
      primeDt: z.number().nonnegative(),
      devise: z.literal('DT'),
      joursPresent: z.number().int().nonnegative(),
      joursAbsent: z.number().int().nonnegative(),
      totalJours: z.number().int().nonnegative(),
      tauxPresence: z.number().min(0).max(1),
      heuresTotales: z.number().nonnegative(),
      heuresMoyennesJourPresent: z.union([z.number().nonnegative(), z.null()]),
      scoreRendement: z.number().min(0).max(30),
    }),
  ),
  analysis: z.object({
    summary: z.string().min(1),
    recommendationsEquipe: z.array(z.string().min(1)).max(8),
    travailleurs: z.array(travailleurBonusSchema),
    confiance: z.number().min(0).max(1),
  }),
});

export type AttendanceBonusInsightsResponse = z.infer<
  typeof attendanceBonusInsightsResponseSchema
>;
