import { NextRequest, NextResponse } from 'next/server'
import { broadcast } from '@/lib/realtime/sse-server'

/**
 * OpenClaw webhook endpoint.
 * Pi pushes real-time events (price anomalies, sync status) to ChefFlow.
 * Authenticated by shared secret (Pi -> PC, internal network only).
 */

const WEBHOOK_SECRET = process.env.OPENCLAW_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  // Fail-closed: reject all requests if webhook secret is not configured
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  // Verify shared secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { type, data } = body

    if (!type) {
      return NextResponse.json({ error: 'Missing type field' }, { status: 400 })
    }

    switch (type) {
      case 'price_anomaly': {
        // Broadcast to all connected admin clients
        broadcast('openclaw:alerts', 'price_anomaly', {
          ingredient: data.ingredient_name,
          source: data.source_name,
          oldPriceCents: data.old_price_cents,
          newPriceCents: data.new_price_cents,
          changePct: data.change_pct,
          anomalyType: data.anomaly_type,
          detectedAt: data.detected_at,
        })
        break
      }

      case 'sync_complete': {
        broadcast('openclaw:status', 'sync_complete', {
          priceChanges: data.price_changes,
          updatedPrices: data.updated_prices,
          completedAt: new Date().toISOString(),
        })
        break
      }

      case 'docket_complete': {
        broadcast('openclaw:status', 'docket_complete', {
          itemId: data.item_id,
          title: data.title,
          confidence: data.confidence,
          model: data.model,
        })
        break
      }

      case 'sync_ready': {
        // Aggregator finished a scrape cycle and new data is available for pull
        broadcast('openclaw:status', 'sync_ready', {
          newPrices: data.new_prices,
          priceChanges: data.price_changes,
          newAnomalies: data.new_anomalies,
          chainsUpdated: data.chains_updated,
          suggestedAction: data.suggested_action,
          receivedAt: new Date().toISOString(),
        })
        console.log(
          `[openclaw-webhook] sync_ready: ${data.new_prices} new, ` +
            `${data.price_changes} changes, ${data.new_anomalies} anomalies`
        )
        break
      }

      case 'growth_regression': {
        // Database growth regression detected by Pi-side growth tracker.
        // Any core table losing rows is a data integrity concern.
        broadcast('openclaw:alerts', 'growth_regression', {
          regressions: data.regressions,
          totalTablesRegressed: data.total_tables_regressed,
          totalRowsLost: data.total_rows_lost,
          detectedAt: data.detected_at,
        })
        break
      }

      case 'sync_stale': {
        // Sync health watchdog detected that ChefFlow is unreachable or sync pipeline is broken
        broadcast('openclaw:alerts', 'sync_stale', {
          reason: data.reason,
          chefflowUrl: data.chefflow_url,
          actionRequired: data.action_required,
          detectedAt: data.detected_at,
        })
        console.warn(`[openclaw-webhook] sync_stale: ${data.reason}`)
        break
      }

      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true, type })
  } catch (err) {
    console.error('[openclaw-webhook]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
