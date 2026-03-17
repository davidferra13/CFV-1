import { isProductionEnvironment } from '@/lib/environment/runtime'

type StripeKeyMode = 'live' | 'test' | 'unknown'

export type ProductionSafetyReport = {
  errors: string[]
  warnings: string[]
}

const REQUIRED_PRODUCTION_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'CRON_SECRET',
] as const

function isLocalhostUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return (
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('0.0.0.0')
  )
}

function getStripeKeyMode(
  key: string | undefined,
  livePrefix: string,
  testPrefix: string
): StripeKeyMode {
  if (!key) return 'unknown'
  if (key.startsWith(livePrefix)) return 'live'
  if (key.startsWith(testPrefix)) return 'test'
  return 'unknown'
}

export function evaluateProductionSafetyEnv(
  env: NodeJS.ProcessEnv = process.env
): ProductionSafetyReport {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isProductionEnvironment()) {
    return { errors, warnings }
  }

  const missing = REQUIRED_PRODUCTION_ENV_VARS.filter((key) => !env[key])
  if (missing.length > 0) {
    errors.push(`Missing required env vars for production: ${missing.join(', ')}`)
  }

  if (env.DEMO_MODE_ENABLED === 'true') {
    errors.push('DEMO_MODE_ENABLED must be false in production')
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL ?? ''
  const appUrl = env.NEXT_PUBLIC_APP_URL ?? ''
  if (siteUrl && isLocalhostUrl(siteUrl)) {
    errors.push('NEXT_PUBLIC_SITE_URL points to localhost/loopback in production')
  }
  if (appUrl && isLocalhostUrl(appUrl)) {
    errors.push('NEXT_PUBLIC_APP_URL points to localhost/loopback in production')
  }

  const secretMode = getStripeKeyMode(env.STRIPE_SECRET_KEY, 'sk_live_', 'sk_test_')
  const publishableMode = getStripeKeyMode(
    env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    'pk_live_',
    'pk_test_'
  )

  if (secretMode === 'test') {
    errors.push('STRIPE_SECRET_KEY is a test key in production')
  }
  if (publishableMode === 'test') {
    errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is a test key in production')
  }

  if (secretMode !== 'unknown' && publishableMode !== 'unknown' && secretMode !== publishableMode) {
    errors.push('Stripe key mode mismatch: secret and publishable keys are from different modes')
  }

  if (secretMode === 'unknown' && env.STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_SECRET_KEY does not match expected sk_live_/sk_test_ prefix')
  }
  if (publishableMode === 'unknown' && env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    warnings.push(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY does not match expected pk_live_/pk_test_ prefix'
    )
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    errors.push('STRIPE_WEBHOOK_SECRET is missing')
  } else if (!env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
    warnings.push('STRIPE_WEBHOOK_SECRET does not match expected whsec_ prefix')
  }

  if (!siteUrl) {
    errors.push('NEXT_PUBLIC_SITE_URL is not set')
  }
  if (!appUrl) {
    errors.push('NEXT_PUBLIC_APP_URL is not set')
  }

  // Sentry: warn if DSN is set but auth token is missing (source maps won't upload)
  if (env.SENTRY_DSN && !env.SENTRY_AUTH_TOKEN) {
    warnings.push(
      'SENTRY_DSN is set but SENTRY_AUTH_TOKEN is missing. Source maps will not upload to Sentry.'
    )
  }

  return { errors, warnings }
}

export function assertProductionSafetyEnv(env: NodeJS.ProcessEnv = process.env): void {
  const report = evaluateProductionSafetyEnv(env)
  if (report.errors.length === 0) return

  const details = report.errors.map((err) => `- ${err}`).join('\n')
  throw new Error(`[ChefFlow] Production environment safety check failed:\n${details}`)
}
