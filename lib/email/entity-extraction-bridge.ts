// Email Entity Extraction - CIL Bridge
// Converts extraction results into CIL signals via notifyCIL.
// Non-blocking: never throws, logs errors internally.

import type { EmailExtractionResult } from './entity-extraction'
import type { SignalSource } from '@/lib/cil/types'

/**
 * Bridge extracted email entities into the CIL signal pipeline.
 * Maps entity types to CIL entity_ids format and fires notifyCIL for each signal.
 *
 * Non-blocking: catches all errors internally and logs them.
 * Call this after extractEntitiesFromEmail() returns successfully.
 */
export async function bridgeEmailToCIL(
  extractionResult: EmailExtractionResult,
  tenantId: string
): Promise<void> {
  if (!extractionResult.suggestedCilSignals.length) return

  try {
    // Dynamic import to avoid loading SQLite at module parse time
    const { notifyCIL } = await import('@/lib/cil/notify')

    const now = Date.now()

    for (const signal of extractionResult.suggestedCilSignals) {
      try {
        await notifyCIL({
          tenantId,
          // CIL SignalSource type uses 'memory' as closest match for email extraction
          // (extracted knowledge from unstructured text, same as remy_memories)
          source: 'memory' as SignalSource,
          entityIds: signal.entityIds,
          payload: {
            ...signal.payload,
            extraction_source: 'email',
            extraction_timestamp: now,
            urgency: extractionResult.urgency,
            requires_response: extractionResult.requiresResponse,
            summary: extractionResult.summary,
          },
          timestamp: now,
        })
      } catch (signalErr) {
        // Individual signal failure must not block other signals
        console.error(
          '[email-cil-bridge] Signal ingestion failed (non-fatal):',
          signalErr instanceof Error ? signalErr.message : signalErr
        )
      }
    }
  } catch (err) {
    // Top-level failure (e.g. import failed). Non-fatal.
    console.error(
      '[email-cil-bridge] Bridge failed (non-fatal):',
      err instanceof Error ? err.message : err
    )
  }
}

/**
 * Convenience: extract + bridge in one call.
 * Extracts entities from email body, then bridges them to CIL.
 * Non-blocking on bridge failure; extraction errors propagate OllamaOfflineError.
 */
export async function extractAndBridgeEmail(
  emailBody: string,
  tenantId: string,
  metadata?: { senderEmail?: string; subject?: string }
): Promise<EmailExtractionResult> {
  const { extractEntitiesFromEmail } = await import('./entity-extraction')

  const result = await extractEntitiesFromEmail(emailBody, {
    ...metadata,
    tenantId,
  })

  // Bridge to CIL in background (non-blocking)
  if (result.entities.length > 0) {
    bridgeEmailToCIL(result, tenantId).catch((err) => {
      console.error(
        '[email-cil-bridge] Background bridge failed:',
        err instanceof Error ? err.message : err
      )
    })
  }

  return result
}
