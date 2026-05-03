import { z } from 'zod';

const envSchema = z
  .object({
    /** Vide en local si l’IA Groq n’est pas utilisée ; les routes concernées répondront alors avec une erreur explicite. */
    GROQ_API_KEY: z.preprocess(
      (v) => (v === undefined || v === null ? '' : String(v).trim()),
      z.string(),
    ),
    /** Clé de secours (même compte ou autre) : utilisée si la clé principale reçoit HTTP 429. */
    GROQ_API_KEY_FALLBACK: z.preprocess(
      (v) =>
        v === undefined || v === null || String(v).trim() === ''
          ? undefined
          : String(v).trim(),
      z.string().min(1).optional(),
    ),
    GROQ_MODEL: z.string().default('llama-3.1-8b-instant'),
    GROQ_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

    // ✅ ADD THIS (optional but clean)
    STRIPE_SECRET_KEY: z.string().optional(),
    MISTRAL_API_KEY: z.string().optional(),
  })
  .passthrough(); // ✅ THIS IS THE KEY FIX
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
    throw new Error(
      `Invalid environment (validateGroqEnv / GROQ_* ou champs schéma): ${JSON.stringify(flat)}`,
    );
  }
  return { ...config, ...parsed.data };
}
