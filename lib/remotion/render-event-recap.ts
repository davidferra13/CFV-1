// Server-side Remotion render for post-event recap videos.
// Called from runCompletedEventPostProcessing (fire-and-forget) and the render-recap API route.
// Spawns scripts/render-recap.mjs as a child process to avoid webpack conflicts with Next.js.

import path from 'path'
import { spawn } from 'child_process'
import { createServerClient } from '@/lib/db/server'
import { log } from '@/lib/logger'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

export type RecapStatus = 'not_started' | 'pending' | 'rendering' | 'done' | 'failed'

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Queue a recap video render. Inserts/updates the event_recaps row immediately
 * and spawns the render script as a background child process.
 * Returns immediately — the render continues async.
 */
export async function queueRecapVideoRender(eventId: string, tenantId: string): Promise<void> {
  const db = createServerClient({ admin: true }) as any

  const [{ data: event }, { data: menuRows }] = await Promise.all([
    db
      .from('events')
      .select('id, occasion, event_date, guest_count, quoted_price_cents')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('event_menu_items')
      .select('name, course')
      .eq('event_id', eventId)
      .order('course', { ascending: true })
      .limit(5),
  ])

  if (!event) {
    log.events.warn('[render-recap] Event not found, skipping', { eventId })
    return
  }

  const menuItems: string[] = (menuRows || []).map((r: any) => r.name as string)
  const filePath = `storage/recaps/${eventId}.mp4`

  // Upsert to event_recaps with status='pending'
  await db.from('event_recaps').upsert(
    {
      event_id: eventId,
      tenant_id: tenantId,
      file_path: filePath,
      status: 'pending',
      error_message: null,
      rendered_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'event_id' }
  )

  const inputProps = {
    occasion: (event.occasion as string) || 'Dinner',
    eventDate: safeFormatDate(event.event_date),
    guestCount: (event.guest_count as number) || 0,
    menuItems,
    totalPaidDisplay: event.quoted_price_cents
      ? formatCurrency(event.quoted_price_cents as number)
      : '$0',
  }

  // Fire-and-forget render
  spawnRenderProcess(eventId, tenantId, inputProps).catch((err) => {
    log.events.warn('[render-recap] Spawn failed', { error: err, eventId })
  })
}

/**
 * Get current recap video status for an event.
 */
export async function getRecapVideoStatus(
  eventId: string,
  tenantId: string
): Promise<{ status: RecapStatus; filePath?: string }> {
  const db = createServerClient({ admin: true }) as any

  const { data } = await db
    .from('event_recaps')
    .select('status, file_path')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!data) return { status: 'not_started' }

  return {
    status: (data.status as RecapStatus) ?? 'pending',
    filePath: data.status === 'done' ? (data.file_path as string) : undefined,
  }
}

// ─── Internals ────────────────────────────────────────────────────────────────

async function spawnRenderProcess(
  eventId: string,
  tenantId: string,
  inputProps: object
): Promise<void> {
  const db = createServerClient({ admin: true }) as any
  const scriptPath = path.join(process.cwd(), 'scripts', 'render-recap.mjs')
  const propsB64 = Buffer.from(JSON.stringify(inputProps)).toString('base64')

  // Mark as rendering
  await db
    .from('event_recaps')
    .update({ status: 'rendering', updated_at: new Date().toISOString() })
    .eq('event_id', eventId)

  return new Promise((resolve) => {
    const child = spawn('node', [scriptPath, eventId, propsB64], {
      detached: false,
      stdio: 'pipe',
      env: { ...process.env },
      cwd: process.cwd(),
    })

    child.stdout.on('data', (d: Buffer) =>
      log.events.info('[render-recap]', { msg: d.toString().trim(), eventId })
    )
    child.stderr.on('data', (d: Buffer) =>
      log.events.warn('[render-recap] stderr', { msg: d.toString().trim(), eventId })
    )

    child.on('close', async (code) => {
      if (code === 0) {
        await db
          .from('event_recaps')
          .update({
            status: 'done',
            rendered_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('event_id', eventId)
        log.events.info('[render-recap] Render complete', { eventId, tenantId })
      } else {
        await db
          .from('event_recaps')
          .update({
            status: 'failed',
            error_message: `Process exited with code ${code}`,
            updated_at: new Date().toISOString(),
          })
          .eq('event_id', eventId)
        log.events.warn('[render-recap] Render failed', { eventId, code })
      }
      resolve()
    })

    child.on('error', async (err) => {
      await db
        .from('event_recaps')
        .update({
          status: 'failed',
          error_message: err.message,
          updated_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
      log.events.warn('[render-recap] Spawn error', { error: err.message, eventId })
      resolve()
    })
  })
}

function safeFormatDate(rawDate: unknown): string {
  try {
    return format(new Date(rawDate as string), 'MMMM d, yyyy')
  } catch {
    return String(rawDate)
  }
}
