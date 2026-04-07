import { z } from 'zod';

const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  GROQ_MODEL: z.string().default('llama-3.1-8b-instant'),
  GROQ_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

  // ✅ ADD THIS (optional but clean)
  STRIPE_SECRET_KEY: z.string().optional(),
  MISTTRAL_API_KEY: z.string().optional(),

}).passthrough(); // ✅ THIS IS THE KEY FIX
export type GroqEnvVars = z.infer<typeof envSchema>;

/**
 * Validateur ConfigModule (module analysis-ai / Groq uniquement dans ce dépôt backend).
 */
export function validateGroqEnv(config: Record<string, unknown>): GroqEnvVars {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(flat)}`);
  }
  return parsed.data;
}
