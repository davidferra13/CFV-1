import { z } from 'zod'

const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Required in production
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // Auth providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // Pi Bridge
  PI_BRIDGE_URL: z.string().url().optional().default('http://10.0.0.177:7700'),
  PI_BRIDGE_SECRET: z.string().optional(),

  // Security
  OUTREACH_ENCRYPTION_KEY: z.string().min(16).optional(),
  COOKIE_SIGNING_SECRET: z.string().min(16).optional(),

  // AI
  OLLAMA_BASE_URL: z.string().url().optional(),

  // Bot protection
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // Testing
  E2E_ALLOW_TEST_AUTH: z.enum(['true', 'false', '1', '0']).optional(),

  // OpenClaw
  OPENCLAW_API_URL: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>

const FEATURE_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'OUTREACH_ENCRYPTION_KEY',
  'COOKIE_SIGNING_SECRET',
  'OLLAMA_BASE_URL',
  'TURNSTILE_SECRET_KEY',
  'OPENCLAW_API_URL',
] as const

function validateEnv(): Env {
  const envInput = {
    ...process.env,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || process.env.CHEFFLOW_AUTH_ORIGIN,
  }
  const result = envSchema.safeParse(envInput)

  if (!result.success) {
    const issues = result.error.issues
    const required = issues.filter(
      (i) => !FEATURE_VARS.includes(i.path[0] as (typeof FEATURE_VARS)[number])
    )
    const optional = issues.filter((i) =>
      FEATURE_VARS.includes(i.path[0] as (typeof FEATURE_VARS)[number])
    )

    if (optional.length > 0) {
      const msgs = optional.map((i) => `  ${i.path.join('.')}: ${i.message}`)
      console.warn(
        `[env] Optional environment variables missing (features may be limited):\n${msgs.join('\n')}`
      )
    }

    if (required.length > 0) {
      const msgs = required.map((i) => `  ${i.path.join('.')}: ${i.message}`)
      const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

      if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
        throw new Error(`Missing required environment variables:\n${msgs.join('\n')}`)
      }

      console.warn(
        `[env] Required environment variables missing (using dev defaults):\n${msgs.join('\n')}`
      )

      return envSchema.parse({
        ...envInput,
        DATABASE_URL:
          process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dev-secret-minimum-32-characters-long!!',
        NEXTAUTH_URL: envInput.NEXTAUTH_URL || 'http://localhost:3100',
      })
    }
  }

  return result.data as Env
}

export const env = validateEnv()
