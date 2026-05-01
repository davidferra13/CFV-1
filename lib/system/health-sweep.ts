// System Nerve Center - Health Sweep Engine
// Checks all ChefFlow services in dependency order.
// Not a 'use server' file - pure utility (exports constants + functions).

import { createAdminClient } from '@/lib/db/admin'
import { breakers, getCircuitBreakerHealth } from '@/lib/resilience/circuit-breaker'
import { getOllamaConfig, getModelForEndpoint } from '@/lib/ai/providers'
import { pingEndpoint } from '@/lib/ai/ollama-wake'
import type {
  ServiceDefinition,
  ServiceId,
  ServiceTier,
  ServiceHealthResult,
  ServiceStatus,
  FixAction,
  SweepResult,
  FixResult,
} from './types'

// ─── Service Registry ────────────────────────────────────────────────────────

const fix = (
  id: string,
  label: string,
  description: string,
  serviceId: ServiceId,
  dangerous = false
): FixAction => ({ id, label, description, serviceId, dangerous })

export const SERVICE_REGISTRY: ServiceDefinition[] = [
  // Tier 0
  {
    id: 'network',
    name: 'Internet',
    tier: 0,
    description: 'External network connectivity',
    dependsOn: [],
    envVars: [],
    fixActions: [],
  },
  // Tier 1
  {
    id: 'database',
    name: 'Database',
    tier: 1,
    description: 'database connection',
    dependsOn: ['network'],
    envVars: ['DATABASE_URL'],
    fixActions: [
      fix('reset_db_breaker', 'Reset Breaker', 'Reset the database circuit breaker', 'database'),
    ],
  },
  // Tier 2
  {
    id: 'auth',
    name: 'Auth',
    tier: 2,
    description: 'Auth service',
    dependsOn: ['database'],
    envVars: [],
    fixActions: [],
  },
  // Tier 3
  {
    id: 'dev_server',
    name: 'Dev Server',
    tier: 3,
    description: 'Next.js on port 3100',
    dependsOn: [],
    envVars: [],
    fixActions: [],
  },
  // Tier 4
  {
    id: 'ollama_pc',
    name: 'Ollama PC',
    tier: 4,
    description: 'Local AI on desktop',
    dependsOn: [],
    envVars: ['OLLAMA_BASE_URL'],
    fixActions: [
      fix('wake_ollama_pc', 'Wake', 'Start Ollama service', 'ollama_pc'),
      fix('restart_ollama_pc', 'Restart', 'Restart Ollama service', 'ollama_pc'),
      fix('load_model_pc', 'Load Model', 'Pre-load configured model', 'ollama_pc'),
    ],
  },
  // Tier 5
  {
    id: 'stripe',
    name: 'Stripe',
    tier: 5,
    description: 'Payment processing',
    dependsOn: ['network'],
    envVars: ['STRIPE_SECRET_KEY'],
    fixActions: [fix('reset_stripe_breaker', 'Reset Breaker', 'Reset circuit breaker', 'stripe')],
    docsUrl: '/settings',
  },
  {
    id: 'resend',
    name: 'Resend',
    tier: 5,
    description: 'Email delivery',
    dependsOn: ['network'],
    envVars: ['RESEND_API_KEY'],
    fixActions: [fix('reset_resend_breaker', 'Reset Breaker', 'Reset circuit breaker', 'resend')],
  },
  {
    id: 'gmail',
    name: 'Gmail Sync',
    tier: 5,
    description: 'Email sync',
    dependsOn: ['network', 'database'],
    envVars: ['GOOGLE_CLIENT_ID'],
    fixActions: [],
    docsUrl: '/settings',
  },
  {
    id: 'google_maps',
    name: 'Maps',
    tier: 5,
    description: 'Geocoding & distance',
    dependsOn: ['network'],
    envVars: ['GOOGLE_MAPS_API_KEY'],
    fixActions: [
      fix('reset_google_maps_breaker', 'Reset Breaker', 'Reset circuit breaker', 'google_maps'),
    ],
  },
  {
    id: 'spoonacular',
    name: 'Spoonacular',
    tier: 5,
    description: 'Recipe data API',
    dependsOn: ['network'],
    envVars: ['SPOONACULAR_API_KEY'],
    fixActions: [
      fix('reset_spoonacular_breaker', 'Reset Breaker', 'Reset circuit breaker', 'spoonacular'),
    ],
  },
  {
    id: 'kroger',
    name: 'Kroger',
    tier: 5,
    description: 'Grocery pricing',
    dependsOn: ['network'],
    envVars: ['KROGER_CLIENT_ID'],
    fixActions: [fix('reset_kroger_breaker', 'Reset Breaker', 'Reset circuit breaker', 'kroger')],
  },
  {
    id: 'mealme',
    name: 'MealMe',
    tier: 5,
    description: 'Local store pricing',
    dependsOn: ['network'],
    envVars: ['MEALME_API_KEY'],
    fixActions: [fix('reset_mealme_breaker', 'Reset Breaker', 'Reset circuit breaker', 'mealme')],
  },
  // Tier 6
  {
    id: 'beta_server',
    name: 'Beta Server',
    tier: 6,
    description: 'Next.js on localhost:3200',
    dependsOn: [],
    envVars: [],
    fixActions: [
      fix('restart_beta', 'Restart Beta', 'Restart beta server locally', 'beta_server', true),
    ],
  },
  {
    id: 'cloudflare_tunnel',
    name: 'CF Tunnel',
    tier: 6,
    description: 'beta.cheflowhq.com',
    dependsOn: ['beta_server'],
    envVars: [],
    fixActions: [],
  },
]

// ─── Individual Check Functions ──────────────────────────────────────────────

async function checkNetwork(): Promise<ServiceHealthResult> {
  const def = getDef('network')
  const start = Date.now()
  try {
    const res = await fetch('https://1.1.1.1', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    const latency = Date.now() - start
    if (res.ok || res.status === 405 || res.status === 301) {
      return result(def, 'healthy', `Connected`, latency)
    }
    return result(def, 'degraded', `HTTP ${res.status}`, latency)
  } catch (err) {
    return result(def, 'error', 'No internet connectivity', null, errMsg(err))
  }
}

async function checkDatabase(): Promise<ServiceHealthResult> {
  const def = getDef('database')
  const missing = def.envVars.filter((v) => !process.env[v])
  if (missing.length > 0) {
    return result(def, 'error', `Missing: ${missing.join(', ')}`, null, 'Env vars not set')
  }

  const start = Date.now()
  try {
    const db = createAdminClient()
    const { error } = await db.from('chefs').select('id').limit(1).maybeSingle()
    const latency = Date.now() - start

    if (error && error.code !== 'PGRST116') {
      return result(def, 'error', `Query failed: ${error.message}`, latency, error.message)
    }

    const cbState = breakers.db.getState()
    const cbFails = breakers.db.getFailures()
    const r =
      cbState === 'OPEN'
        ? result(
            def,
            'error',
            `Breaker OPEN (${cbFails} failures)`,
            latency,
            'Circuit breaker tripped'
          )
        : result(def, 'healthy', `Connected`, latency)
    r.circuitBreakerState = cbState
    r.circuitBreakerFailures = cbFails
    return r
  } catch (err) {
    return result(def, 'error', 'Unreachable', null, errMsg(err))
  }
}

async function checkAuth(): Promise<ServiceHealthResult> {
  const def = getDef('auth')
  const missing = def.envVars.filter((v) => !process.env[v])
  if (missing.length > 0) {
    return result(def, 'error', `Missing: ${missing.join(', ')}`, null, 'Env vars not set')
  }
  // Auth depends on database being healthy - if we got here, database is OK
  return result(def, 'healthy', 'Active', null)
}

async function checkDevServer(): Promise<ServiceHealthResult> {
  const def = getDef('dev_server')
  // If this code is running, the dev server is up (we ARE the dev server)
  return result(def, 'healthy', 'Running', null)
}

async function checkOllamaPc(): Promise<ServiceHealthResult> {
  const def = getDef('ollama_pc')
  if (!process.env.OLLAMA_BASE_URL) {
    return result(def, 'unknown', 'Not configured', null, 'OLLAMA_BASE_URL not set')
  }

  const config = getOllamaConfig()
  const ping = await pingEndpoint('pc', config.baseUrl, 10000)

  if (!ping.online) {
    return result(def, 'error', 'Offline', null, ping.error || 'Unreachable')
  }

  if (!ping.modelReady) {
    const r = result(def, 'degraded', `No model loaded`, ping.latencyMs)
    r.error = `Run: ollama pull ${getModelForEndpoint('pc', 'standard')}`
    return r
  }

  return result(def, 'healthy', `Ready (${ping.latencyMs}ms)`, ping.latencyMs)
}

function checkCircuitBreakerService(
  serviceId: ServiceId,
  breakerKey: keyof typeof breakers
): ServiceHealthResult {
  const def = getDef(serviceId)
  const missing = def.envVars.filter((v) => !process.env[v])
  if (missing.length > 0) {
    return result(def, 'unknown', 'Not configured', null, `Missing: ${missing.join(', ')}`)
  }

  const state = breakers[breakerKey].getState()
  const failures = breakers[breakerKey].getFailures()
  const r =
    state === 'OPEN'
      ? result(def, 'error', `Breaker OPEN (${failures} failures)`, null, 'Circuit breaker tripped')
      : state === 'HALF_OPEN'
        ? result(def, 'degraded', `Breaker HALF_OPEN (testing)`, null)
        : result(def, 'healthy', 'Breaker closed', null)
  r.circuitBreakerState = state
  r.circuitBreakerFailures = failures
  return r
}

async function checkBetaServer(): Promise<ServiceHealthResult> {
  const def = getDef('beta_server')
  try {
    const start = Date.now()
    const res = await fetch('http://localhost:3200/api/health', {
      signal: AbortSignal.timeout(5000),
    })
    const latency = Date.now() - start
    if (res.ok) {
      return result(def, 'healthy', `Running (${latency}ms)`, latency)
    }
    return result(def, 'degraded', `HTTP ${res.status}`, latency)
  } catch (err) {
    return result(def, 'error', 'Not running', null, errMsg(err))
  }
}

async function checkCloudflareTunnel(): Promise<ServiceHealthResult> {
  const def = getDef('cloudflare_tunnel')
  try {
    const start = Date.now()
    const res = await fetch('https://beta.cheflowhq.com/api/health', {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
    })
    const latency = Date.now() - start
    if (res.ok) {
      return result(def, 'healthy', `Responding (${latency}ms)`, latency)
    }
    return result(def, 'degraded', `HTTP ${res.status}`, latency)
  } catch (err) {
    return result(def, 'error', 'Unreachable', null, errMsg(err))
  }
}

// ─── Check Dispatcher ────────────────────────────────────────────────────────

async function checkService(def: ServiceDefinition): Promise<ServiceHealthResult> {
  try {
    switch (def.id) {
      case 'network':
        return await checkNetwork()
      case 'database':
        return await checkDatabase()
      case 'auth':
        return await checkAuth()
      case 'dev_server':
        return await checkDevServer()
      case 'ollama_pc':
        return await checkOllamaPc()
      case 'stripe':
        return checkCircuitBreakerService('stripe', 'stripe')
      case 'resend':
        return checkCircuitBreakerService('resend', 'resend')
      case 'gmail':
        return checkCircuitBreakerService('gmail' as ServiceId, 'gemini') // Gmail doesn't have a breaker, check env only
      case 'google_maps':
        return checkCircuitBreakerService('google_maps', 'googleMaps')
      case 'spoonacular':
        return checkCircuitBreakerService('spoonacular', 'spoonacular')
      case 'kroger':
        return checkCircuitBreakerService('kroger', 'kroger')
      case 'mealme':
        return checkCircuitBreakerService('mealme', 'mealme')
      case 'beta_server':
        return await checkBetaServer()
      case 'cloudflare_tunnel':
        return await checkCloudflareTunnel()
      default:
        return result(def, 'unknown', 'No check implemented', null)
    }
  } catch (err) {
    return result(def, 'error', 'Check crashed', null, errMsg(err))
  }
}

// Gmail doesn't have a circuit breaker - override the check
async function checkGmailService(): Promise<ServiceHealthResult> {
  const def = getDef('gmail')
  const missing = def.envVars.filter((v) => !process.env[v])
  if (missing.length > 0) {
    return result(def, 'unknown', 'Not configured', null, `Missing: ${missing.join(', ')}`)
  }
  return result(def, 'healthy', 'Configured', null)
}

// ─── Sweep Engine ────────────────────────────────────────────────────────────

export async function runHealthSweep(autoFix = false): Promise<SweepResult> {
  const startTime = Date.now()
  const results = new Map<ServiceId, ServiceHealthResult>()
  const fixes: FixResult[] = []

  // Group by tier
  const tiers = new Map<ServiceTier, ServiceDefinition[]>()
  for (const def of SERVICE_REGISTRY) {
    const list = tiers.get(def.tier) || []
    list.push(def)
    tiers.set(def.tier, list)
  }

  // Process tiers in order
  for (const tier of [0, 1, 2, 3, 4, 5, 6] as ServiceTier[]) {
    const defs = tiers.get(tier) || []

    // Separate into runnable vs. skipped based on dependencies
    const runnable: ServiceDefinition[] = []
    for (const def of defs) {
      const depDown = def.dependsOn.find((depId) => {
        const depResult = results.get(depId)
        return depResult && depResult.status !== 'healthy' && depResult.status !== 'degraded'
      })

      if (depDown) {
        results.set(def.id, {
          id: def.id,
          name: def.name,
          tier: def.tier,
          status: 'unchecked',
          latencyMs: null,
          detail: `Skipped: ${depDown} is down`,
          error: null,
          fixCapability: 'none',
          fixActions: [],
          checkedAt: new Date().toISOString(),
        })
      } else {
        runnable.push(def)
      }
    }

    // Run checks in parallel within a tier
    const checkResults = await Promise.allSettled(
      runnable.map(async (def) => {
        // Gmail override
        const check = def.id === 'gmail' ? await checkGmailService() : await checkService(def)
        results.set(def.id, check)
        return check
      })
    )

    // Auto-fix broken services in this tier
    if (autoFix) {
      for (const settled of checkResults) {
        if (settled.status !== 'fulfilled') continue
        const svc = settled.value
        if (svc.status !== 'error' && svc.status !== 'degraded') continue
        if (svc.fixActions.length === 0) continue

        // Import and execute fix
        const { executeHealAction } = await import('./heal-actions')
        for (const action of svc.fixActions) {
          if (action.dangerous) continue // Never auto-fix dangerous actions
          const fixResult = await executeHealAction(action.id)
          fixes.push(fixResult)
        }

        // Re-check after fix
        const recheck =
          svc.id === 'gmail' ? await checkGmailService() : await checkService(getDef(svc.id))
        results.set(svc.id, recheck)
      }
    }
  }

  // Compute overall status
  const services = SERVICE_REGISTRY.map((def) => results.get(def.id)!).filter(Boolean)
  let healthyCount = 0
  let degradedCount = 0
  let errorCount = 0
  let uncheckedCount = 0

  for (const svc of services) {
    switch (svc.status) {
      case 'healthy':
        healthyCount++
        break
      case 'degraded':
        degradedCount++
        break
      case 'error':
        errorCount++
        break
      case 'unchecked':
      case 'unknown':
        uncheckedCount++
        break
    }
  }

  const overallStatus: ServiceStatus =
    errorCount > 0 ? 'error' : degradedCount > 0 ? 'degraded' : 'healthy'

  return {
    overallStatus,
    services,
    fixes,
    healthyCount,
    degradedCount,
    errorCount,
    uncheckedCount,
    sweepDurationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDef(id: ServiceId): ServiceDefinition {
  return SERVICE_REGISTRY.find((s) => s.id === id)!
}

function result(
  def: ServiceDefinition,
  status: ServiceStatus,
  detail: string,
  latencyMs: number | null,
  error?: string
): ServiceHealthResult {
  return {
    id: def.id,
    name: def.name,
    tier: def.tier,
    status,
    latencyMs,
    detail,
    error: error || null,
    fixCapability: def.fixActions.length > 0 ? 'auto_fixable' : 'none',
    fixActions: def.fixActions,
    checkedAt: new Date().toISOString(),
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error'
}
