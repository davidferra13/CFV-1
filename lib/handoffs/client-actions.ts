import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'

export type HandoffKind = 'phone' | 'sms' | 'email' | 'address' | 'calendar' | 'link' | 'copy'

export type HandoffAction = 'open' | 'copy'

export type CopyResult = { success: true } | { success: false; error: string }

export type CopyTrackingOptions = {
  kind?: HandoffKind
  action?: HandoffAction
  surface?: string
}

export async function copyToClipboard(
  value: string,
  label = 'Text',
  tracking?: CopyTrackingOptions
): Promise<CopyResult> {
  const text = value.trim()
  if (!text) return { success: false, error: `${label} is empty.` }

  try {
    if (!navigator.clipboard?.writeText) {
      return { success: false, error: 'Clipboard is not available in this browser.' }
    }
    await navigator.clipboard.writeText(text)
    recordHandoffUsage(
      tracking?.kind ?? 'copy',
      tracking?.action ?? 'copy',
      tracking?.surface ?? label
    )
    return { success: true }
  } catch {
    return { success: false, error: `Could not copy ${label.toLowerCase()}.` }
  }
}

export function recordHandoffUsage(
  kind: HandoffKind,
  action: HandoffAction,
  surface?: string
): void {
  trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
    feature: 'handoff',
    handoff_kind: kind,
    handoff_action: action,
    surface: surface ?? null,
  })
}
