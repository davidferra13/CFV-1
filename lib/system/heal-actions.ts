'use server'

// System Nerve Center - Heal Actions
// Server actions that execute fixes for broken services.
// Every action is admin-only.

import { requireAdmin } from '@/lib/auth/admin'
import { wakePcOllama, restartPcOllama, loadModelOnEndpoint } from '@/lib/ai/ollama-wake'
import { getOllamaConfig } from '@/lib/ai/providers'
import { breakers } from '@/lib/resilience/circuit-breaker'
import type { FixResult, ServiceId } from './types'

// ─── Master Dispatch ─────────────────────────────────────────────────────────

export async function executeHealAction(actionId: string): Promise<FixResult> {
  await requireAdmin()
  const start = Date.now()

  try {
    switch (actionId) {
      // Ollama PC
      case 'wake_ollama_pc': {
        const r = await wakePcOllama()
        return fixResult(actionId, 'ollama_pc', r.success, r.message, start)
      }
      case 'restart_ollama_pc': {
        const r = await restartPcOllama()
        return fixResult(actionId, 'ollama_pc', r.success, r.message, start)
      }
      case 'load_model_pc': {
        const config = getOllamaConfig()
        const r = await loadModelOnEndpoint('pc', config.baseUrl)
        return fixResult(actionId, 'ollama_pc', r.success, r.message, start)
      }

      // Circuit breaker resets
      case 'reset_stripe_breaker':
        return resetBreaker('stripe', 'stripe', start)
      case 'reset_resend_breaker':
        return resetBreaker('resend', 'resend', start)
      case 'reset_db_breaker':
        return resetBreaker('db', 'database', start)
      case 'reset_google_maps_breaker':
        return resetBreaker('googleMaps', 'google_maps', start)
      case 'reset_spoonacular_breaker':
        return resetBreaker('spoonacular', 'spoonacular', start)
      case 'reset_kroger_breaker':
        return resetBreaker('kroger', 'kroger', start)
      case 'reset_mealme_breaker':
        return resetBreaker('mealme', 'mealme', start)

      // Beta server
      case 'restart_beta':
        return await restartBeta(start)

      default:
        return fixResult(actionId, 'dev_server', false, `Unknown action: ${actionId}`, start)
    }
  } catch (err) {
    return fixResult(
      actionId,
      'dev_server',
      false,
      err instanceof Error ? err.message : 'Unknown error',
      start
    )
  }
}

export async function executeSweepAll(autoFix = false): Promise<import('./types').SweepResult> {
  await requireAdmin()
  const { runHealthSweep } = await import('./health-sweep')
  return runHealthSweep(autoFix)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fixResult(
  actionId: string,
  serviceId: ServiceId,
  success: boolean,
  message: string,
  startTime: number
): FixResult {
  return { actionId, serviceId, success, message, durationMs: Date.now() - startTime }
}

function resetBreaker(
  breakerKey: keyof typeof breakers,
  serviceId: ServiceId,
  startTime: number
): FixResult {
  const prevState = breakers[breakerKey].getState()
  breakers[breakerKey].reset()
  return fixResult(
    `reset_${serviceId}_breaker`,
    serviceId,
    true,
    `Circuit breaker reset (was ${prevState}, now CLOSED)`,
    startTime
  )
}

async function restartBeta(startTime: number): Promise<FixResult> {
  try {
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    await execAsync('powershell -ExecutionPolicy Bypass -File scripts/start-beta.ps1', {
      timeout: 30000,
    })
    return fixResult('restart_beta', 'beta_server', true, 'Beta server restarted', startTime)
  } catch (err) {
    return fixResult(
      'restart_beta',
      'beta_server',
      false,
      err instanceof Error ? err.message : 'Restart command failed',
      startTime
    )
  }
}
