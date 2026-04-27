import { appendFileSync, mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'

export type RuntimeEventType =
  | 'model:start'
  | 'model:token'
  | 'model:decision'
  | 'model:end'
  | 'tool:call'
  | 'tool:result'
  | 'state:update'
  | 'agent:spawn'
  | 'agent:complete'
  | 'error'
  | 'retry'
  | 'fallback'

export type RuntimeEventScope = {
  user?: string | null
  tenant?: string | null
  event?: string | null
  workflow?: string | null
  request?: string | null
}

export type RuntimeTransparencyEvent = {
  id: string
  timestamp: string
  type: RuntimeEventType
  source: string
  scope: RuntimeEventScope
  payload: Record<string, unknown>
}

export type RuntimeEventInput = {
  type: RuntimeEventType
  source: string
  scope?: RuntimeEventScope
  payload?: Record<string, unknown>
  timestamp?: string
}

const EVENT_LOG_PATH = join(process.cwd(), 'system', 'runtime-events.ndjson')

function safeJson(value: RuntimeTransparencyEvent): string {
  return JSON.stringify(value, (_key, entry) => {
    if (entry instanceof Error) {
      return {
        name: entry.name,
        message: entry.message,
        stack: entry.stack,
      }
    }

    if (typeof entry === 'bigint') {
      return entry.toString()
    }

    return entry
  })
}

export function emitRuntimeEvent(input: RuntimeEventInput): RuntimeTransparencyEvent | null {
  const event: RuntimeTransparencyEvent = {
    id: randomUUID(),
    timestamp: input.timestamp ?? new Date().toISOString(),
    type: input.type,
    source: input.source,
    scope: input.scope ?? {},
    payload: input.payload ?? {},
  }

  try {
    mkdirSync(join(process.cwd(), 'system'), { recursive: true })
    appendFileSync(EVENT_LOG_PATH, `${safeJson(event)}\n`, 'utf8')
    return event
  } catch (err) {
    console.warn('[runtime-transparency] failed to append runtime event', err)
    return null
  }
}
