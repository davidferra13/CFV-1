export type ScheduledSmsPolicyStatus = 'allowed' | 'blocked' | 'delayed'

export type SmsPolicyClient = {
  id: string
  phone: string | null
  preferred_contact_method?: string | null
  communication_preference?: Record<string, unknown> | null
}

export type SmsPolicyQuietHours = {
  enabled: boolean
  startTime: string | null
  endTime: string | null
  timezone: string | null
}

export type SmsPolicyInput = {
  client: SmsPolicyClient | null
  quietHours?: SmsPolicyQuietHours | null
  recentSmsCount24h?: number
  frequencyCap24h?: number
  now?: Date
}

export type SmsPolicyDecision = {
  status: ScheduledSmsPolicyStatus
  reasons: string[]
  proof: {
    hasRecipient: boolean
    hasPhone: boolean
    phoneValid: boolean
    hasConsent: boolean
    consentSource: string | null
    optedInAt: string | null
    optedOut: boolean
    stopOrHelpState: boolean
    preferredChannel: string | null
    channelPaused: boolean
    regionalEligible: boolean
    quietHoursActive: boolean
    frequencyAllowed: boolean
  }
}

function asPreferenceObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function isTruthyPreference(value: unknown): boolean {
  return value === true || value === 'true' || value === 'yes' || value === 'opted_in'
}

function isOptOutPreference(value: unknown): boolean {
  return value === true || value === 'true' || value === 'yes' || value === 'opted_out'
}

function stringPreference(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function hasFalsePreference(value: unknown): boolean {
  return value === false || value === 'false' || value === 'no' || value === 'ineligible'
}

function isValidSmsPhone(phone: string | null | undefined): boolean {
  if (!phone?.trim()) return false
  const trimmed = phone.trim()
  const normalized = trimmed.startsWith('+')
    ? `+${trimmed.slice(1).replace(/\D/g, '')}`
    : trimmed.replace(/\D/g, '')

  return /^\+[1-9]\d{9,14}$/.test(normalized) || /^[2-9]\d{9}$/.test(normalized)
}

function hasSmsConsent(client: SmsPolicyClient): boolean {
  const prefs = asPreferenceObject(client.communication_preference)
  return (
    isTruthyPreference(prefs.sms_opt_in) ||
    isTruthyPreference(prefs.smsOptIn) ||
    isTruthyPreference(prefs.sms_consent) ||
    isTruthyPreference(prefs.smsConsent) ||
    isTruthyPreference(prefs.transactional_sms_consent) ||
    isTruthyPreference(prefs.transactionalSmsConsent) ||
    prefs.sms_consent_status === 'opted_in' ||
    prefs.smsConsentStatus === 'opted_in'
  )
}

function smsConsentSource(client: SmsPolicyClient): string | null {
  const prefs = asPreferenceObject(client.communication_preference)
  return stringPreference(
    prefs.sms_consent_source,
    prefs.smsConsentSource,
    prefs.sms_opt_in_source,
    prefs.smsOptInSource
  )
}

function smsOptedInAt(client: SmsPolicyClient): string | null {
  const prefs = asPreferenceObject(client.communication_preference)
  return stringPreference(
    prefs.sms_opt_in_at,
    prefs.smsOptInAt,
    prefs.sms_consent_at,
    prefs.smsConsentAt
  )
}

function hasSmsOptOut(client: SmsPolicyClient): boolean {
  const prefs = asPreferenceObject(client.communication_preference)
  return (
    isOptOutPreference(prefs.sms_opt_out) ||
    isOptOutPreference(prefs.smsOptOut) ||
    isOptOutPreference(prefs.sms_unsubscribed) ||
    isOptOutPreference(prefs.smsUnsubscribed) ||
    prefs.sms_consent_status === 'opted_out' ||
    prefs.smsConsentStatus === 'opted_out'
  )
}

function hasStopOrHelpState(client: SmsPolicyClient): boolean {
  const prefs = asPreferenceObject(client.communication_preference)
  return (
    isOptOutPreference(prefs.sms_stop) ||
    isOptOutPreference(prefs.smsStop) ||
    isOptOutPreference(prefs.stop_received) ||
    isOptOutPreference(prefs.stopReceived) ||
    isOptOutPreference(prefs.help_requested) ||
    isOptOutPreference(prefs.helpRequested) ||
    prefs.sms_last_keyword === 'STOP' ||
    prefs.smsLastKeyword === 'STOP'
  )
}

function preferredChannel(client: SmsPolicyClient): string | null {
  const prefs = asPreferenceObject(client.communication_preference)
  return (
    stringPreference(
      client.preferred_contact_method,
      prefs.preferred_channel,
      prefs.preferredChannel,
      prefs.primary_channel,
      prefs.primaryChannel
    )?.toLowerCase() ?? null
  )
}

function channelAllowsSms(channel: string | null): boolean {
  if (!channel) return true
  return channel.includes('sms') || channel.includes('text')
}

function smsChannelPaused(client: SmsPolicyClient): boolean {
  const prefs = asPreferenceObject(client.communication_preference)
  return (
    isOptOutPreference(prefs.sms_paused) ||
    isOptOutPreference(prefs.smsPaused) ||
    isOptOutPreference(prefs.sms_channel_paused) ||
    isOptOutPreference(prefs.smsChannelPaused)
  )
}

function smsRegionEligible(client: SmsPolicyClient): boolean {
  const prefs = asPreferenceObject(client.communication_preference)
  return !(
    hasFalsePreference(prefs.sms_regional_eligible) ||
    hasFalsePreference(prefs.smsRegionalEligible) ||
    hasFalsePreference(prefs.sms_region_allowed) ||
    hasFalsePreference(prefs.smsRegionAllowed)
  )
}

function parseHourMinute(value: string | null | undefined): number | null {
  if (!value) return null
  const [hoursRaw, minutesRaw = '0'] = value.split(':')
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

function localMinutes(now: Date, timezone: string | null | undefined): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone || 'America/New_York',
  }).formatToParts(now)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

function isInQuietHours(quietHours: SmsPolicyQuietHours | null | undefined, now: Date): boolean {
  if (!quietHours?.enabled) return false
  const start = parseHourMinute(quietHours.startTime)
  const end = parseHourMinute(quietHours.endTime)
  if (start === null || end === null || start === end) return false

  const current = localMinutes(now, quietHours.timezone)
  return start < end ? current >= start && current < end : current >= start || current < end
}

export function evaluateScheduledSmsPolicy(input: SmsPolicyInput): SmsPolicyDecision {
  const reasons: string[] = []
  const client = input.client
  const hasRecipient = !!client
  const hasPhone = !!client?.phone?.trim()
  const phoneValid = hasPhone ? isValidSmsPhone(client?.phone) : false
  const hasConsent = client ? hasSmsConsent(client) : false
  const consentSource = client ? smsConsentSource(client) : null
  const optedInAt = client ? smsOptedInAt(client) : null
  const optedOut = client ? hasSmsOptOut(client) : false
  const stopOrHelpState = client ? hasStopOrHelpState(client) : false
  const preferredChannelValue = client ? preferredChannel(client) : null
  const preferredChannelAllowsSms = channelAllowsSms(preferredChannelValue)
  const channelPaused = client ? smsChannelPaused(client) : false
  const regionalEligible = client ? smsRegionEligible(client) : false
  const quietHoursActive = isInQuietHours(input.quietHours, input.now ?? new Date())
  const frequencyCap = input.frequencyCap24h ?? 3
  const frequencyAllowed = (input.recentSmsCount24h ?? 0) < frequencyCap

  if (!hasRecipient) reasons.push('No recipient client is linked')
  if (!hasPhone) reasons.push('Recipient has no SMS phone number')
  if (hasPhone && !phoneValid) reasons.push('Recipient does not have a valid SMS phone number')
  if (!hasConsent) reasons.push('Recipient has no explicit SMS consent')
  if (optedOut) reasons.push('Recipient has opted out of SMS')
  if (stopOrHelpState) reasons.push('Recipient has STOP/HELP handling state')
  if (!preferredChannelAllowsSms) {
    reasons.push(`Recipient prefers ${preferredChannelValue} instead of SMS`)
  }
  if (channelPaused) reasons.push('Recipient SMS channel is paused')
  if (!regionalEligible) reasons.push('Recipient region is not eligible for SMS')
  if (quietHoursActive) reasons.push('Quiet hours are active')
  if (!frequencyAllowed) reasons.push('24-hour SMS frequency cap reached')

  const hardBlocked =
    !hasRecipient ||
    !hasPhone ||
    !phoneValid ||
    !hasConsent ||
    optedOut ||
    stopOrHelpState ||
    !preferredChannelAllowsSms ||
    channelPaused ||
    !regionalEligible
  const delayed = !hardBlocked && (quietHoursActive || !frequencyAllowed)

  return {
    status: hardBlocked ? 'blocked' : delayed ? 'delayed' : 'allowed',
    reasons: reasons.length ? reasons : ['Policy passed'],
    proof: {
      hasRecipient,
      hasPhone,
      phoneValid,
      hasConsent,
      consentSource,
      optedInAt,
      optedOut,
      stopOrHelpState,
      preferredChannel: preferredChannelValue,
      channelPaused,
      regionalEligible,
      quietHoursActive,
      frequencyAllowed,
    },
  }
}
