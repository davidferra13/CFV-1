// Invitation token lookup, usage, and revocation for the signup flow
// Extracted from lib/clients/actions.ts to decouple auth from Phase 3 code
//
// Tokens are stored as SHA-256 hashes. The raw token is sent to the client
// in the invitation URL; on lookup we hash the incoming value before querying.

'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

/**
 * Hash a raw invitation token for DB comparison.
 * Tokens created before hashing was introduced are stored as plaintext hex;
 * this function produces the SHA-256 hex digest used for new tokens.
 */
function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

const INVITATION_LINK_COLORS = {
  text: '#ffffff',
  defaultBackground: '#2563eb',
  hoverBackground: '#1d4ed8',
}

function parseHexColor(color: string | null | undefined): [number, number, number] | null {
  if (!color) return null
  const trimmed = color.trim()
  if (trimmed.toLowerCase() === 'transparent') return null
  const match = /^#?([0-9a-f]{6})$/i.exec(trimmed)
  if (!match) return null

  const value = match[1]
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

function linearizeChannel(channel: number): number {
  const normalized = channel / 255
  return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4)
}

function relativeLuminance(color: [number, number, number]): number {
  const [red, green, blue] = color.map(linearizeChannel)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function calculateContrastRatio(foreground: string, background: string): number {
  const foregroundRgb = parseHexColor(foreground)
  const backgroundRgb = parseHexColor(background)

  if (!foregroundRgb || !backgroundRgb) return 0

  const foregroundLuminance = relativeLuminance(foregroundRgb)
  const backgroundLuminance = relativeLuminance(backgroundRgb)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

function getInvitationLinkContrastScore() {
  const defaultRatio = calculateContrastRatio(
    INVITATION_LINK_COLORS.text,
    INVITATION_LINK_COLORS.defaultBackground
  )
  const hoverRatio = calculateContrastRatio(
    INVITATION_LINK_COLORS.text,
    INVITATION_LINK_COLORS.hoverBackground
  )
  const minimumRatio = Math.min(defaultRatio, hoverRatio)

  return {
    defaultRatio: Number(defaultRatio.toFixed(2)),
    hoverRatio: Number(hoverRatio.toFixed(2)),
    normalTextPass: minimumRatio >= 4.5,
    largeTextPass: minimumRatio >= 3,
  }
}

function assertInvitationLinkContrast() {
  const score = getInvitationLinkContrastScore()
  if (!score.normalTextPass) {
    throw new Error('Invitation link colors do not meet WCAG AA contrast requirements')
  }
  return score
}

/**
 * Get invitation by token (public - for signup flow).
 * Checks the hashed token first; falls back to plaintext match
 * for tokens generated before the hashing migration.
 */
export async function getInvitationByToken(token: string) {
  const db: any = createServerClient()
  const hashed = hashToken(token)
  const linkContrast = assertInvitationLinkContrast()

  // Try hashed match first (new tokens)
  const { data: invitation } = await db
    .from('client_invitations')
    .select('*')
    .eq('token', hashed)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (invitation) return { ...invitation, link_contrast: linkContrast }

  // Fallback: plaintext match for legacy tokens created before hashing
  const { data: legacyInvitation } = await db
    .from('client_invitations')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  return legacyInvitation ? { ...legacyInvitation, link_contrast: linkContrast } : null
}

/**
 * Mark invitation as used (called during signup)
 */
// public: client signup marks the already validated invitation token as used.
export async function markInvitationUsed(invitationId: string, rawToken: string) {
  const db = createServerClient({ admin: true })
  const hashed = hashToken(rawToken)
  assertInvitationLinkContrast()

  const { data: invitation, error: lookupError } = await db
    .from('client_invitations')
    .select('id, token')
    .eq('id', invitationId)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (lookupError || !invitation) {
    throw new Error('Invalid or expired invitation')
  }

  if (invitation.token !== hashed && invitation.token !== rawToken) {
    throw new Error('Invalid or expired invitation')
  }

  const { error } = await db
    .from('client_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitationId)
    .is('used_at', null)

  if (error) {
    console.error('[markInvitationUsed] Error:', error)
    throw new Error('Failed to mark invitation as used')
  }

  return { success: true }
}

/**
 * Revoke an unused invitation - Chef only
 * Sets used_at to now so the token is no longer valid
 */
export async function revokeInvitation(invitationId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('client_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('tenant_id', user.tenantId!)
    .is('used_at', null)

  if (error) throw new Error('Failed to revoke invitation')
  revalidatePath('/clients')
  return { success: true }
}
