import { z } from 'zod';

const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  /** Clé de secours (même compte ou autre) : utilisée si la clé principale reçoit HTTP 429. */
  GROQ_API_KEY_FALLBACK: z.preprocess(
    (v) =>
      v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim(),
    z.string().min(1).optional(),
  ),
  GROQ_MODEL: z.string().default('llama-3.1-8b-instant'),
  GROQ_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

export type GroqEnvVars = z.infer<typeof envSchema>;

/**
 * Valide les variables Groq puis fusionne avec le reste de la config.
 * Sans fusion, NestJS n’enregistrerait que les clés retournées par le validateur.
 */
export function validateGroqEnv(
  config: Record<string, unknown>,
): Record<string, unknown> & GroqEnvVars {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(flat)}`);
  }
  return { ...config, ...parsed.data };
}
