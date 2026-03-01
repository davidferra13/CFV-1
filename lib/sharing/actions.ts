// Guest RSVP & Event Sharing Server Actions
// Handles shareable event links, guest RSVPs, and visibility controls.
// Public actions use admin client (bypass RLS) with app-layer token validation.
// Authenticated actions use standard tenant-scoped patterns.

'use server'

import { requireChef, requireClient, getCurrentUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import crypto from 'crypto'
import { shortenUrl } from '@/lib/links/url-shortener'
import { createNotification, getChefAuthUserId } from '@/lib/notifications/actions'
import { verifyTurnstileToken } from '@/lib/security/turnstile'
import { checkRateLimit } from '@/lib/rateLimit'
import {
  buildStructuredDietaryItems,
  evaluateCapacityDecision,
  getReminderOffsetKeys,
  isCriticalRsvpChange,
  resolveRsvpWriteState,
  type StructuredDietaryItem,
} from '@/lib/sharing/policy'
import { EventGuestRowSchema, EventShareSettingsRowSchema } from '@/lib/sharing/row-schemas'

// ============================================================
// SCHEMAS
// ============================================================

const SubmitRSVPSchema = z.object({
  shareToken: z.string().min(1),
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  rsvp_status: z.enum(['attending', 'declined', 'maybe']),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dietary_items: z
    .array(
      z.object({
        subject: z.enum(['guest', 'plus_one']),
        item_type: z.enum(['dietary', 'allergy']),
        label: z.string().min(1),
        severity: z.enum(['preference', 'intolerance', 'anaphylaxis']),
        notes: z.string().optional(),
      })
    )
    .optional(),
  notes: z.string().optional(),
  plus_one: z.boolean().optional(),
  photo_consent: z.boolean().optional(),
  plus_one_name: z.string().optional(),
  plus_one_allergies: z.array(z.string()).optional(),
  plus_one_dietary: z.array(z.string()).optional(),
  data_processing_consent: z.boolean().optional(),
  marketing_opt_in: z.boolean().optional(),
  captcha_token: z.string().max(4096).optional().or(z.literal('')),
})

const UpdateRSVPSchema = z.object({
  guestToken: z.string().min(1),
  full_name: z.string().min(1).optional(),
  rsvp_status: z.enum(['attending', 'declined', 'maybe']).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dietary_items: z
    .array(
      z.object({
        subject: z.enum(['guest', 'plus_one']),
        item_type: z.enum(['dietary', 'allergy']),
        label: z.string().min(1),
        severity: z.enum(['preference', 'intolerance', 'anaphylaxis']),
        notes: z.string().optional(),
      })
    )
    .optional(),
  notes: z.string().optional(),
  plus_one: z.boolean().optional(),
  photo_consent: z.boolean().optional(),
  plus_one_name: z.string().optional(),
  plus_one_allergies: z.array(z.string()).optional(),
  plus_one_dietary: z.array(z.string()).optional(),
  data_processing_consent: z.boolean().optional(),
  marketing_opt_in: z.boolean().optional(),
  captcha_token: z.string().max(4096).optional().or(z.literal('')),
})

const VisibilitySettingsSchema = z.object({
  show_date_time: z.boolean().optional(),
  show_location: z.boolean().optional(),
  show_occasion: z.boolean().optional(),
  show_menu: z.boolean().optional(),
  show_dietary_info: z.boolean().optional(),
  show_special_requests: z.boolean().optional(),
  show_guest_list: z.boolean().optional(),
  show_chef_name: z.boolean().optional(),
})

const AddGuestManuallySchema = z.object({
  eventId: z.string().uuid(),
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
})

const CreateViewerInviteForEventSchema = z.object({
  eventId: z.string().uuid(),
  invited_name: z.string().max(120).optional(),
  invited_email: z.string().email().optional().or(z.literal('')),
  note: z.string().max(500).optional(),
  single_use: z.boolean().optional(),
  allow_join_request: z.boolean().optional(),
  allow_book_own: z.boolean().optional(),
})

const CreateViewerInviteFromGuestSchema = z.object({
  shareToken: z.string().min(1),
  guestToken: z.string().min(32),
  invited_name: z.string().max(120).optional(),
  invited_email: z.string().email().optional().or(z.literal('')),
  note: z.string().max(500).optional(),
  single_use: z.boolean().optional(),
})

const CreateGuestInviteFromGuestSchema = z.object({
  shareToken: z.string().min(1),
  guestToken: z.string().min(32),
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  note: z.string().max(500).optional(),
})

const ViewerIntentSchema = z.object({
  viewerToken: z.string().min(32),
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  intent: z.enum(['join_event', 'book_own']),
  note: z.string().max(500).optional(),
  captcha_token: z.string().max(4096).optional().or(z.literal('')),
})

const ResolveJoinRequestSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(['approve', 'deny']),
  resolution_note: z.string().max(500).optional(),
})

const UpdateEventShareAdvancedSettingsSchema = z.object({
  eventShareId: z.string().uuid(),
  require_join_approval: z.boolean().optional(),
  rsvp_deadline_at: z.string().datetime().nullable().optional(),
  reminders_enabled: z.boolean().optional(),
  reminder_schedule: z.array(z.enum(['7d', '3d', '24h', 'deadline'])).optional(),
  enforce_capacity: z.boolean().optional(),
  waitlist_enabled: z.boolean().optional(),
  max_capacity: z.number().int().positive().nullable().optional(),
})

const UpdateInvitePermissionsSchema = z.object({
  inviteId: z.string().uuid(),
  single_use: z.boolean().optional(),
  allow_join_request: z.boolean().optional(),
  allow_book_own: z.boolean().optional(),
  expires_at: z.string().datetime().nullable().optional(),
})

const RevokeInviteSchema = z.object({
  inviteId: z.string().uuid(),
  reason: z.string().max(300).optional(),
})

const SendEventReminderSchema = z.object({
  eventId: z.string().uuid(),
  cadence: z.enum(['7d', '3d', '24h', 'deadline']),
})

const DraftGuestSegmentMessageSchema = z.object({
  eventId: z.string().uuid(),
  segment: z.enum(['pending', 'attending', 'waitlisted', 'allergies']),
})

const LogGuestSegmentMessageSchema = z.object({
  eventId: z.string().uuid(),
  segment: z.enum(['pending', 'attending', 'waitlisted', 'allergies']),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(6000),
  recipientCount: z.number().int().min(0),
})

const GuestPortalLookupSchema = z.object({
  eventId: z.string().uuid(),
  secureToken: z.string().min(32),
})

const SaveGuestPortalRSVPSchema = z.object({
  eventId: z.string().uuid(),
  secureToken: z.string().min(32),
  full_name: z.string().min(1, 'Full name is required'),
  attending_status: z.enum(['yes', 'no']),
  dietary_notes: z.string().optional(),
  accessibility_notes: z.string().optional(),
  menu_preference_note: z.string().optional(),
  additional_note: z.string().optional(),
  final_confirmation: z.boolean(),
  age_confirmed: z.boolean().optional(),
  cannabis_participation: z.enum(['participate', 'not_consume', 'undecided']).optional(),
  familiarity_level: z
    .enum(['first_time', 'occasional', 'experienced', 'regular', 'new', 'light', 'moderate'])
    .optional(),
  consumption_method: z
    .enum([
      'smoking',
      'edibles',
      'tincture',
      'other',
      'infused_course',
      'paired_noninfused',
      'skip_infusion',
      'unsure',
    ])
    .optional(),
  edible_experience: z.enum(['yes', 'no', 'unsure', 'none', 'low', 'moderate', 'high']).optional(),
  preferred_dose_note: z.string().optional(),
  comfort_notes: z.string().optional(),
  discuss_in_person_flag: z.boolean().optional(),
  voluntary_acknowledgment: z.boolean().optional(),
  alcohol_acknowledgment: z.boolean().optional(),
  transportation_acknowledgment: z.boolean().optional(),
})

export type SubmitRSVPInput = z.infer<typeof SubmitRSVPSchema>
export type UpdateRSVPInput = z.infer<typeof UpdateRSVPSchema>
export type VisibilitySettings = z.infer<typeof VisibilitySettingsSchema>
export type SaveGuestPortalRSVPInput = z.infer<typeof SaveGuestPortalRSVPSchema>
export type ViewerIntentInput = z.infer<typeof ViewerIntentSchema>

function parseEventDateTime(eventDate: string, timeValue?: string | null) {
  const safeTime = timeValue && /^\d{2}:\d{2}/.test(timeValue) ? timeValue.slice(0, 5) : '18:00'
  return new Date(`${eventDate}T${safeTime}:00`)
}

function parseEventEndOfDay(eventDate: string) {
  return new Date(`${eventDate}T23:59:59`)
}

function parseInviteExpiry(eventDate: string, existingExpiry?: string | null) {
  const defaultExpiry = new Date(parseEventEndOfDay(eventDate).getTime() + 30 * 24 * 60 * 60 * 1000)
  if (!existingExpiry) return defaultExpiry.toISOString()
  const existing = new Date(existingExpiry)
  return existing < defaultExpiry ? existing.toISOString() : defaultExpiry.toISOString()
}

function parseEditCutoff(
  eventDate: string,
  arrivalTime?: string | null,
  serveTime?: string | null
) {
  return parseEventDateTime(eventDate, arrivalTime || serveTime || '18:00')
}

function parseNotesToList(notes?: string) {
  if (!notes) return []
  return notes
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30)
}

function parseShareSettingsRow(row: unknown) {
  const parsed = EventShareSettingsRowSchema.safeParse(row)
  if (!parsed.success) {
    throw new Error('RSVP sharing schema mismatch. Apply latest database migrations.')
  }
  return parsed.data
}

function parseGuestRow(row: unknown) {
  const parsed = EventGuestRowSchema.safeParse(row)
  if (!parsed.success) {
    throw new Error('RSVP guest schema mismatch. Apply latest database migrations.')
  }
  return parsed.data
}

function deriveAttendingStatus(rsvpStatus: string) {
  if (rsvpStatus === 'attending') return 'yes'
  if (rsvpStatus === 'declined') return 'no'
  return null
}

async function enforcePublicActionRateLimit(key: string, max: number, windowMs: number) {
  await checkRateLimit(`rsvp-public:${key}`, max, windowMs)
}

async function verifyCaptchaIfProvided(token?: string, ipHint?: string) {
  if (!token) return
  const result = await verifyTurnstileToken(token, ipHint)
  if (!result.success) {
    throw new Error(result.error || 'CAPTCHA verification failed')
  }
}

async function trackInviteEvent(params: {
  supabase: any
  tenantId: string
  eventId: string
  inviteId?: string | null
  eventType:
    | 'viewed'
    | 'join_requested'
    | 'join_approved'
    | 'join_denied'
    | 'book_own_requested'
    | 'guest_invited'
    | 'revoked'
  metadata?: Record<string, unknown>
}) {
  await ((params.supabase as any).from('event_share_invite_events').insert({
    tenant_id: params.tenantId,
    event_id: params.eventId,
    invite_id: params.inviteId || null,
    event_type: params.eventType,
    metadata: params.metadata || null,
  }) as any)
}

async function syncGuestDietaryItems(params: {
  supabase: any
  tenantId: string
  eventId: string
  guestId: string
  items: StructuredDietaryItem[]
}) {
  await ((params.supabase as any)
    .from('event_guest_dietary_items')
    .delete()
    .eq('guest_id', params.guestId) as any)

  if (params.items.length === 0) return

  const payload = params.items.map((item) => ({
    tenant_id: params.tenantId,
    event_id: params.eventId,
    guest_id: params.guestId,
    subject: item.subject,
    item_type: item.item_type,
    label: item.label,
    severity: item.severity,
    notes: item.notes || null,
  }))

  await ((params.supabase as any).from('event_guest_dietary_items').insert(payload) as any)
}

async function logRsvpAudit(params: {
  supabase: any
  tenantId: string
  eventId: string
  guestId: string
  guestToken: string
  action: string
  beforeValues?: Record<string, unknown> | null
  afterValues?: Record<string, unknown> | null
  dietaryItems: StructuredDietaryItem[]
  changedBy?: string
}) {
  const critical = isCriticalRsvpChange(
    params.beforeValues || null,
    params.afterValues || null,
    params.dietaryItems
  )
  await ((params.supabase as any).from('event_guest_rsvp_audit').insert({
    tenant_id: params.tenantId,
    event_id: params.eventId,
    guest_id: params.guestId,
    guest_token: params.guestToken,
    action: params.action,
    before_values: params.beforeValues || null,
    after_values: params.afterValues || null,
    is_critical: critical.critical,
    reason: critical.reason,
    changed_by: params.changedBy || 'public_token',
  }) as any)

  if (critical.critical) {
    try {
      const chefAuthId = await getChefAuthUserId(params.tenantId)
      if (chefAuthId) {
        await createNotification({
          tenantId: params.tenantId,
          recipientId: chefAuthId,
          category: 'client',
          action: 'guest_dietary_alert',
          title: 'Critical RSVP change detected',
          body: critical.reason || 'Guest RSVP changed in a critical way.',
          eventId: params.eventId,
        })
      }
    } catch (err) {
      console.error('[logRsvpAudit] Non-blocking notification failed:', err)
    }
  }
}

async function getCapacityDecision(params: {
  supabase: any
  shareId: string
  shareEventId: string
  enforceCapacity: boolean
  waitlistEnabled: boolean
  maxCapacity: number | null
  fallbackCapacity: number | null
  requestedAttending: boolean
  excludeGuestId?: string | null
}) {
  const capacityLimit = params.maxCapacity || params.fallbackCapacity || null
  let query = params.supabase
    .from('event_guests')
    .select('*', { count: 'exact', head: true })
    .eq('event_share_id', params.shareId)
    .eq('rsvp_status', 'attending')
    .neq('attendance_queue_status', 'waitlisted')

  if (params.excludeGuestId) {
    query = query.neq('id', params.excludeGuestId)
  }

  const { count: currentAttending } = await query

  return evaluateCapacityDecision({
    currentAttending: currentAttending || 0,
    capacityLimit,
    enforceCapacity: params.enforceCapacity,
    waitlistEnabled: params.waitlistEnabled,
    requestedAttending: params.requestedAttending,
  })
}

// ============================================================
// CLIENT ACTIONS (Authenticated)
// ============================================================

/**
 * Create a shareable link for an event (client-only).
 * Generates a unique token and returns the share URL.
 * If a share already exists for this event+client, returns the existing one.
 */
export async function createEventShare(eventId: string) {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Verify client owns this event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, tenant_id, client_id')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found or access denied')
  }

  // Check for existing active share
  const { data: existingShare } = await supabase
    .from('event_shares')
    .select('id, token, is_active, visibility_settings')
    .eq('event_id', eventId)
    .eq('created_by_client_id', user.entityId)
    .eq('is_active', true)
    .single()

  if (existingShare) {
    const fullShareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${existingShare.token}`
    // Shorten URL (non-blocking — fall back to full URL if shortening fails)
    let shareUrl = fullShareUrl
    try {
      const shortened = await shortenUrl(fullShareUrl)
      if (shortened) shareUrl = shortened
    } catch {
      // Non-blocking: use the full URL
    }
    return { success: true, share: existingShare, shareUrl }
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex')

  // Default expiration: 90 days from now.
  // Share tokens should not live forever — they expose guest PII (names, dietary
  // restrictions, allergies). 90 days covers the full event lifecycle.
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 90)

  const { data: share, error } = await supabase
    .from('event_shares')
    .insert({
      tenant_id: event.tenant_id,
      event_id: eventId,
      created_by_client_id: user.entityId,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[createEventShare] Error:', error)
    throw new Error('Failed to create share link')
  }

  const fullShareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${token}`
  // Shorten URL (non-blocking — fall back to full URL if shortening fails)
  let shareUrl = fullShareUrl
  try {
    const shortened = await shortenUrl(fullShareUrl)
    if (shortened) shareUrl = shortened
  } catch {
    // Non-blocking: use the full URL
  }

  revalidatePath(`/my-events/${eventId}`)
  return { success: true, share, shareUrl }
}

/**
 * Revoke (deactivate) a share link (client-only).
 */
export async function revokeEventShare(eventShareId: string) {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('event_shares')
    .update({ is_active: false })
    .eq('id', eventShareId)
    .eq('created_by_client_id', user.entityId)

  if (error) {
    console.error('[revokeEventShare] Error:', error)
    throw new Error('Failed to revoke share link')
  }

  revalidatePath('/my-events')
  return { success: true }
}

/**
 * Add a guest manually to an event (client-only).
 * Creates a guest record with 'pending' RSVP status.
 */
export async function addGuestManually(input: z.infer<typeof AddGuestManuallySchema>) {
  const user = await requireClient()
  const validated = AddGuestManuallySchema.parse(input)
  const normalizedEmail = validated.email ? validated.email.toLowerCase().trim() : null
  const supabase: any = createServerClient()

  // Verify client owns this event
  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id')
    .eq('id', validated.eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) {
    throw new Error('Event not found or access denied')
  }

  // Get or create active share for this event
  let { data: share } = await supabase
    .from('event_shares')
    .select('id')
    .eq('event_id', validated.eventId)
    .eq('created_by_client_id', user.entityId)
    .eq('is_active', true)
    .single()

  if (!share) {
    // Auto-create a share link
    const result = await createEventShare(validated.eventId)
    share = result.share
  }

  const guestToken = crypto.randomBytes(32).toString('hex')

  const { data: guest, error } = await supabase
    .from('event_guests')
    .insert({
      tenant_id: event.tenant_id,
      event_id: validated.eventId,
      event_share_id: share.id,
      guest_token: guestToken,
      full_name: validated.full_name,
      email: normalizedEmail,
      rsvp_status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[addGuestManually] Error:', error)
    throw new Error('Failed to add guest')
  }

  revalidatePath(`/my-events/${validated.eventId}`)
  return { success: true, guest }
}

/**
 * Create a read-only viewer invite link for an event (client-only).
 * Lets hosts share the dinner context with non-party viewers.
 */
export async function createViewerInviteForEvent(
  input: z.infer<typeof CreateViewerInviteForEventSchema>
) {
  const user = await requireClient()
  const validated = CreateViewerInviteForEventSchema.parse(input)
  const normalizedInvitedEmail = validated.invited_email
    ? validated.invited_email.toLowerCase().trim()
    : null
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id, event_date')
    .eq('id', validated.eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) {
    throw new Error('Event not found or access denied')
  }

  const { data: shareData } = await supabase
    .from('event_shares')
    .select('id, token, expires_at')
    .eq('event_id', validated.eventId)
    .eq('created_by_client_id', user.entityId)
    .eq('is_active', true)
    .single()

  let share = shareData as { id: string; token: string; expires_at: string | null } | null
  if (!share) {
    const created = await createEventShare(validated.eventId)
    const createdShare = (created as any).share || {}
    share = {
      id: String(createdShare.id || ''),
      token: String(createdShare.token || ''),
      expires_at: (createdShare.expires_at as string | null) ?? null,
    }
  }

  const viewerToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = parseInviteExpiry(event.event_date, share.expires_at)

  const { data: invite, error: inviteError } = await (supabase
    .from('event_share_invites' as any)
    .insert({
      tenant_id: event.tenant_id,
      event_id: validated.eventId,
      event_share_id: share.id,
      created_by_client_id: user.entityId,
      token: viewerToken,
      audience_role: 'viewer',
      invited_name: validated.invited_name || null,
      invited_email: normalizedInvitedEmail,
      note: validated.note || null,
      single_use: !!validated.single_use,
      allow_join_request: validated.allow_join_request ?? true,
      allow_book_own: validated.allow_book_own ?? true,
      expires_at: expiresAt,
    })
    .select('id')
    .single() as any)

  if (inviteError || !invite) {
    console.error('[createViewerInviteForEvent] Error:', inviteError)
    throw new Error('Failed to create viewer invite')
  }

  const fullViewerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/${viewerToken}`
  let viewerUrl = fullViewerUrl
  try {
    const shortened = await shortenUrl(fullViewerUrl)
    if (shortened) viewerUrl = shortened
  } catch {
    // Non-blocking: fallback to full URL.
  }

  revalidatePath(`/my-events/${validated.eventId}`)
  return { success: true, inviteId: invite.id as string, viewerToken, viewerUrl }
}

/**
 * Update advanced RSVP controls for an event share.
 */
export async function updateEventShareAdvancedSettings(
  input: z.infer<typeof UpdateEventShareAdvancedSettingsSchema>
) {
  const user = await requireClient()
  const validated = UpdateEventShareAdvancedSettingsSchema.parse(input)
  const supabase: any = createServerClient()

  const { data: share } = await supabase
    .from('event_shares')
    .select('id, event_id')
    .eq('id', validated.eventShareId)
    .single()

  if (!share) {
    throw new Error('Share not found')
  }

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', share.event_id)
    .eq('client_id', user.entityId)
    .single()

  if (!event) {
    throw new Error('Access denied')
  }

  const payload: Record<string, unknown> = {}
  if (validated.require_join_approval !== undefined)
    payload.require_join_approval = validated.require_join_approval
  if (validated.rsvp_deadline_at !== undefined)
    payload.rsvp_deadline_at = validated.rsvp_deadline_at
  if (validated.reminders_enabled !== undefined)
    payload.reminders_enabled = validated.reminders_enabled
  if (validated.reminder_schedule !== undefined)
    payload.reminder_schedule = validated.reminder_schedule
  if (validated.enforce_capacity !== undefined)
    payload.enforce_capacity = validated.enforce_capacity
  if (validated.waitlist_enabled !== undefined)
    payload.waitlist_enabled = validated.waitlist_enabled
  if (validated.max_capacity !== undefined) payload.max_capacity = validated.max_capacity

  const { error } = await supabase
    .from('event_shares')
    .update(payload)
    .eq('id', validated.eventShareId)
  if (error) {
    console.error('[updateEventShareAdvancedSettings] Error:', error)
    throw new Error('Failed to update RSVP settings')
  }

  revalidatePath(`/my-events/${share.event_id}`)
  return { success: true }
}

// ============================================================
// CHEF ACTIONS (Authenticated)
// ============================================================

/**
 * Update guest visibility settings for a share (chef-only).
 * Controls what event details guests can see.
 */
export async function updateGuestVisibility(eventShareId: string, settings: VisibilitySettings) {
  const user = await requireChef()
  const validated = VisibilitySettingsSchema.parse(settings)
  const supabase: any = createServerClient()

  // Fetch current settings and merge (partial update)
  const { data: share } = await supabase
    .from('event_shares')
    .select('visibility_settings')
    .eq('id', eventShareId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!share) {
    throw new Error('Share not found or access denied')
  }

  const currentSettings = (share.visibility_settings || {}) as Record<string, boolean>
  const merged = { ...currentSettings, ...validated }

  const { error } = await supabase
    .from('event_shares')
    .update({ visibility_settings: merged })
    .eq('id', eventShareId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateGuestVisibility] Error:', error)
    throw new Error('Failed to update visibility settings')
  }

  revalidatePath('/events')
  return { success: true }
}

async function getEventForUserAccess(
  eventId: string,
  user: Awaited<ReturnType<typeof getCurrentUser>>
) {
  if (!user) throw new Error('Authentication required')
  const supabase: any = createServerClient()

  if (user.role === 'chef') {
    const { data: event } = await supabase
      .from('events')
      .select('id, tenant_id, client_id, guest_count, occasion, event_date')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single()
    if (!event) throw new Error('Event not found')
    return event
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id, client_id, guest_count, occasion, event_date')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()
  if (!event) throw new Error('Event not found')
  return event
}

/**
 * Get all guests for an event (chef or client).
 */
export async function getEventGuests(eventId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Authentication required')

  const supabase: any = createServerClient()

  // Build query based on role
  let query = supabase
    .from('event_guests')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (user.role === 'chef') {
    query = query.eq('tenant_id', user.tenantId!)
  } else {
    // Client -- verify they own the event
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('client_id', user.entityId)
      .single()

    if (!event) throw new Error('Event not found or access denied')
  }

  const { data: guests, error } = await query

  if (error) {
    console.error('[getEventGuests] Error:', error)
    throw new Error('Failed to fetch guests')
  }

  return guests || []
}

/**
 * Get RSVP summary for an event (chef or client).
 * Returns aggregate counts and dietary info.
 */
export async function getEventRSVPSummary(eventId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Authentication required')

  const supabase: any = createServerClient()

  // Verify access
  if (user.role === 'chef') {
    const { data } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single()
    if (!data) throw new Error('Event not found')
  } else {
    const { data } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('client_id', user.entityId)
      .single()
    if (!data) throw new Error('Event not found')
  }

  const { data: summary, error } = await supabase
    .from('event_rsvp_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found (no guests yet)
    console.error('[getEventRSVPSummary] Error:', error)
    throw new Error('Failed to fetch RSVP summary')
  }

  return (
    summary || {
      event_id: eventId,
      total_guests: 0,
      attending_count: 0,
      declined_count: 0,
      maybe_count: 0,
      pending_count: 0,
      waitlisted_count: 0,
      plus_one_count: 0,
      all_dietary_restrictions: [],
      all_allergies: [],
    }
  )
}

/**
 * Get event share(s) for an event (chef or client).
 */
export async function getEventShares(eventId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Authentication required')

  const supabase: any = createServerClient()

  let query = supabase.from('event_shares').select('*').eq('event_id', eventId)

  if (user.role === 'chef') {
    query = query.eq('tenant_id', user.tenantId!)
  } else {
    query = query.eq('created_by_client_id', user.entityId)
  }

  const { data: shares, error } = await query

  if (error) {
    console.error('[getEventShares] Error:', error)
    throw new Error('Failed to fetch shares')
  }

  return shares || []
}

export async function getEventJoinRequests(eventId: string) {
  const user = await getCurrentUser()
  await getEventForUserAccess(eventId, user)

  const supabase = createServerClient({ admin: true })
  const { data, error } = await ((supabase as any)
    .from('event_join_requests')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false }) as any)

  if (error) {
    console.error('[getEventJoinRequests] Error:', error)
    throw new Error('Failed to fetch join requests')
  }

  return data || []
}

export async function resolveEventJoinRequest(input: z.infer<typeof ResolveJoinRequestSchema>) {
  const user = await requireClient()
  const validated = ResolveJoinRequestSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  const { data: request } = await ((supabase as any)
    .from('event_join_requests')
    .select('*')
    .eq('id', validated.requestId)
    .single() as any)

  if (!request) throw new Error('Join request not found')
  if (request.status !== 'pending') throw new Error('This join request has already been resolved')

  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id, client_id')
    .eq('id', request.event_id)
    .eq('client_id', user.entityId)
    .single()

  if (!event) throw new Error('Access denied')

  if (validated.decision === 'deny') {
    await ((supabase as any)
      .from('event_join_requests')
      .update({
        status: 'denied',
        resolved_at: new Date().toISOString(),
        resolved_by_client_id: user.entityId,
        resolution_note: validated.resolution_note || null,
      })
      .eq('id', request.id) as any)

    await trackInviteEvent({
      supabase,
      tenantId: request.tenant_id,
      eventId: request.event_id,
      inviteId: request.invite_id || null,
      eventType: 'join_denied',
    })

    revalidatePath(`/my-events/${request.event_id}`)
    return { success: true, status: 'denied' as const }
  }

  const normalizedEmail = String(request.viewer_email).toLowerCase().trim()
  const { data: existingGuest } = await supabase
    .from('event_guests')
    .select('id, guest_token')
    .eq('event_share_id', request.event_share_id)
    .eq('email', normalizedEmail)
    .maybeSingle()

  let guestId = existingGuest?.id || null
  let guestToken = existingGuest?.guest_token || null

  if (!existingGuest) {
    guestToken = crypto.randomBytes(32).toString('hex')
    const { data: createdGuest, error: guestError } = await supabase
      .from('event_guests')
      .insert({
        tenant_id: request.tenant_id,
        event_id: request.event_id,
        event_share_id: request.event_share_id,
        guest_token: guestToken,
        full_name: request.viewer_name,
        email: normalizedEmail,
        rsvp_status: 'pending',
        notes: request.note
          ? `Approved join request: ${request.note}`
          : 'Approved join request from viewer',
      })
      .select('id')
      .single()

    if (guestError || !createdGuest) {
      throw new Error('Failed to create guest from join request')
    }

    guestId = createdGuest.id
  }

  await ((supabase as any)
    .from('event_join_requests')
    .update({
      status: 'approved',
      resolved_at: new Date().toISOString(),
      resolved_by_client_id: user.entityId,
      resolution_note: validated.resolution_note || null,
      guest_id: guestId,
    })
    .eq('id', request.id) as any)

  if (request.invite_id) {
    await ((supabase as any)
      .from('event_share_invites')
      .update({
        status: 'consumed',
        consumed_at: new Date().toISOString(),
        consumed_by_guest_id: guestId,
      })
      .eq('id', request.invite_id) as any)
  }

  await trackInviteEvent({
    supabase,
    tenantId: request.tenant_id,
    eventId: request.event_id,
    inviteId: request.invite_id || null,
    eventType: 'join_approved',
  })

  revalidatePath(`/my-events/${request.event_id}`)
  return {
    success: true,
    status: 'approved' as const,
    guestToken,
    guestPortalUrl: guestToken
      ? `${process.env.NEXT_PUBLIC_APP_URL}/event/${request.event_id}/guest/${guestToken}`
      : null,
  }
}

export async function getEventShareInvites(eventId: string) {
  const user = await getCurrentUser()
  await getEventForUserAccess(eventId, user)

  const supabase = createServerClient({ admin: true })
  const { data, error } = await ((supabase as any)
    .from('event_share_invites')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false }) as any)

  if (error) {
    console.error('[getEventShareInvites] Error:', error)
    throw new Error('Failed to fetch invites')
  }
  return data || []
}

export async function updateEventShareInvitePermissions(
  input: z.infer<typeof UpdateInvitePermissionsSchema>
) {
  const user = await requireClient()
  const validated = UpdateInvitePermissionsSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  const { data: invite } = await ((supabase as any)
    .from('event_share_invites')
    .select('id, event_id')
    .eq('id', validated.inviteId)
    .single() as any)
  if (!invite) throw new Error('Invite not found')

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', invite.event_id)
    .eq('client_id', user.entityId)
    .single()
  if (!event) throw new Error('Access denied')

  const payload: Record<string, unknown> = {}
  if (validated.single_use !== undefined) payload.single_use = validated.single_use
  if (validated.allow_join_request !== undefined)
    payload.allow_join_request = validated.allow_join_request
  if (validated.allow_book_own !== undefined) payload.allow_book_own = validated.allow_book_own
  if (validated.expires_at !== undefined) payload.expires_at = validated.expires_at

  await ((supabase as any)
    .from('event_share_invites')
    .update(payload)
    .eq('id', validated.inviteId) as any)

  revalidatePath(`/my-events/${invite.event_id}`)
  return { success: true }
}

export async function revokeEventShareInvite(input: z.infer<typeof RevokeInviteSchema>) {
  const user = await requireClient()
  const validated = RevokeInviteSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  const { data: invite } = await ((supabase as any)
    .from('event_share_invites')
    .select('id, event_id, tenant_id')
    .eq('id', validated.inviteId)
    .single() as any)
  if (!invite) throw new Error('Invite not found')

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', invite.event_id)
    .eq('client_id', user.entityId)
    .single()
  if (!event) throw new Error('Access denied')

  await ((supabase as any)
    .from('event_share_invites')
    .update({
      status: 'revoked',
      revoked_reason: validated.reason || null,
    })
    .eq('id', validated.inviteId) as any)

  await trackInviteEvent({
    supabase,
    tenantId: invite.tenant_id,
    eventId: invite.event_id,
    inviteId: invite.id,
    eventType: 'revoked',
    metadata: { reason: validated.reason || null },
  })

  revalidatePath(`/my-events/${invite.event_id}`)
  return { success: true }
}

export async function getEventInviteAnalytics(eventId: string) {
  const user = await getCurrentUser()
  await getEventForUserAccess(eventId, user)
  const supabase = createServerClient({ admin: true })

  const [invitesRes, joinReqRes, eventsRes, leadsRes] = await Promise.all([
    (supabase as any).from('event_share_invites').select('id, view_count').eq('event_id', eventId),
    (supabase as any).from('event_join_requests').select('id, status').eq('event_id', eventId),
    (supabase as any)
      .from('event_share_invite_events')
      .select('event_type')
      .eq('event_id', eventId),
    (supabase as any)
      .from('guest_leads')
      .select('id')
      .eq('event_id', eventId)
      .eq('source', 'viewer_invite'),
  ])

  const invites = invitesRes.data || []
  const joinRequests = joinReqRes.data || []
  const inviteEvents = eventsRes.data || []
  const viewerLeads = leadsRes.data || []

  return {
    inviteCount: invites.length,
    totalViews: invites.reduce((acc: number, row: any) => acc + Number(row.view_count || 0), 0),
    viewedInvites: invites.filter((row: any) => Number(row.view_count || 0) > 0).length,
    joinRequested: joinRequests.length,
    joinApproved: joinRequests.filter((row: any) => row.status === 'approved').length,
    joinDenied: joinRequests.filter((row: any) => row.status === 'denied').length,
    bookOwnRequested:
      inviteEvents.filter((row: any) => row.event_type === 'book_own_requested').length +
      viewerLeads.length,
    guestInvited: inviteEvents.filter((row: any) => row.event_type === 'guest_invited').length,
  }
}

export async function getEventRSVPObservabilitySignals(eventId: string) {
  const user = await getCurrentUser()
  await getEventForUserAccess(eventId, user)
  const supabase = createServerClient({ admin: true })

  const [remindersRes, guestsRes, invitesRes] = await Promise.all([
    (supabase as any)
      .from('rsvp_reminder_log')
      .select('status, created_at')
      .eq('event_id', eventId),
    (supabase as any)
      .from('event_guests')
      .select('id, rsvp_status, attendance_queue_status, created_at, promoted_at')
      .eq('event_id', eventId),
    (supabase as any)
      .from('event_share_invites')
      .select('id, status, view_count, last_viewed_at')
      .eq('event_id', eventId),
  ])

  const reminderRows = (remindersRes.data || []) as Array<{ status: string; created_at: string }>
  const guestRows = (guestsRes.data || []) as Array<{
    id: string
    rsvp_status: string
    attendance_queue_status?: string | null
    created_at: string
    promoted_at?: string | null
  }>
  const inviteRows = (invitesRes.data || []) as Array<{
    id: string
    status: string
    view_count?: number | null
    last_viewed_at?: string | null
  }>

  const now = Date.now()
  const remindersFailed = reminderRows.filter((row) => row.status === 'failed').length
  const remindersQueued = reminderRows.filter((row) => row.status === 'queued').length
  const queueBacklog = reminderRows.filter((row) => {
    if (row.status !== 'queued') return false
    return now - new Date(row.created_at).getTime() > 2 * 60 * 60 * 1000
  }).length
  const waitlistedCount = guestRows.filter(
    (row) => (row.attendance_queue_status || 'none') === 'waitlisted'
  ).length
  const promotedCount = guestRows.filter((row) => !!row.promoted_at).length
  const stalePendingCount = guestRows.filter((row) => {
    if (row.rsvp_status !== 'pending') return false
    return now - new Date(row.created_at).getTime() > 7 * 24 * 60 * 60 * 1000
  }).length
  const highViewActiveInvites = inviteRows.filter(
    (row) => row.status === 'active' && Number(row.view_count || 0) >= 5
  ).length

  const alerts: string[] = []
  if (remindersFailed > 0) alerts.push(`${remindersFailed} reminder deliveries failed.`)
  if (queueBacklog > 0) alerts.push(`${queueBacklog} reminders are queued for over 2 hours.`)
  if (highViewActiveInvites > 0)
    alerts.push(`${highViewActiveInvites} active invites have high views without conversion.`)
  if (stalePendingCount > 0)
    alerts.push(`${stalePendingCount} guests have been pending for over 7 days.`)
  if (waitlistedCount > 0 && promotedCount === 0)
    alerts.push('There are waitlisted guests but no promotions yet.')

  return {
    remindersFailed,
    remindersQueued,
    queueBacklog,
    waitlistedCount,
    promotedCount,
    stalePendingCount,
    highViewActiveInvites,
    alerts,
  }
}

export async function sendEventRSVPReminders(input: z.infer<typeof SendEventReminderSchema>) {
  const validated = SendEventReminderSchema.parse(input)
  const user = await getCurrentUser()
  const event = await getEventForUserAccess(validated.eventId, user)
  const supabase = createServerClient({ admin: true })

  const { data: shareData } = await (supabase as any)
    .from('event_shares')
    .select('id, tenant_id, reminders_enabled')
    .eq('event_id', event.id)
    .eq('is_active', true)
    .single()
  const share = shareData as any

  if (!share) throw new Error('Active share not found for this event')
  if (!share.reminders_enabled) throw new Error('Reminders are disabled for this event')

  const { data: pendingGuestsData } = await (supabase as any)
    .from('event_guests')
    .select('id, full_name, email, attendance_queue_status, rsvp_status')
    .eq('event_share_id', share.id)
    .eq('rsvp_status', 'pending')
    .not('email', 'is', null)

  const recipients = ((pendingGuestsData as any[]) || []).filter((guest: any) => !!guest.email)
  let inserted = 0
  for (const guest of recipients) {
    const reminderKey = `${validated.cadence}:${event.id}`
    const { error } = await ((supabase as any).from('rsvp_reminder_log').insert({
      tenant_id: share.tenant_id,
      event_id: event.id,
      guest_id: guest.id,
      reminder_key: reminderKey,
      delivery_channel: 'draft',
      recipient_email: guest.email,
      status: 'queued',
    }) as any)
    if (!error) inserted += 1
  }

  const subject = `Reminder: RSVP for ${event.occasion || 'your event'}`
  const body = `Quick reminder to RSVP for ${event.occasion || 'this event'} on ${event.event_date}.`

  return {
    success: true,
    cadence: validated.cadence,
    recipientCount: recipients.length,
    queuedCount: inserted,
    subject,
    body,
  }
}

export async function runRSVPReminderSweep(eventId?: string) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'chef') throw new Error('Chef access required')
  const supabase = createServerClient({ admin: true })

  let shareQuery = (supabase as any)
    .from('event_shares')
    .select(
      'id, event_id, tenant_id, reminders_enabled, reminder_schedule, rsvp_deadline_at, is_active'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .eq('reminders_enabled', true)
    .not('rsvp_deadline_at', 'is', null)

  if (eventId) shareQuery = shareQuery.eq('event_id', eventId)
  const { data: sharesData } = await shareQuery
  const shares = (sharesData as any[]) || []

  let queued = 0
  const now = new Date()

  for (const share of shares) {
    const deadline = share.rsvp_deadline_at ? new Date(share.rsvp_deadline_at) : null
    if (!deadline) continue

    const msUntilDeadline = deadline.getTime() - now.getTime()
    const schedule = getReminderOffsetKeys((share as any).reminder_schedule || [])
    const dueKeys = schedule.filter((key) => {
      const targetMs =
        key === '7d'
          ? 7 * 24 * 60 * 60 * 1000
          : key === '3d'
            ? 3 * 24 * 60 * 60 * 1000
            : key === '24h'
              ? 24 * 60 * 60 * 1000
              : 0
      const delta = Math.abs(msUntilDeadline - targetMs)
      return delta <= 2 * 60 * 60 * 1000 // 2h window
    })

    if (dueKeys.length === 0) continue

    const { data: pendingGuestsData } = await (supabase as any)
      .from('event_guests')
      .select('id, email, rsvp_status, attendance_queue_status')
      .eq('event_share_id', share.id)
      .eq('rsvp_status', 'pending')
      .not('email', 'is', null)

    for (const guest of (pendingGuestsData as any[]) || []) {
      for (const cadence of dueKeys) {
        const reminderKey = `${cadence}:${share.event_id}`
        const { error } = await ((supabase as any).from('rsvp_reminder_log').insert({
          tenant_id: share.tenant_id,
          event_id: share.event_id,
          guest_id: guest.id,
          reminder_key: reminderKey,
          delivery_channel: 'draft',
          recipient_email: guest.email,
          status: 'queued',
        }) as any)
        if (!error) queued += 1
      }
    }
  }

  return { success: true, queued }
}

export async function draftGuestSegmentMessage(
  input: z.infer<typeof DraftGuestSegmentMessageSchema>
) {
  const validated = DraftGuestSegmentMessageSchema.parse(input)
  const user = await getCurrentUser()
  const event = await getEventForUserAccess(validated.eventId, user)
  const supabase = createServerClient({ admin: true })

  const { data: guests } = await supabase
    .from('event_guests')
    .select('id, full_name, email, rsvp_status, allergies, attendance_queue_status')
    .eq('event_id', validated.eventId)
    .not('email', 'is', null)

  const rows = guests || []
  const recipients = rows.filter((guest: any) => {
    if (validated.segment === 'pending') {
      return (
        guest.rsvp_status === 'pending' &&
        (guest.attendance_queue_status || 'none') !== 'waitlisted'
      )
    }
    if (validated.segment === 'attending') return guest.rsvp_status === 'attending'
    if (validated.segment === 'waitlisted')
      return (guest.attendance_queue_status || 'none') === 'waitlisted'
    return Array.isArray(guest.allergies) && guest.allergies.length > 0
  })

  const subjectMap: Record<(typeof validated)['segment'], string> = {
    pending: `RSVP reminder for ${event.occasion || 'your event'}`,
    attending: `Event update for ${event.occasion || 'your event'}`,
    waitlisted: `Waitlist update for ${event.occasion || 'your event'}`,
    allergies: `Dietary confirmation for ${event.occasion || 'your event'}`,
  }

  const bodyMap: Record<(typeof validated)['segment'], string> = {
    pending: `Please confirm your RSVP for ${event.occasion || 'this event'} on ${event.event_date}.`,
    attending: `Looking forward to hosting you at ${event.occasion || 'this event'} on ${event.event_date}.`,
    waitlisted: `You are currently on the waitlist for ${event.occasion || 'this event'}. We will update you if a seat opens.`,
    allergies: `Please reconfirm your allergy details for ${event.occasion || 'this event'} so we can prepare safely.`,
  }

  return {
    segment: validated.segment,
    subject: subjectMap[validated.segment],
    body: bodyMap[validated.segment],
    recipientCount: recipients.length,
    recipients: recipients.map((guest: any) => ({
      id: guest.id,
      name: guest.full_name,
      email: guest.email,
    })),
  }
}

export async function logGuestSegmentMessage(input: z.infer<typeof LogGuestSegmentMessageSchema>) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Authentication required')
  const validated = LogGuestSegmentMessageSchema.parse(input)
  const event = await getEventForUserAccess(validated.eventId, user)
  const supabase = createServerClient({ admin: true })

  await ((supabase as any).from('guest_communication_logs').insert({
    tenant_id: event.tenant_id,
    event_id: validated.eventId,
    segment: validated.segment,
    subject: validated.subject,
    body: validated.body,
    recipient_count: validated.recipientCount,
    created_by_auth_user: user.id,
  }) as any)

  return { success: true }
}

export async function getGuestCommunicationLogs(eventId: string) {
  const user = await getCurrentUser()
  await getEventForUserAccess(eventId, user)
  const supabase = createServerClient({ admin: true })

  const { data, error } = await ((supabase as any)
    .from('guest_communication_logs')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false }) as any)

  if (error) {
    console.error('[getGuestCommunicationLogs] Error:', error)
    throw new Error('Failed to fetch communication logs')
  }
  return data || []
}

async function resolveViewerInviteContext(viewerToken: string) {
  const supabase = createServerClient({ admin: true })

  await enforcePublicActionRateLimit(
    `viewer-resolve:${viewerToken.slice(0, 12)}`,
    80,
    15 * 60 * 1000
  )

  const { data: invite } = await (supabase
    .from('event_share_invites' as any)
    .select('*')
    .eq('token', viewerToken)
    .eq('audience_role', 'viewer')
    .maybeSingle() as any)

  if (!invite) return null
  if (invite.status !== 'active') return null
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return null

  const { data: shareData } = await ((supabase as any)
    .from('event_shares')
    .select(
      `id, token, event_id, tenant_id, is_active, expires_at, visibility_settings,
       require_join_approval, rsvp_deadline_at, reminders_enabled, reminder_schedule,
       enforce_capacity, waitlist_enabled, max_capacity`
    )
    .eq('id', invite.event_share_id)
    .maybeSingle() as any)
  const share = shareData as any

  if (!share || !share.is_active) return null
  if (share.expires_at && new Date(share.expires_at) < new Date()) return null

  const { data: event } = await supabase
    .from('events')
    .select(
      `id, tenant_id, status, event_date, serve_time, arrival_time, guest_count, occasion, service_style,
       location_address, location_city, location_state, location_zip, location_notes,
       dietary_restrictions, allergies, special_requests`
    )
    .eq('id', share.event_id)
    .maybeSingle()

  if (!event || event.status === 'cancelled') return null

  return { invite, share, event, supabase }
}

/**
 * Guest creates a read-only viewer invite from the public share page.
 */
export async function createViewerInviteFromGuest(
  input: z.infer<typeof CreateViewerInviteFromGuestSchema>
) {
  const validated = CreateViewerInviteFromGuestSchema.parse(input)
  const normalizedInvitedEmail = validated.invited_email
    ? validated.invited_email.toLowerCase().trim()
    : null
  const supabase = createServerClient({ admin: true })
  await enforcePublicActionRateLimit(
    `guest-viewer-invite:${validated.guestToken.slice(0, 16)}`,
    20,
    60 * 60 * 1000
  )

  const { data: share } = await supabase
    .from('event_shares')
    .select('id, event_id, tenant_id, is_active, expires_at')
    .eq('token', validated.shareToken)
    .eq('is_active', true)
    .single()

  if (!share) {
    throw new Error('Invalid or expired share link')
  }
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    throw new Error('This share link has expired')
  }

  const { data: invitingGuest } = await supabase
    .from('event_guests')
    .select('id, full_name, event_share_id')
    .eq('guest_token', validated.guestToken)
    .eq('event_share_id', share.id)
    .maybeSingle()

  if (!invitingGuest) {
    throw new Error('Only an invited guest can share this event')
  }

  const { data: event } = await supabase
    .from('events')
    .select('event_date')
    .eq('id', share.event_id)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  const viewerToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = parseInviteExpiry(event.event_date, share.expires_at)

  const { data: invite, error: inviteError } = await (supabase
    .from('event_share_invites' as any)
    .insert({
      tenant_id: share.tenant_id,
      event_id: share.event_id,
      event_share_id: share.id,
      created_by_guest_token: validated.guestToken,
      token: viewerToken,
      audience_role: 'viewer',
      invited_name: validated.invited_name || null,
      invited_email: normalizedInvitedEmail,
      note: validated.note || null,
      single_use: !!validated.single_use,
      expires_at: expiresAt,
    })
    .select('id')
    .single() as any)

  if (inviteError || !invite) {
    console.error('[createViewerInviteFromGuest] Error:', inviteError)
    throw new Error('Failed to create viewer invite')
  }

  await trackInviteEvent({
    supabase,
    tenantId: share.tenant_id,
    eventId: share.event_id,
    inviteId: invite.id as string,
    eventType: 'guest_invited',
    metadata: { origin: 'guest', mode: 'viewer' },
  })

  const fullViewerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/${viewerToken}`
  let viewerUrl = fullViewerUrl
  try {
    const shortened = await shortenUrl(fullViewerUrl)
    if (shortened) viewerUrl = shortened
  } catch {
    // Non-blocking: fallback to full URL.
  }

  return { success: true, inviteId: invite.id as string, viewerToken, viewerUrl }
}

/**
 * Guest directly invites someone as a new pending guest.
 */
export async function createGuestInviteFromGuest(
  input: z.infer<typeof CreateGuestInviteFromGuestSchema>
) {
  const validated = CreateGuestInviteFromGuestSchema.parse(input)
  const normalizedEmail = validated.email ? validated.email.toLowerCase().trim() : null
  const supabase = createServerClient({ admin: true })
  await enforcePublicActionRateLimit(
    `guest-guest-invite:${validated.guestToken.slice(0, 16)}`,
    20,
    60 * 60 * 1000
  )

  const { data: share } = await supabase
    .from('event_shares')
    .select('id, event_id, tenant_id, token, is_active, expires_at')
    .eq('token', validated.shareToken)
    .eq('is_active', true)
    .single()

  if (!share) {
    throw new Error('Invalid or expired share link')
  }
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    throw new Error('This share link has expired')
  }

  const { data: invitingGuest } = await supabase
    .from('event_guests')
    .select('id, full_name, event_share_id')
    .eq('guest_token', validated.guestToken)
    .eq('event_share_id', share.id)
    .maybeSingle()

  if (!invitingGuest) {
    throw new Error('Only an invited guest can add another guest')
  }

  if (normalizedEmail) {
    const { data: existing } = await supabase
      .from('event_guests')
      .select('id, guest_token')
      .eq('event_share_id', share.id)
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      return {
        success: true,
        alreadyExists: true,
        guestToken: existing.guest_token,
        guestPortalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/event/${share.event_id}/guest/${existing.guest_token}`,
      }
    }
  }

  const guestToken = crypto.randomBytes(32).toString('hex')
  const { data: guest, error: guestError } = await supabase
    .from('event_guests')
    .insert({
      tenant_id: share.tenant_id,
      event_id: share.event_id,
      event_share_id: share.id,
      guest_token: guestToken,
      full_name: validated.full_name,
      email: normalizedEmail,
      rsvp_status: 'pending',
      notes: validated.note
        ? `Guest invite request from ${invitingGuest.full_name}: ${validated.note}`
        : `Guest invite request from ${invitingGuest.full_name}`,
    })
    .select('id')
    .single()

  if (guestError || !guest) {
    console.error('[createGuestInviteFromGuest] Error:', guestError)
    throw new Error('Failed to create guest invite')
  }

  const inviteToken = crypto.randomBytes(32).toString('hex')
  const { data: event } = await supabase
    .from('events')
    .select('event_date')
    .eq('id', share.event_id)
    .single()

  const expiresAt = event ? parseInviteExpiry(event.event_date, share.expires_at) : null

  await (supabase.from('event_share_invites' as any).insert({
    tenant_id: share.tenant_id,
    event_id: share.event_id,
    event_share_id: share.id,
    created_by_guest_token: validated.guestToken,
    token: inviteToken,
    audience_role: 'guest',
    status: 'consumed',
    invited_name: validated.full_name,
    invited_email: normalizedEmail,
    note: validated.note || null,
    expires_at: expiresAt,
    consumed_at: new Date().toISOString(),
    consumed_by_guest_id: guest.id,
  }) as any)

  await trackInviteEvent({
    supabase,
    tenantId: share.tenant_id,
    eventId: share.event_id,
    eventType: 'guest_invited',
    metadata: { origin: 'guest', mode: 'guest' },
  })

  try {
    const chefAuthId = await getChefAuthUserId(share.tenant_id)
    if (chefAuthId) {
      await createNotification({
        tenantId: share.tenant_id,
        recipientId: chefAuthId,
        category: 'client',
        action: 'guest_rsvp_received',
        title: `New guest added: ${validated.full_name}`,
        body: `${invitingGuest.full_name} invited an additional guest.`,
        eventId: share.event_id,
      })
    }
  } catch (err) {
    console.error('[createGuestInviteFromGuest] Non-blocking notification failed:', err)
  }

  revalidatePath(`/events/${share.event_id}`)
  revalidatePath(`/my-events/${share.event_id}`)

  return {
    success: true,
    alreadyExists: false,
    guestToken,
    guestPortalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/event/${share.event_id}/guest/${guestToken}`,
  }
}

/**
 * Resolve a viewer invite token into read-only event context.
 */
export async function getViewerEventByToken(viewerToken: string) {
  const context = await resolveViewerInviteContext(viewerToken)
  if (!context) return null

  const { invite, share, event, supabase } = context
  const visibility = (share.visibility_settings || {}) as Record<string, boolean>

  const { data: chef } = await supabase
    .from('chefs')
    .select('display_name, business_name, booking_slug')
    .eq('id', share.tenant_id)
    .single()

  let menus: {
    id: string
    name: string
    description: string | null
    service_style: string | null
  }[] = []
  if (visibility.show_menu) {
    const { data: menuRows } = await supabase
      .from('menus')
      .select('id, name, description, service_style')
      .eq('event_id', event.id)
      .order('created_at', { ascending: true })
    menus = menuRows || []
  }

  try {
    await ((supabase as any)
      .from('event_share_invites')
      .update({
        view_count: Number(invite.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', invite.id) as any)

    await trackInviteEvent({
      supabase,
      tenantId: share.tenant_id,
      eventId: event.id,
      inviteId: invite.id as string,
      eventType: 'viewed',
    })
  } catch (err) {
    console.error('[getViewerEventByToken] Non-blocking analytics write failed:', err)
  }

  return {
    inviteId: invite.id as string,
    inviteToken: viewerToken,
    shareToken: share.token,
    eventId: event.id,
    status: event.status,
    occasion: visibility.show_occasion ? event.occasion : null,
    eventDate: visibility.show_date_time ? event.event_date : null,
    serveTime: visibility.show_date_time ? event.serve_time : null,
    arrivalTime: visibility.show_date_time ? event.arrival_time : null,
    guestCount: event.guest_count,
    serviceStyle: event.service_style,
    location: visibility.show_location
      ? {
          address: event.location_address,
          city: event.location_city,
          state: event.location_state,
          zip: event.location_zip,
          notes: event.location_notes,
        }
      : null,
    chefName: visibility.show_chef_name ? chef?.display_name || chef?.business_name : null,
    chefProfileUrl: chef?.booking_slug ? `/chef/${chef.booking_slug}` : null,
    menus,
    permissions: {
      allow_join_request: invite.allow_join_request ?? true,
      allow_book_own: invite.allow_book_own ?? true,
      single_use: invite.single_use ?? false,
    },
    settings: {
      require_join_approval: share.require_join_approval ?? true,
      rsvp_deadline_at: share.rsvp_deadline_at || null,
    },
    dietaryInfo: visibility.show_dietary_info
      ? {
          restrictions: event.dietary_restrictions,
          allergies: event.allergies,
        }
      : null,
    specialRequests: visibility.show_special_requests ? event.special_requests : null,
    inviteNote: invite.note as string | null,
  }
}

/**
 * Viewer intent: request to join this event or request their own booking follow-up.
 */
export async function submitViewerIntent(input: ViewerIntentInput) {
  const validated = ViewerIntentSchema.parse(input)
  await verifyCaptchaIfProvided(validated.captcha_token || undefined)
  await enforcePublicActionRateLimit(
    `viewer-intent:${validated.viewerToken.slice(0, 16)}:${validated.email.toLowerCase().trim()}`,
    10,
    60 * 60 * 1000
  )
  const context = await resolveViewerInviteContext(validated.viewerToken)

  if (!context) {
    throw new Error('This viewer link is invalid or expired.')
  }

  const { invite, share, event, supabase } = context

  if (invite.single_use && invite.status !== 'active') {
    throw new Error('This invite link has already been used.')
  }

  if (validated.intent === 'join_event') {
    if (invite.allow_join_request === false) {
      throw new Error('This invite does not allow event join requests.')
    }

    const { data: existing } = await supabase
      .from('event_guests')
      .select('id, guest_token')
      .eq('event_share_id', share.id)
      .eq('email', validated.email.toLowerCase().trim())
      .maybeSingle()

    if (existing) {
      return {
        success: true,
        mode: 'join_event' as const,
        alreadyExists: true,
        guestPortalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/event/${event.id}/guest/${existing.guest_token}`,
      }
    }

    const normalizedEmail = validated.email.toLowerCase().trim()
    if (share.require_join_approval) {
      const { data: existingRequest } = await ((supabase as any)
        .from('event_join_requests')
        .select('id')
        .eq('event_id', event.id)
        .eq('viewer_email', normalizedEmail)
        .eq('status', 'pending')
        .maybeSingle() as any)

      if (!existingRequest) {
        const { error: requestError } = await ((supabase as any)
          .from('event_join_requests')
          .insert({
            tenant_id: share.tenant_id,
            event_id: event.id,
            event_share_id: share.id,
            invite_id: invite.id,
            viewer_name: validated.full_name.trim(),
            viewer_email: normalizedEmail,
            note: validated.note?.trim() || null,
            status: 'pending',
          }) as any)

        if (requestError) {
          console.error('[submitViewerIntent] Join request insert error:', requestError)
          throw new Error('Failed to submit join request')
        }
      }

      await trackInviteEvent({
        supabase,
        tenantId: share.tenant_id,
        eventId: event.id,
        inviteId: invite.id as string,
        eventType: 'join_requested',
        metadata: { requiresApproval: true },
      })

      if (invite.single_use) {
        await ((supabase as any)
          .from('event_share_invites')
          .update({
            status: 'consumed',
            consumed_at: new Date().toISOString(),
          })
          .eq('id', invite.id) as any)
      }

      try {
        const chefAuthId = await getChefAuthUserId(share.tenant_id)
        if (chefAuthId) {
          await createNotification({
            tenantId: share.tenant_id,
            recipientId: chefAuthId,
            category: 'client',
            action: 'guest_rsvp_received',
            title: `${validated.full_name} requested to join`,
            body: 'A viewer requested host approval to join this dinner.',
            eventId: event.id,
          })
        }
      } catch (err) {
        console.error('[submitViewerIntent] Non-blocking notification failed:', err)
      }

      return {
        success: true,
        mode: 'join_event' as const,
        pendingApproval: true,
      }
    }

    const capacity = await getCapacityDecision({
      supabase,
      shareId: share.id,
      shareEventId: event.id,
      enforceCapacity: !!share.enforce_capacity,
      waitlistEnabled: !!share.waitlist_enabled,
      maxCapacity: share.max_capacity || null,
      fallbackCapacity: event.guest_count || null,
      requestedAttending: false,
    })
    if (capacity.rejectReason) throw new Error(capacity.rejectReason)

    const guestToken = crypto.randomBytes(32).toString('hex')
    const { data: guest, error: guestError } = await supabase
      .from('event_guests')
      .insert({
        tenant_id: share.tenant_id,
        event_id: event.id,
        event_share_id: share.id,
        guest_token: guestToken,
        full_name: validated.full_name,
        email: normalizedEmail,
        rsvp_status: 'pending',
        notes: validated.note ? `Viewer join request: ${validated.note}` : 'Viewer join request',
      })
      .select('id')
      .single()

    if (guestError || !guest) {
      console.error('[submitViewerIntent] Join request error:', guestError)
      throw new Error('Failed to submit join request')
    }

    await ((supabase as any)
      .from('event_share_invites')
      .update({
        status: 'consumed',
        consumed_at: new Date().toISOString(),
        consumed_by_guest_id: guest.id,
      })
      .eq('id', invite.id) as any)

    await trackInviteEvent({
      supabase,
      tenantId: share.tenant_id,
      eventId: event.id,
      inviteId: invite.id as string,
      eventType: 'join_approved',
      metadata: { autoApproved: true },
    })

    try {
      const chefAuthId = await getChefAuthUserId(share.tenant_id)
      if (chefAuthId) {
        await createNotification({
          tenantId: share.tenant_id,
          recipientId: chefAuthId,
          category: 'client',
          action: 'guest_rsvp_received',
          title: `${validated.full_name} requested to join`,
          body: 'A viewer requested to join this dinner.',
          eventId: event.id,
        })
      }
    } catch (err) {
      console.error('[submitViewerIntent] Non-blocking notification failed:', err)
    }

    return {
      success: true,
      mode: 'join_event' as const,
      alreadyExists: false,
      guestPortalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/event/${event.id}/guest/${guestToken}`,
    }
  }

  if (invite.allow_book_own === false) {
    throw new Error('This invite does not allow booking requests.')
  }

  const normalizedEmail = validated.email.toLowerCase().trim()
  const { data: existingLead } = await (supabase
    .from('guest_leads' as any)
    .select('id')
    .eq('event_id', event.id)
    .eq('email', normalizedEmail)
    .maybeSingle() as any)

  if (existingLead) {
    await (supabase
      .from('guest_leads' as any)
      .update({
        name: validated.full_name.trim(),
        message: validated.note?.trim() || null,
        source: 'viewer_invite',
        source_invite_token: validated.viewerToken,
        source_event_share_id: share.id,
      })
      .eq('id', existingLead.id) as any)
  } else {
    const { error: leadError } = await (supabase.from('guest_leads' as any).insert({
      tenant_id: share.tenant_id,
      event_id: event.id,
      name: validated.full_name.trim(),
      email: normalizedEmail,
      message: validated.note?.trim() || null,
      status: 'new',
      source: 'viewer_invite',
      source_invite_token: validated.viewerToken,
      source_event_share_id: share.id,
      source_join_request_id: null,
    }) as any)

    if (leadError) {
      console.error('[submitViewerIntent] Lead insert error:', leadError)
      throw new Error('Failed to submit request')
    }
  }

  if (invite.single_use) {
    await ((supabase as any)
      .from('event_share_invites')
      .update({
        status: 'consumed',
        consumed_at: new Date().toISOString(),
      })
      .eq('id', invite.id) as any)
  }

  await trackInviteEvent({
    supabase,
    tenantId: share.tenant_id,
    eventId: event.id,
    inviteId: invite.id as string,
    eventType: 'book_own_requested',
  })

  try {
    const chefAuthId = await getChefAuthUserId(share.tenant_id)
    if (chefAuthId) {
      await createNotification({
        tenantId: share.tenant_id,
        recipientId: chefAuthId,
        category: 'lead',
        action: 'new_guest_lead',
        title: `${validated.full_name} wants their own event`,
        body: 'New viewer conversion from event sharing.',
        actionUrl: '/guest-leads',
      })
    }
  } catch (err) {
    console.error('[submitViewerIntent] Non-blocking notification failed:', err)
  }

  return { success: true, mode: 'book_own' as const }
}

async function loadGuestPortalContext(eventId: string, secureToken: string) {
  const supabase = createServerClient({ admin: true })

  const { data: guestData } = await ((supabase as any)
    .from('event_guests')
    .select(
      `id, event_id, tenant_id, event_share_id, guest_token, full_name, email, rsvp_status,
       dietary_restrictions, allergies, notes, plus_one_allergies, plus_one_dietary,
       attendance_queue_status, created_at, updated_at`
    )
    .eq('event_id', eventId)
    .eq('guest_token', secureToken)
    .maybeSingle() as any)
  const guest = guestData as any

  if (!guest) {
    return null
  }

  const { data: event } = await supabase
    .from('events')
    .select(
      `id, tenant_id, client_id, event_date, serve_time, arrival_time, occasion, service_style,
       location_address, location_city, location_state, location_zip, location_notes, status,
       special_requests, cannabis_preference, menu_approval_status, guest_count`
    )
    .eq('id', eventId)
    .single()

  if (!event) {
    return null
  }

  const { data: shareData } = await ((supabase as any)
    .from('event_shares')
    .select(
      `id, is_active, expires_at, visibility_settings, rsvp_deadline_at, enforce_capacity,
       waitlist_enabled, max_capacity`
    )
    .eq('id', guest.event_share_id)
    .maybeSingle() as any)
  const share = shareData as any

  if (!share) {
    return null
  }

  const { data: chef } = await supabase
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', event.tenant_id)
    .maybeSingle()

  const { data: hostClient } = await supabase
    .from('clients')
    .select('full_name')
    .eq('id', event.client_id)
    .maybeSingle()

  const { data: profile } = await (supabase
    .from('guest_event_profile' as any)
    .select('*')
    .eq('event_id', eventId)
    .eq('guest_token', secureToken)
    .maybeSingle() as any)

  const visibility = (share.visibility_settings || {}) as Record<string, boolean>

  let menus: {
    id: string
    name: string
    description: string | null
    service_style: string | null
  }[] = []

  if (visibility.show_menu) {
    const { data: menuRows } = await supabase
      .from('menus')
      .select('id, name, description, service_style')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    menus = menuRows || []
  }

  let guestList: { full_name: string; rsvp_status: string }[] = []
  if (visibility.show_guest_list) {
    const { data: guestRows } = await supabase
      .from('event_guests')
      .select('full_name, rsvp_status')
      .eq('event_share_id', share.id)
      .order('created_at', { ascending: true })

    guestList = (guestRows || []).map((row) => ({
      full_name: row.full_name,
      rsvp_status: row.rsvp_status,
    }))
  }

  return {
    guest,
    event,
    share,
    chef,
    hostClient,
    profile,
    visibility,
    menus,
    guestList,
  }
}

// ============================================================
// PUBLIC ACTIONS (No auth required -- token-validated)
// ============================================================

/**
 * Get event details for the public share page.
 * Uses admin client to bypass RLS.
 * Respects visibility settings -- only returns fields the chef has enabled.
 */
export async function getEventShareByToken(token: string) {
  await enforcePublicActionRateLimit(`share-token:${token.slice(0, 16)}`, 120, 15 * 60 * 1000)
  const supabase = createServerClient({ admin: true })

  // Fetch share by token
  const { data: shareData, error: shareError } = await supabase
    .from('event_shares')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .single()
  const share = shareData ? parseShareSettingsRow(shareData) : null

  if (shareError || !share) {
    return null
  }

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return null
  }

  // Fetch event details
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(
      `
      id, tenant_id, event_date, serve_time, arrival_time,
      guest_count, occasion, service_style,
      location_address, location_city, location_state, location_zip,
      location_notes, dietary_restrictions, allergies,
      special_requests, status
    `
    )
    .eq('id', share.event_id)
    .single()

  if (eventError || !event) {
    return null
  }

  // Don't show cancelled events
  if (event.status === 'cancelled') {
    return null
  }

  // Fetch chef name + profile slug for "book your own" CTA
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, display_name, booking_slug')
    .eq('id', share.tenant_id)
    .single()

  // Fetch menus if visibility allows
  const visibility = share.visibility_settings as Record<string, boolean>
  let menus: {
    id: string
    name: string
    description: string | null
    service_style: string | null
  }[] = []

  if (visibility.show_menu) {
    const { data: menuData } = await supabase
      .from('menus')
      .select('id, name, description, service_style')
      .eq('event_id', share.event_id)

    menus = menuData || []
  }

  // Fetch existing guest list if visibility allows
  let guestList: { full_name: string; rsvp_status: string }[] = []

  if (visibility.show_guest_list) {
    const { data: guests } = await supabase
      .from('event_guests')
      .select('full_name, rsvp_status')
      .eq('event_share_id', share.id)
      .order('created_at', { ascending: true })

    guestList = guests || []
  }

  // Build response respecting visibility
  return {
    shareId: share.id,
    eventId: event.id,
    tenantId: event.tenant_id,
    status: event.status,
    visibility,
    // Always shown
    occasion: visibility.show_occasion ? event.occasion : null,
    // Conditional fields
    eventDate: visibility.show_date_time ? event.event_date : null,
    serveTime: visibility.show_date_time ? event.serve_time : null,
    arrivalTime: visibility.show_date_time ? event.arrival_time : null,
    guestCount: event.guest_count,
    location: visibility.show_location
      ? {
          address: event.location_address,
          city: event.location_city,
          state: event.location_state,
          zip: event.location_zip,
          notes: event.location_notes,
        }
      : null,
    chefName: visibility.show_chef_name ? chef?.display_name || chef?.business_name : null,
    chefProfileUrl: chef?.booking_slug ? `/chef/${chef.booking_slug}` : null,
    menus,
    dietaryInfo: visibility.show_dietary_info
      ? {
          restrictions: event.dietary_restrictions,
          allergies: event.allergies,
        }
      : null,
    specialRequests: visibility.show_special_requests ? event.special_requests : null,
    guestList,
    serviceStyle: event.service_style,
    settings: {
      rsvp_deadline_at: share.rsvp_deadline_at || null,
      enforce_capacity: share.enforce_capacity || false,
      waitlist_enabled: share.waitlist_enabled ?? true,
      max_capacity: share.max_capacity || null,
    },
  }
}

/**
 * Submit an RSVP (public -- no auth required).
 * Validates share token, creates guest record, returns guest token for editing.
 */
export async function submitRSVP(input: SubmitRSVPInput) {
  const validated = SubmitRSVPSchema.parse(input)
  const supabase = createServerClient({ admin: true })
  const normalizedEmail = validated.email ? validated.email.toLowerCase().trim() : null

  await verifyCaptchaIfProvided(validated.captcha_token || undefined)
  await enforcePublicActionRateLimit(
    `rsvp-submit:${validated.shareToken.slice(0, 16)}:${normalizedEmail || validated.full_name.toLowerCase().trim()}`,
    15,
    60 * 60 * 1000
  )

  // Validate share token
  const { data: shareData, error: shareError } = await (supabase as any)
    .from('event_shares')
    .select(
      'id, event_id, tenant_id, is_active, expires_at, rsvp_deadline_at, enforce_capacity, waitlist_enabled, max_capacity'
    )
    .eq('token', validated.shareToken)
    .eq('is_active', true)
    .single()
  const share = shareData ? parseShareSettingsRow(shareData) : null

  if (shareError || !share) {
    throw new Error('Invalid or expired share link')
  }

  const now = new Date()
  if (share.expires_at && new Date(share.expires_at) < now) {
    throw new Error('This share link has expired')
  }
  if (share.rsvp_deadline_at && new Date(share.rsvp_deadline_at) < now) {
    throw new Error('RSVP submissions are closed for this event.')
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, status, guest_count')
    .eq('id', share.event_id)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }
  if (event.status === 'cancelled' || event.status === 'completed') {
    throw new Error('This event is no longer accepting RSVPs.')
  }

  // Check for duplicate email if provided
  if (normalizedEmail) {
    const { data: existing } = await supabase
      .from('event_guests')
      .select('id, guest_token')
      .eq('event_share_id', share.id)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      // Return existing guest token so they can update instead
      return {
        success: true,
        alreadyExists: true,
        guestToken: existing.guest_token,
        message: 'You have already RSVPed. Use the returned token to update your response.',
      }
    }
  }

  const capacity = await getCapacityDecision({
    supabase,
    shareId: share.id,
    shareEventId: share.event_id,
    enforceCapacity: !!share.enforce_capacity,
    waitlistEnabled: !!share.waitlist_enabled,
    maxCapacity: share.max_capacity || null,
    fallbackCapacity: event.guest_count || null,
    requestedAttending: validated.rsvp_status === 'attending',
  })
  if (capacity.rejectReason) {
    throw new Error(capacity.rejectReason)
  }
  const shouldWaitlist = validated.rsvp_status === 'attending' && capacity.shouldWaitlist
  const writeState = resolveRsvpWriteState({
    requestedStatus: validated.rsvp_status,
    shouldWaitlist,
    previousQueueStatus: 'none',
  })
  const dataProcessingConsent = validated.data_processing_consent ?? true
  if (!dataProcessingConsent) {
    throw new Error('Data processing consent is required to submit RSVP.')
  }

  const guestToken = crypto.randomBytes(32).toString('hex')
  const nowIso = new Date().toISOString()

  const { data: guest, error } = await supabase
    .from('event_guests')
    .insert({
      tenant_id: share.tenant_id,
      event_id: share.event_id,
      event_share_id: share.id,
      guest_token: guestToken,
      full_name: validated.full_name,
      email: normalizedEmail,
      rsvp_status: writeState.rsvp_status,
      dietary_restrictions: validated.dietary_restrictions || [],
      allergies: validated.allergies || [],
      notes: validated.notes || null,
      plus_one: validated.plus_one || false,
      photo_consent: validated.photo_consent || false,
      plus_one_name: validated.plus_one_name || null,
      plus_one_allergies: validated.plus_one_allergies || [],
      plus_one_dietary: validated.plus_one_dietary || [],
      attendance_queue_status: writeState.attendance_queue_status,
      waitlisted_at: writeState.waitlisted ? nowIso : null,
      promoted_at: writeState.promoted ? nowIso : null,
      data_processing_consent: dataProcessingConsent,
      data_processing_consent_at: dataProcessingConsent ? nowIso : null,
      marketing_opt_in: validated.marketing_opt_in || false,
    })
    .select()
    .single()

  if (error) {
    console.error('[submitRSVP] Error:', error)
    throw new Error('Failed to submit RSVP')
  }
  const guestRow = parseGuestRow(guest)

  const dietaryItems = buildStructuredDietaryItems({
    dietaryRestrictions: validated.dietary_restrictions || [],
    allergies: validated.allergies || [],
    plusOneDietary: validated.plus_one_dietary || [],
    plusOneAllergies: validated.plus_one_allergies || [],
    explicitItems: validated.dietary_items || [],
  })
  await syncGuestDietaryItems({
    supabase,
    tenantId: share.tenant_id,
    eventId: share.event_id,
    guestId: guestRow.id,
    items: dietaryItems,
  })
  await logRsvpAudit({
    supabase,
    tenantId: share.tenant_id,
    eventId: share.event_id,
    guestId: guestRow.id,
    guestToken,
    action: 'submit',
    beforeValues: null,
    afterValues: {
      rsvp_status: writeState.rsvp_status,
      dietary_restrictions: validated.dietary_restrictions || [],
      allergies: validated.allergies || [],
      attendance_queue_status: writeState.attendance_queue_status,
    },
    dietaryItems,
  })

  // Non-blocking: notify chef of new RSVP
  try {
    const chefAuthId = await getChefAuthUserId(share.tenant_id)
    if (chefAuthId) {
      const hasAllergies =
        (validated.allergies?.length ?? 0) > 0 || (validated.plus_one_allergies?.length ?? 0) > 0
      const hasDietary =
        (validated.dietary_restrictions?.length ?? 0) > 0 ||
        (validated.plus_one_dietary?.length ?? 0) > 0

      await createNotification({
        tenantId: share.tenant_id,
        recipientId: chefAuthId,
        category: 'client',
        action: 'guest_rsvp_received',
        title: `${validated.full_name} RSVPed: ${validated.rsvp_status}`,
        body:
          hasAllergies || hasDietary
            ? `Dietary info included — review before finalizing menu`
            : undefined,
        eventId: share.event_id,
      })

      // Food safety: alert chef about allergies specifically
      if (hasAllergies) {
        const allergyList = [
          ...(validated.allergies || []),
          ...(validated.plus_one_allergies || []),
        ].join(', ')
        await createNotification({
          tenantId: share.tenant_id,
          recipientId: chefAuthId,
          category: 'client',
          action: 'guest_dietary_alert',
          title: `Allergy alert: ${validated.full_name}`,
          body: allergyList,
          eventId: share.event_id,
        })
      }
    }
  } catch (err) {
    console.error('[submitRSVP] Non-blocking notification failed:', err)
  }

  // Non-blocking: sync to hub guest profile
  try {
    const { syncRSVPToHubProfile } = await import('@/lib/hub/integration-actions')
    await syncRSVPToHubProfile({
      email: validated.email ?? null,
      displayName: validated.full_name,
      eventId: share.event_id,
      tenantId: share.tenant_id,
      rsvpStatus: writeState.rsvp_status ?? 'attending',
      allergies: validated.allergies ?? [],
      dietaryRestrictions: validated.dietary_restrictions ?? [],
    })
  } catch (err) {
    console.error('[submitRSVP] Non-blocking hub sync failed:', err)
  }

  revalidatePath(`/events/${share.event_id}`)
  revalidatePath(`/my-events/${share.event_id}`)

  return {
    success: true,
    alreadyExists: false,
    guestToken,
    guestId: guestRow.id,
    waitlisted: writeState.waitlisted,
  }
}

/**
 * Update an existing RSVP (public -- no auth required).
 * Uses guest token for identification.
 */
export async function updateRSVP(input: UpdateRSVPInput) {
  const validated = UpdateRSVPSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  const { guestToken, ...updateData } = validated
  await verifyCaptchaIfProvided(updateData.captcha_token || undefined)
  await enforcePublicActionRateLimit(`rsvp-update:${guestToken.slice(0, 16)}`, 25, 60 * 60 * 1000)

  const { data: existingGuestData } = await (supabase as any)
    .from('event_guests')
    .select('*')
    .eq('guest_token', guestToken)
    .maybeSingle()
  const existingGuest = existingGuestData ? parseGuestRow(existingGuestData) : null
  if (!existingGuest) {
    throw new Error('Guest RSVP not found')
  }

  const { data: shareData } = await (supabase as any)
    .from('event_shares')
    .select(
      'id, event_id, tenant_id, is_active, expires_at, rsvp_deadline_at, enforce_capacity, waitlist_enabled, max_capacity'
    )
    .eq('id', existingGuest.event_share_id)
    .maybeSingle()
  const share = shareData ? parseShareSettingsRow(shareData) : null
  if (!share || !share.is_active) {
    throw new Error('This RSVP link is no longer active.')
  }

  const now = new Date()
  if (share.expires_at && new Date(share.expires_at) < now) {
    throw new Error('This RSVP link has expired.')
  }
  if (share.rsvp_deadline_at && new Date(share.rsvp_deadline_at) < now) {
    throw new Error('RSVP updates are closed for this event.')
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, status, guest_count')
    .eq('id', existingGuest.event_id)
    .single()
  if (!event) {
    throw new Error('Event not found')
  }
  if (event.status === 'cancelled' || event.status === 'completed') {
    throw new Error('This event is no longer accepting RSVP updates.')
  }

  // Build update payload (only include provided fields)
  const payload: Record<string, unknown> = {}
  if (updateData.full_name !== undefined) payload.full_name = updateData.full_name
  if (updateData.rsvp_status !== undefined) {
    const capacity = await getCapacityDecision({
      supabase,
      shareId: share.id,
      shareEventId: share.event_id,
      enforceCapacity: !!share.enforce_capacity,
      waitlistEnabled: !!share.waitlist_enabled,
      maxCapacity: share.max_capacity || null,
      fallbackCapacity: event.guest_count || null,
      requestedAttending: updateData.rsvp_status === 'attending',
      excludeGuestId: existingGuest.id,
    })

    if (capacity.rejectReason) {
      throw new Error(capacity.rejectReason)
    }

    const shouldWaitlist = updateData.rsvp_status === 'attending' && capacity.shouldWaitlist
    const writeState = resolveRsvpWriteState({
      requestedStatus: updateData.rsvp_status,
      shouldWaitlist,
      previousQueueStatus: existingGuest.attendance_queue_status || 'none',
    })
    const nowIso = new Date().toISOString()
    payload.rsvp_status = writeState.rsvp_status
    payload.attendance_queue_status = writeState.attendance_queue_status
    payload.waitlisted_at = writeState.waitlisted ? nowIso : null
    payload.promoted_at = writeState.promoted ? nowIso : null
  }
  if (updateData.dietary_restrictions !== undefined)
    payload.dietary_restrictions = updateData.dietary_restrictions
  if (updateData.allergies !== undefined) payload.allergies = updateData.allergies
  if (updateData.notes !== undefined) payload.notes = updateData.notes
  if (updateData.plus_one !== undefined) payload.plus_one = updateData.plus_one
  if (updateData.photo_consent !== undefined) payload.photo_consent = updateData.photo_consent
  if (updateData.plus_one_name !== undefined) payload.plus_one_name = updateData.plus_one_name
  if (updateData.plus_one_allergies !== undefined)
    payload.plus_one_allergies = updateData.plus_one_allergies
  if (updateData.plus_one_dietary !== undefined)
    payload.plus_one_dietary = updateData.plus_one_dietary
  if (updateData.data_processing_consent !== undefined) {
    payload.data_processing_consent = updateData.data_processing_consent
    payload.data_processing_consent_at = updateData.data_processing_consent
      ? new Date().toISOString()
      : null
  }
  if (updateData.marketing_opt_in !== undefined) {
    payload.marketing_opt_in = updateData.marketing_opt_in
  }

  const { data: guest, error } = await supabase
    .from('event_guests')
    .update(payload)
    .eq('guest_token', guestToken)
    .select()
    .single()

  if (error) {
    console.error('[updateRSVP] Error:', error)
    throw new Error('Failed to update RSVP')
  }
  const guestRow = parseGuestRow(guest)

  const dietaryItems = buildStructuredDietaryItems({
    dietaryRestrictions:
      (updateData.dietary_restrictions as string[] | undefined) ||
      (existingGuest.dietary_restrictions as string[] | null) ||
      [],
    allergies:
      (updateData.allergies as string[] | undefined) ||
      (existingGuest.allergies as string[] | null) ||
      [],
    plusOneDietary:
      (updateData.plus_one_dietary as string[] | undefined) ||
      (existingGuest.plus_one_dietary as string[] | null) ||
      [],
    plusOneAllergies:
      (updateData.plus_one_allergies as string[] | undefined) ||
      (existingGuest.plus_one_allergies as string[] | null) ||
      [],
    explicitItems: updateData.dietary_items || [],
  })
  await syncGuestDietaryItems({
    supabase,
    tenantId: guestRow.tenant_id,
    eventId: guestRow.event_id,
    guestId: guestRow.id,
    items: dietaryItems,
  })
  await logRsvpAudit({
    supabase,
    tenantId: guestRow.tenant_id,
    eventId: guestRow.event_id,
    guestId: guestRow.id,
    guestToken,
    action: 'update',
    beforeValues: {
      rsvp_status: existingGuest.rsvp_status,
      dietary_restrictions: existingGuest.dietary_restrictions,
      allergies: existingGuest.allergies,
      attendance_queue_status: existingGuest.attendance_queue_status || 'none',
    },
    afterValues: {
      rsvp_status: guestRow.rsvp_status,
      dietary_restrictions: guestRow.dietary_restrictions || [],
      allergies: guestRow.allergies || [],
      attendance_queue_status: guestRow.attendance_queue_status || 'none',
    },
    dietaryItems,
  })

  // Cache invalidation - both portals read guest data
  revalidatePath(`/events/${guestRow.event_id}`)
  revalidatePath(`/my-events/${guestRow.event_id}`)

  return {
    success: true,
    guest,
    waitlisted: (guestRow.attendance_queue_status || 'none') === 'waitlisted',
  }
}
/**
 * Get a guest's RSVP by their token (public -- no auth required).
 */
export async function getGuestByToken(guestToken: string) {
  await enforcePublicActionRateLimit(`guest-token:${guestToken.slice(0, 16)}`, 120, 15 * 60 * 1000)
  const supabase = createServerClient({ admin: true })

  const { data: guest, error } = await supabase
    .from('event_guests')
    .select('*')
    .eq('guest_token', guestToken)
    .single()

  if (error) {
    return null
  }

  return guest
}

export async function getGuestEventPortal(eventId: string, secureToken: string) {
  const validated = GuestPortalLookupSchema.parse({ eventId, secureToken })
  const context = await loadGuestPortalContext(validated.eventId, validated.secureToken)

  if (!context) {
    return { state: 'invalid' as const }
  }

  const { event, guest, share, chef, hostClient, profile, visibility, menus, guestList } = context
  const now = new Date()

  if (event.status === 'cancelled') {
    return {
      state: 'cancelled' as const,
      event: {
        title: event.occasion || 'Private Dinner',
        eventDate: event.event_date,
        serveTime: event.serve_time,
      },
    }
  }

  if (!share.is_active) {
    return { state: 'revoked' as const }
  }

  if (share.expires_at && new Date(share.expires_at) < now) {
    return { state: 'expired' as const }
  }

  const editCutoff = parseEditCutoff(event.event_date, event.arrival_time, event.serve_time)
  const eventEnd = parseEventEndOfDay(event.event_date)
  const archiveAt = new Date(eventEnd.getTime() + 90 * 24 * 60 * 60 * 1000)
  const archiveMode = now > archiveAt
  const canEdit = now <= editCutoff && !archiveMode

  const menuFinalized = event.menu_approval_status === 'approved' && menus.length > 0
  const attendingStatus =
    profile?.attending_status ?? deriveAttendingStatus(guest.rsvp_status) ?? 'yes'
  const consumptionMethod = Array.isArray(profile?.consumption_style)
    ? profile.consumption_style[0] || null
    : null

  return {
    state: 'ready' as const,
    event: {
      id: event.id,
      title: event.occasion || 'Private Dinner',
      occasion: event.occasion,
      eventDate: event.event_date,
      serveTime: event.serve_time,
      arrivalTime: event.arrival_time,
      location: {
        address: event.location_address,
        city: event.location_city,
        state: event.location_state,
        zip: event.location_zip,
        notes: event.location_notes,
      },
      hostName: hostClient?.full_name || chef?.display_name || chef?.business_name || 'Event Host',
      hostMessage: event.special_requests,
      serviceStyle: event.service_style,
      cannabisEnabled: !!event.cannabis_preference,
      menuFinalized,
      menus,
      visibility,
      guestList,
    },
    guest: {
      fullName: guest.full_name,
      email: guest.email,
      attendingStatus,
      dietaryNotes: profile?.dietary_notes || guest.dietary_restrictions?.join(', ') || '',
      accessibilityNotes: profile?.accessibility_notes || '',
      menuPreferenceNote: profile?.menu_preference_note || '',
      additionalNote: profile?.additional_note || guest.notes || '',
      ageConfirmed: !!profile?.age_confirmed,
      participationStatus: profile?.cannabis_participation || 'undecided',
      familiarityLevel: profile?.familiarity_level || '',
      consumptionMethod: consumptionMethod || '',
      edibleExperience: profile?.edible_familiarity || '',
      preferredDoseNote: profile?.preferred_dose_note || '',
      comfortNotes: profile?.comfort_notes || '',
      discussInPerson: !!profile?.discuss_in_person_flag,
      voluntaryAcknowledgment: !!profile?.voluntary_acknowledgment,
      alcoholAcknowledgment: !!profile?.alcohol_acknowledgment,
      transportationAcknowledgment: !!profile?.transportation_acknowledgment,
      finalConfirmation: !!profile?.final_confirmation,
      updatedAt: profile?.updated_at || guest.updated_at || guest.created_at,
    },
    lifecycle: {
      editCutoff: editCutoff.toISOString(),
      archiveAt: archiveAt.toISOString(),
      canEdit,
      archiveMode,
    },
  }
}

export async function saveGuestEventPortalRSVP(input: SaveGuestPortalRSVPInput) {
  const validated = SaveGuestPortalRSVPSchema.parse(input)
  await enforcePublicActionRateLimit(
    `portal-rsvp:${validated.secureToken.slice(0, 16)}`,
    20,
    60 * 60 * 1000
  )
  const context = await loadGuestPortalContext(validated.eventId, validated.secureToken)

  if (!context) {
    throw new Error('This link is invalid or no longer available.')
  }

  const { event, guest, share, profile } = context
  const now = new Date()

  if (event.status === 'cancelled') {
    throw new Error('This event has been canceled.')
  }

  if (!share.is_active) {
    throw new Error('This guest link has been revoked.')
  }

  if (share.expires_at && new Date(share.expires_at) < now) {
    throw new Error('This guest link has expired.')
  }

  if (share.rsvp_deadline_at && new Date(share.rsvp_deadline_at) < now) {
    throw new Error('RSVP updates are closed for this event.')
  }

  const editCutoff = parseEditCutoff(event.event_date, event.arrival_time, event.serve_time)
  const eventEnd = parseEventEndOfDay(event.event_date)
  const archiveAt = new Date(eventEnd.getTime() + 90 * 24 * 60 * 60 * 1000)

  if (now > archiveAt) {
    throw new Error('This RSVP is now in archival mode and cannot be edited.')
  }

  if (now > editCutoff) {
    throw new Error('The RSVP update window has closed for this event.')
  }

  if (!validated.final_confirmation) {
    throw new Error('Please confirm that you reviewed the event information.')
  }

  const isCannabisEvent = !!event.cannabis_preference
  const attending = validated.attending_status === 'yes'

  if (isCannabisEvent && attending) {
    if (!validated.age_confirmed) {
      throw new Error('Age confirmation is required for participating guests.')
    }

    if (!validated.cannabis_participation) {
      throw new Error('Please select your participation preference.')
    }

    if (!validated.voluntary_acknowledgment) {
      throw new Error('Please confirm participation is voluntary.')
    }

    if (!validated.alcohol_acknowledgment) {
      throw new Error('Please acknowledge alcohol mixing guidance.')
    }

    if (!validated.transportation_acknowledgment) {
      throw new Error('Please acknowledge transportation responsibility.')
    }
  }

  const supabase = createServerClient({ admin: true })

  const requestedAttending = validated.attending_status === 'yes'
  const capacity = await getCapacityDecision({
    supabase,
    shareId: share.id,
    shareEventId: validated.eventId,
    enforceCapacity: !!share.enforce_capacity,
    waitlistEnabled: !!share.waitlist_enabled,
    maxCapacity: share.max_capacity || null,
    fallbackCapacity: event.guest_count || null,
    requestedAttending,
    excludeGuestId: guest.id,
  })

  if (capacity.rejectReason) {
    throw new Error(capacity.rejectReason)
  }

  const shouldWaitlist = requestedAttending && capacity.shouldWaitlist
  const guestUpdatePayload: Record<string, unknown> = {
    full_name: validated.full_name.trim(),
    rsvp_status: shouldWaitlist
      ? 'pending'
      : validated.attending_status === 'yes'
        ? 'attending'
        : 'declined',
    notes: validated.additional_note?.trim() || null,
    dietary_restrictions: parseNotesToList(validated.dietary_notes),
    attendance_queue_status: shouldWaitlist ? 'waitlisted' : 'none',
    waitlisted_at: shouldWaitlist ? new Date().toISOString() : null,
    promoted_at:
      !shouldWaitlist &&
      requestedAttending &&
      (guest.attendance_queue_status || 'none') === 'waitlisted'
        ? new Date().toISOString()
        : null,
  }

  const { data: updatedGuest, error: guestUpdateError } = await supabase
    .from('event_guests')
    .update(guestUpdatePayload)
    .eq('id', guest.id)
    .eq('event_id', validated.eventId)
    .eq('guest_token', validated.secureToken)
    .select('*')
    .single()

  if (guestUpdateError || !updatedGuest) {
    throw new Error('Failed to save RSVP.')
  }

  const nextConsumptionStyle =
    validated.consumption_method !== undefined
      ? validated.consumption_method
        ? [validated.consumption_method]
        : []
      : Array.isArray(profile?.consumption_style)
        ? profile.consumption_style
        : []

  const profilePayload = {
    event_id: validated.eventId,
    guest_token: validated.secureToken,
    attending_status: validated.attending_status,
    dietary_notes: validated.dietary_notes?.trim() || null,
    accessibility_notes: validated.accessibility_notes?.trim() || null,
    menu_preference_note: validated.menu_preference_note?.trim() || null,
    additional_note: validated.additional_note?.trim() || null,
    cannabis_participation:
      validated.attending_status === 'no'
        ? 'not_consume'
        : validated.cannabis_participation || 'undecided',
    familiarity_level: validated.familiarity_level || null,
    consumption_style: nextConsumptionStyle,
    edible_familiarity: validated.edible_experience || null,
    preferred_dose_note: validated.preferred_dose_note?.trim() || null,
    comfort_notes: validated.comfort_notes?.trim() || null,
    discuss_in_person_flag: !!validated.discuss_in_person_flag,
    age_confirmed: !!validated.age_confirmed,
    voluntary_acknowledgment: !!validated.voluntary_acknowledgment,
    alcohol_acknowledgment: !!validated.alcohol_acknowledgment,
    transportation_acknowledgment: !!validated.transportation_acknowledgment,
    final_confirmation: !!validated.final_confirmation,
  }

  const { error: profileError } = await (supabase
    .from('guest_event_profile' as any)
    .upsert(profilePayload, { onConflict: 'event_id,guest_token' }) as any)

  if (profileError) {
    throw new Error('Failed to save guest profile.')
  }

  const dietaryItems = buildStructuredDietaryItems({
    dietaryRestrictions: parseNotesToList(validated.dietary_notes),
    allergies: (updatedGuest.allergies as string[] | null) || [],
    plusOneDietary: (updatedGuest.plus_one_dietary as string[] | null) || [],
    plusOneAllergies: (updatedGuest.plus_one_allergies as string[] | null) || [],
  })

  await syncGuestDietaryItems({
    supabase,
    tenantId: event.tenant_id,
    eventId: validated.eventId,
    guestId: updatedGuest.id,
    items: dietaryItems,
  })

  await logRsvpAudit({
    supabase,
    tenantId: event.tenant_id,
    eventId: validated.eventId,
    guestId: updatedGuest.id,
    guestToken: validated.secureToken,
    action: 'portal_update',
    beforeValues: guest as any,
    afterValues: updatedGuest as any,
    dietaryItems,
  })

  // Non-blocking: notify chef of dietary info from guest portal
  try {
    const hasDietaryNotes = !!validated.dietary_notes?.trim()
    if (hasDietaryNotes) {
      const chefAuthId = await getChefAuthUserId(event.tenant_id)
      if (chefAuthId) {
        await createNotification({
          tenantId: event.tenant_id,
          recipientId: chefAuthId,
          category: 'client',
          action: 'guest_dietary_alert',
          title: `Dietary update from ${validated.full_name}`,
          body: validated.dietary_notes!.trim(),
          eventId: validated.eventId,
        })
      }
    }
  } catch (err) {
    console.error('[saveGuestEventPortalRSVP] Non-blocking notification failed:', err)
  }

  revalidatePath(`/events/${validated.eventId}`)
  revalidatePath(`/my-events/${validated.eventId}`)

  return {
    success: true,
    attending_status: validated.attending_status,
    cannabis_participation: profilePayload.cannabis_participation || 'undecided',
    editCutoff: editCutoff.toISOString(),
    waitlisted: shouldWaitlist,
  }
}
