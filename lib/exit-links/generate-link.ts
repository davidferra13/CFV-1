import type {
  ExitLinkDefinition,
  ExitLinkResult,
  ExitCategory,
  SubLinkDefinition,
} from '@/types/exit-links'
import { getExitDefinition, getExitDefinitionsByCategory } from './registry'

// ─── placeholder interpolation ────────────────────────────────

const PLACEHOLDER_RE = /\{([^}]+)\}/g

function interpolate(template: string, context: Record<string, string>, encode: boolean): string {
  return template.replace(PLACEHOLDER_RE, (_, key: string) => {
    const val = context[key] ?? ''
    return encode ? encodeURIComponent(val) : val
  })
}

/**
 * Returns true when every required key has a non-empty value
 * in the provided context.
 */
function hasRequiredKeys(keys: string[], context: Record<string, string>): boolean {
  return keys.every((k) => Boolean(context[k]))
}

// ─── carrier detection (exit 52) ──────────────────────────────

function resolveTrackingUrl(tracking: string): string {
  const clean = tracking.trim()
  if (clean.startsWith('1Z')) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(clean)}`
  }
  const digits = clean.replace(/\D/g, '')
  if (digits.length >= 20 && digits.length <= 22) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(clean)}`
  }
  if (digits.length >= 12 && digits.length <= 34) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(clean)}`
  }
  return `https://www.google.com/search?q=${encodeURIComponent(clean)}`
}

// ─── sublink resolution ───────────────────────────────────────

function resolveSubLink(
  sub: SubLinkDefinition,
  context: Record<string, string>
): ExitLinkResult | null {
  if (!sub.urlTemplate) return null
  const keys = sub.contextKeys ?? []
  if (!hasRequiredKeys(keys, context)) return null

  return {
    url: interpolate(sub.urlTemplate, context, true),
    label: interpolate(sub.label, context, false),
    icon: sub.icon,
    newTab: sub.newTab,
  }
}

// ─── public API ───────────────────────────────────────────────

/**
 * Resolve a single exit link by id, filling placeholders from context.
 * Returns null when a required context key is missing.
 */
export function getExitLink(id: number, context: Record<string, string>): ExitLinkResult | null {
  const def = getExitDefinition(id)
  if (!def) return null

  // In-app exits have no URL but are still valid results.
  if (def.inApp) {
    return {
      url: null,
      label: interpolate(def.label, context, false),
      icon: def.icon,
      newTab: false,
      inApp: true,
    }
  }

  if (!def.urlTemplate) return null
  if (!hasRequiredKeys(def.contextKeys, context)) return null

  // Special handling for tracking-number carrier detection.
  let url: string
  if (id === 52 && context.trackingNumber) {
    url = resolveTrackingUrl(context.trackingNumber)
  } else {
    url = interpolate(def.urlTemplate, context, true)
  }

  const result: ExitLinkResult = {
    url,
    label: interpolate(def.label, context, false),
    icon: def.icon,
    newTab: def.newTab,
  }

  if (def.subLinks?.length) {
    const resolved = def.subLinks
      .map((s) => resolveSubLink(s, context))
      .filter(Boolean) as ExitLinkResult[]
    if (resolved.length) {
      result.subLinks = resolved
    }
  }

  return result
}

/**
 * Return all resolvable exit links for a given category.
 * Links whose required context is missing are silently skipped.
 */
export function getExitLinksForCategory(
  category: ExitCategory,
  context: Record<string, string>
): ExitLinkResult[] {
  const defs = getExitDefinitionsByCategory(category)
  const results: ExitLinkResult[] = []
  for (const def of defs) {
    const resolved = getExitLink(def.id, context)
    if (resolved) results.push(resolved)
  }
  return results
}
