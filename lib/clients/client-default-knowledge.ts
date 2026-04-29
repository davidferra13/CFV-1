import { z } from 'zod'

export const CLIENT_DEFAULT_KNOWLEDGE_FIELD_KEYS = [
  'identity',
  'food_safety',
  'taste',
  'home_logistics',
  'household',
  'service_defaults',
  'communication',
] as const

export type ClientDefaultKnowledgeScopeKey = (typeof CLIENT_DEFAULT_KNOWLEDGE_FIELD_KEYS)[number]

export type ClientDefaultKnowledgeItem = {
  label: string
  value: string | null
  required: boolean
  fieldKey?: ClientDefaultKnowledgeFieldKey
  provenance?: ClientDefaultKnowledgeProvenance
}

export type ClientDefaultKnowledgeScope = {
  key: ClientDefaultKnowledgeScopeKey
  label: string
  description: string
  source: 'client_profile' | 'client_passport'
  status: 'ready' | 'partial' | 'empty'
  lockedOn: boolean
  items: ClientDefaultKnowledgeItem[]
}

export type ClientDefaultKnowledgePassport = {
  communication_mode: 'direct' | 'delegate_only' | 'delegate_preferred'
  preferred_contact_method: 'email' | 'sms' | 'phone' | 'circle'
  chef_autonomy_level: 'full' | 'high' | 'moderate' | 'low'
  auto_approve_under_cents: number | null
  max_interaction_rounds: number | null
  standing_instructions: string | null
  default_guest_count: number | null
  budget_range_min_cents: number | null
  budget_range_max_cents: number | null
  service_style:
    | 'formal_plated'
    | 'family_style'
    | 'buffet'
    | 'cocktail'
    | 'tasting_menu'
    | 'no_preference'
    | null
  delegate_name: string | null
  delegate_email: string | null
  delegate_phone: string | null
}

export type ClientDefaultKnowledgeSnapshot = {
  profileUpdatedAt: string | null
  passportUpdatedAt: string | null
  passport: ClientDefaultKnowledgePassport
  scopes: ClientDefaultKnowledgeScope[]
  householdProfiles: ClientHouseholdKnowledgeProfile[]
  provenance: ClientDefaultKnowledgeProvenance[]
  reviewQueue: ClientDefaultKnowledgeReviewItem[]
  safetyConfirmation: ClientSafetyConfirmationState
  restatementGuards: ClientRestatementGuard[]
  completion: {
    ready: number
    partial: number
    empty: number
    total: number
  }
}

export type ClientDefaultKnowledgeFieldKey =
  | 'full_name'
  | 'preferred_name'
  | 'email'
  | 'phone'
  | 'address'
  | 'dietary_restrictions'
  | 'dietary_protocols'
  | 'allergies'
  | 'dislikes'
  | 'spice_tolerance'
  | 'favorite_cuisines'
  | 'favorite_dishes'
  | 'wine_beverage_preferences'
  | 'parking_instructions'
  | 'access_instructions'
  | 'kitchen_size'
  | 'kitchen_constraints'
  | 'house_rules'
  | 'equipment_available'
  | 'partner_name'
  | 'children'
  | 'family_notes'
  | 'communication_mode'
  | 'preferred_contact_method'
  | 'chef_autonomy_level'
  | 'auto_approve_under_cents'
  | 'max_interaction_rounds'
  | 'standing_instructions'
  | 'default_guest_count'
  | 'budget_range'
  | 'service_style'
  | 'delegate'

export type ClientDefaultKnowledgeProvenance = {
  fieldKey: ClientDefaultKnowledgeFieldKey
  label: string
  source: 'client_profile' | 'client_passport'
  sourceLabel: string
  value: string | null
  lastConfirmedAt: string | null
  freshness: 'current' | 'review_30d' | 'review_90d' | 'event_scoped'
  safetyCritical: boolean
  editableHref: string
}

export type ClientDefaultKnowledgeAppliedField = {
  fieldKey: ClientDefaultKnowledgeFieldKey
  formField:
    | 'full_name'
    | 'email'
    | 'phone'
    | 'address'
    | 'guest_count'
    | 'budget'
    | 'dietary_notes'
    | 'service_style'
    | 'standing_instructions'
    | 'communication_mode'
  value: string
  sourceLabel: string
  freshness: ClientDefaultKnowledgeProvenance['freshness']
  safetyCritical: boolean
}

export type ClientDefaultKnowledgeApplication = {
  context: 'booking' | 'inquiry' | 'pre_event_checklist' | 'menu_approval' | 'payment_plan' | 'chat'
  appliedFields: ClientDefaultKnowledgeAppliedField[]
  blockedRestatements: ClientRestatementGuard[]
  bannerTitle: string
  bannerItems: string[]
}

export type ClientEventKnowledgeOverride = {
  fieldKey: ClientDefaultKnowledgeFieldKey
  label: string
  accountValue: string | null
  eventValue: string | null
  effectiveValue: string | null
  scope: 'account_default' | 'event_override'
}

export type ClientDefaultKnowledgeReviewItem = {
  id: string
  fieldKey: ClientDefaultKnowledgeFieldKey
  label: string
  proposedValue: string
  sourceLabel: string
  decision: 'pending_client_review'
  action: 'approve' | 'edit' | 'reject'
}

export type ClientSafetyConfirmationState = {
  status: 'current' | 'needs_confirmation' | 'missing'
  fields: {
    fieldKey: 'allergies' | 'dietary_restrictions' | 'dietary_protocols'
    label: string
    value: string | null
    confirmationLabel: string
  }[]
}

export type ClientHouseholdKnowledgeProfile = {
  id: string
  label: string
  role: 'client' | 'partner' | 'child' | 'household'
  facts: ClientDefaultKnowledgeItem[]
}

export type ClientRestatementGuard = {
  formField: ClientDefaultKnowledgeAppliedField['formField']
  fieldKey: ClientDefaultKnowledgeFieldKey
  label: string
  knownValue: string
  action: 'prefill' | 'confirm_instead'
  failureMessage: string
}

export type ClientChefDeltaAlert = {
  changedFields: {
    fieldKey: ClientDefaultKnowledgeFieldKey
    label: string
    before: string | null
    after: string | null
    safetyCritical: boolean
  }[]
  activeEventReviewRequired: boolean
  menuSafetyReviewRequired: boolean
  summary: string
}

export type ClientSaveAsDefaultProposal = {
  fieldKey: ClientDefaultKnowledgeFieldKey
  label: string
  eventValue: string
  currentDefault: string | null
  shouldOfferToggle: boolean
  toggleLabel: string
}

export const UpdateClientDefaultKnowledgeSchema = z
  .object({
    communication_mode: z.enum(['direct', 'delegate_only', 'delegate_preferred']),
    preferred_contact_method: z.enum(['email', 'sms', 'phone', 'circle']),
    chef_autonomy_level: z.enum(['full', 'high', 'moderate', 'low']),
    use_auto_approval: z.boolean(),
    auto_approve_under_cents: z.number().int().min(0).max(10000000).nullable(),
    max_interaction_rounds: z.number().int().min(1).max(20).nullable(),
    use_standing_instructions: z.boolean(),
    standing_instructions: z.string().max(4000).nullable(),
    use_service_defaults: z.boolean(),
    default_guest_count: z.number().int().min(1).max(500).nullable(),
    service_style: z
      .enum([
        'formal_plated',
        'family_style',
        'buffet',
        'cocktail',
        'tasting_menu',
        'no_preference',
      ])
      .nullable(),
    use_budget_range: z.boolean(),
    budget_range_min_cents: z.number().int().min(0).max(10000000).nullable(),
    budget_range_max_cents: z.number().int().min(0).max(10000000).nullable(),
    use_delegate: z.boolean(),
    delegate_name: z.string().max(200).nullable(),
    delegate_email: z.string().email().max(320).nullable().or(z.literal('')),
    delegate_phone: z.string().max(80).nullable(),
  })
  .superRefine((input, ctx) => {
    if (
      input.use_budget_range &&
      input.budget_range_min_cents !== null &&
      input.budget_range_max_cents !== null &&
      input.budget_range_min_cents > input.budget_range_max_cents
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budget_range_max_cents'],
        message: 'Budget max must be greater than or equal to budget min',
      })
    }

    if (
      input.communication_mode !== 'direct' &&
      input.use_delegate &&
      !input.delegate_name?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['delegate_name'],
        message: 'Delegate name is required when delegate communication is enabled',
      })
    }
  })

export type UpdateClientDefaultKnowledgeInput = z.infer<typeof UpdateClientDefaultKnowledgeSchema>

type ClientProfileForDefaults = {
  updated_at?: string | null
  full_name?: string | null
  preferred_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  dietary_restrictions?: string[] | null
  dietary_protocols?: string[] | null
  allergies?: string[] | null
  dislikes?: string[] | null
  spice_tolerance?: string | null
  favorite_cuisines?: string[] | null
  favorite_dishes?: string[] | null
  wine_beverage_preferences?: string | null
  parking_instructions?: string | null
  access_instructions?: string | null
  kitchen_size?: string | null
  kitchen_constraints?: string | null
  house_rules?: string | null
  equipment_available?: string[] | null
  partner_name?: string | null
  children?: string[] | null
  family_notes?: string | null
}

type PassportRowForDefaults = Partial<ClientDefaultKnowledgePassport> & {
  updated_at?: string | null
}

const DEFAULT_PASSPORT: ClientDefaultKnowledgePassport = {
  communication_mode: 'direct',
  preferred_contact_method: 'email',
  chef_autonomy_level: 'moderate',
  auto_approve_under_cents: null,
  max_interaction_rounds: null,
  standing_instructions: null,
  default_guest_count: null,
  budget_range_min_cents: null,
  budget_range_max_cents: null,
  service_style: null,
  delegate_name: null,
  delegate_email: null,
  delegate_phone: null,
}

export function normalizeClientDefaultKnowledgeInput(
  input: UpdateClientDefaultKnowledgeInput
): ClientDefaultKnowledgePassport {
  return {
    communication_mode: input.communication_mode,
    preferred_contact_method: input.preferred_contact_method,
    chef_autonomy_level: input.chef_autonomy_level,
    auto_approve_under_cents: input.use_auto_approval ? input.auto_approve_under_cents : null,
    max_interaction_rounds: input.max_interaction_rounds,
    standing_instructions: input.use_standing_instructions
      ? normalizeOptionalText(input.standing_instructions)
      : null,
    default_guest_count: input.use_service_defaults ? input.default_guest_count : null,
    service_style: input.use_service_defaults ? input.service_style : null,
    budget_range_min_cents: input.use_budget_range ? input.budget_range_min_cents : null,
    budget_range_max_cents: input.use_budget_range ? input.budget_range_max_cents : null,
    delegate_name: input.use_delegate ? normalizeOptionalText(input.delegate_name) : null,
    delegate_email: input.use_delegate ? normalizeOptionalText(input.delegate_email) : null,
    delegate_phone: input.use_delegate ? normalizeOptionalText(input.delegate_phone) : null,
  }
}

export function buildClientDefaultKnowledgeSnapshot(
  profile: ClientProfileForDefaults,
  passportRow: PassportRowForDefaults | null
): ClientDefaultKnowledgeSnapshot {
  const passport: ClientDefaultKnowledgePassport = {
    ...DEFAULT_PASSPORT,
    ...coercePassport(passportRow),
  }

  const scopes: ClientDefaultKnowledgeScope[] = [
    buildScope({
      key: 'identity',
      label: 'Identity',
      description: 'Names, email, phone, and primary address reused across the client portal.',
      source: 'client_profile',
      lockedOn: true,
      items: [
        item('Full name', profile.full_name, true, 'full_name'),
        item('Preferred name', profile.preferred_name, false, 'preferred_name'),
        item('Email', profile.email, true, 'email'),
        item('Phone', profile.phone, false, 'phone'),
        item('Primary address', profile.address, false, 'address'),
      ],
    }),
    buildScope({
      key: 'food_safety',
      label: 'Food safety',
      description: 'Allergies, dietary restrictions, and protocols that should follow every event.',
      source: 'client_profile',
      lockedOn: true,
      items: [
        item('Allergies', formatList(profile.allergies), false, 'allergies'),
        item(
          'Dietary restrictions',
          formatList(profile.dietary_restrictions),
          false,
          'dietary_restrictions'
        ),
        item(
          'Dietary protocols',
          formatList(profile.dietary_protocols),
          false,
          'dietary_protocols'
        ),
      ],
    }),
    buildScope({
      key: 'taste',
      label: 'Taste',
      description: 'Likes, dislikes, spice tolerance, dishes, cuisines, and beverage preferences.',
      source: 'client_profile',
      lockedOn: false,
      items: [
        item(
          'Favorite cuisines',
          formatList(profile.favorite_cuisines),
          false,
          'favorite_cuisines'
        ),
        item('Favorite dishes', formatList(profile.favorite_dishes), false, 'favorite_dishes'),
        item('Dislikes', formatList(profile.dislikes), false, 'dislikes'),
        item('Spice tolerance', profile.spice_tolerance, false, 'spice_tolerance'),
        item(
          'Wine and beverages',
          profile.wine_beverage_preferences,
          false,
          'wine_beverage_preferences'
        ),
      ],
    }),
    buildScope({
      key: 'home_logistics',
      label: 'Home and logistics',
      description: 'Kitchen setup, parking, arrival, house rules, and available equipment.',
      source: 'client_profile',
      lockedOn: false,
      items: [
        item('Kitchen size', profile.kitchen_size, false, 'kitchen_size'),
        item('Kitchen notes', profile.kitchen_constraints, false, 'kitchen_constraints'),
        item('Equipment', formatList(profile.equipment_available), false, 'equipment_available'),
        item('House rules', profile.house_rules, false, 'house_rules'),
        item('Parking instructions', profile.parking_instructions, false, 'parking_instructions'),
        item('Access instructions', profile.access_instructions, false, 'access_instructions'),
      ],
    }),
    buildScope({
      key: 'household',
      label: 'Household',
      description: 'Partner, children, and household notes that prevent repeat questions.',
      source: 'client_profile',
      lockedOn: false,
      items: [
        item('Partner name', profile.partner_name, false, 'partner_name'),
        item('Children', formatList(profile.children), false, 'children'),
        item('Family notes', profile.family_notes, false, 'family_notes'),
      ],
    }),
    buildScope({
      key: 'service_defaults',
      label: 'Service defaults',
      description:
        'Reusable event defaults for headcount, budget, service style, and instructions.',
      source: 'client_passport',
      lockedOn: false,
      items: [
        item(
          'Typical guest count',
          formatNumber(passport.default_guest_count),
          false,
          'default_guest_count'
        ),
        item('Budget range', formatBudgetRange(passport), false, 'budget_range'),
        item('Service style', formatServiceStyle(passport.service_style), false, 'service_style'),
        item(
          'Standing instructions',
          passport.standing_instructions,
          false,
          'standing_instructions'
        ),
        item(
          'Auto approve under',
          formatCents(passport.auto_approve_under_cents),
          false,
          'auto_approve_under_cents'
        ),
      ],
    }),
    buildScope({
      key: 'communication',
      label: 'Communication',
      description: 'How ChefFlow should route contact, approvals, and delegate details by default.',
      source: 'client_passport',
      lockedOn: false,
      items: [
        item(
          'Communication mode',
          formatCommunicationMode(passport.communication_mode),
          true,
          'communication_mode'
        ),
        item(
          'Preferred contact',
          formatContactMethod(passport.preferred_contact_method),
          true,
          'preferred_contact_method'
        ),
        item(
          'Chef autonomy',
          formatAutonomy(passport.chef_autonomy_level),
          true,
          'chef_autonomy_level'
        ),
        item(
          'Max interaction rounds',
          formatNumber(passport.max_interaction_rounds),
          false,
          'max_interaction_rounds'
        ),
        item('Delegate', formatDelegate(passport), false, 'delegate'),
      ],
    }),
  ]
  const provenance = buildProvenance(profile, passport, passportRow?.updated_at ?? null)
  const scopesWithProvenance = attachProvenance(scopes, provenance)
  const householdProfiles = buildHouseholdProfiles(profile)
  const safetyConfirmation = buildSafetyConfirmationState(provenance)
  const restatementGuards = buildClientRestatementGuards(provenance)

  const completion = scopesWithProvenance.reduce(
    (acc, scope) => {
      acc[scope.status] += 1
      acc.total += 1
      return acc
    },
    { ready: 0, partial: 0, empty: 0, total: 0 }
  )

  return {
    profileUpdatedAt: profile.updated_at ?? null,
    passportUpdatedAt: passportRow?.updated_at ?? null,
    passport,
    scopes: scopesWithProvenance,
    householdProfiles,
    provenance,
    reviewQueue: buildDefaultKnowledgeReviewQueue(provenance),
    safetyConfirmation,
    restatementGuards,
    completion,
  }
}

export function buildClientDefaultKnowledgeApplication(
  snapshot: ClientDefaultKnowledgeSnapshot,
  context: ClientDefaultKnowledgeApplication['context']
): ClientDefaultKnowledgeApplication {
  const fields = new Map(snapshot.provenance.map((field) => [field.fieldKey, field]))
  const appliedFields = compactAppliedFields([
    applied(fields.get('full_name'), 'full_name'),
    applied(fields.get('email'), 'email'),
    applied(fields.get('phone'), 'phone'),
    applied(fields.get('address'), 'address'),
    applied(fields.get('default_guest_count'), 'guest_count'),
    applied(fields.get('budget_range'), 'budget'),
    appliedDietary(fields),
    applied(fields.get('service_style'), 'service_style'),
    applied(fields.get('standing_instructions'), 'standing_instructions'),
    applied(fields.get('communication_mode'), 'communication_mode'),
  ]).filter((field) => isFieldRelevantForContext(field.formField, context))

  const blockedRestatements = snapshot.restatementGuards.filter((guard) =>
    appliedFields.some((field) => field.formField === guard.formField)
  )

  return {
    context,
    appliedFields,
    blockedRestatements,
    bannerTitle: appliedFields.length > 0 ? 'Using your saved defaults' : 'No saved defaults yet',
    bannerItems: appliedFields.slice(0, 6).map((field) => `${field.sourceLabel}: ${field.value}`),
  }
}

export function buildEventKnowledgeOverrides(
  snapshot: ClientDefaultKnowledgeSnapshot,
  eventValues: Partial<Record<ClientDefaultKnowledgeFieldKey, string | number | null>>
): ClientEventKnowledgeOverride[] {
  const provenanceByKey = new Map(snapshot.provenance.map((field) => [field.fieldKey, field]))

  return Object.entries(eventValues).map(([key, rawEventValue]) => {
    const fieldKey = key as ClientDefaultKnowledgeFieldKey
    const accountValue = provenanceByKey.get(fieldKey)?.value ?? null
    const eventValue =
      rawEventValue === null || rawEventValue === undefined || rawEventValue === ''
        ? null
        : String(rawEventValue)
    return {
      fieldKey,
      label: provenanceByKey.get(fieldKey)?.label ?? fieldKey.replace(/_/g, ' '),
      accountValue,
      eventValue,
      effectiveValue: eventValue ?? accountValue,
      scope: eventValue && eventValue !== accountValue ? 'event_override' : 'account_default',
    }
  })
}

export function buildSaveAsDefaultProposals(
  snapshot: ClientDefaultKnowledgeSnapshot,
  eventValues: Partial<Record<ClientDefaultKnowledgeFieldKey, string | number | null>>
): ClientSaveAsDefaultProposal[] {
  return buildEventKnowledgeOverrides(snapshot, eventValues)
    .filter((override) => override.eventValue && override.eventValue !== override.accountValue)
    .map((override) => ({
      fieldKey: override.fieldKey,
      label: override.label,
      eventValue: override.eventValue ?? '',
      currentDefault: override.accountValue,
      shouldOfferToggle: true,
      toggleLabel: `Use this ${override.label.toLowerCase()} for future events`,
    }))
}

export function buildChefDefaultKnowledgeDeltaAlert(
  before: ClientDefaultKnowledgeSnapshot,
  after: ClientDefaultKnowledgeSnapshot
): ClientChefDeltaAlert {
  const beforeByKey = new Map(before.provenance.map((field) => [field.fieldKey, field]))
  const changedFields = after.provenance
    .map((field) => {
      const beforeField = beforeByKey.get(field.fieldKey)
      return {
        fieldKey: field.fieldKey,
        label: field.label,
        before: beforeField?.value ?? null,
        after: field.value,
        safetyCritical: field.safetyCritical,
      }
    })
    .filter((field) => field.before !== field.after)

  const menuSafetyReviewRequired = changedFields.some((field) => field.safetyCritical)
  const activeEventReviewRequired = changedFields.some((field) =>
    [
      'address',
      'access_instructions',
      'parking_instructions',
      'default_guest_count',
      'service_style',
    ].includes(field.fieldKey)
  )

  return {
    changedFields,
    activeEventReviewRequired,
    menuSafetyReviewRequired,
    summary:
      changedFields.length === 0
        ? 'No default knowledge changes.'
        : `${changedFields.length} default ${changedFields.length === 1 ? 'field' : 'fields'} changed.`,
  }
}

function buildScope(
  input: Omit<ClientDefaultKnowledgeScope, 'status'>
): ClientDefaultKnowledgeScope {
  const populated = input.items.filter((candidate) => hasValue(candidate.value)).length
  const required = input.items.filter((candidate) => candidate.required)
  const requiredReady = required.every((candidate) => hasValue(candidate.value))

  let status: ClientDefaultKnowledgeScope['status'] = 'empty'
  if (populated === input.items.length && requiredReady) {
    status = 'ready'
  } else if (populated > 0 || requiredReady) {
    status = 'partial'
  }

  return {
    ...input,
    status,
  }
}

function item(
  label: string,
  value: string | number | null | undefined,
  required: boolean,
  fieldKey?: ClientDefaultKnowledgeFieldKey
): ClientDefaultKnowledgeItem {
  return {
    label,
    value: value === null || value === undefined ? null : String(value),
    required,
    fieldKey,
  }
}

function hasValue(value: string | null): boolean {
  return Boolean(value && value.trim())
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function formatList(values: string[] | null | undefined): string | null {
  const cleaned = (values ?? []).map((value) => value.trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned.join(', ') : null
}

function formatNumber(value: number | null | undefined): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : null
}

function formatCents(cents: number | null | undefined): string | null {
  return typeof cents === 'number' && cents > 0
    ? `$${Math.round(cents / 100).toLocaleString()}`
    : null
}

function formatBudgetRange(passport: ClientDefaultKnowledgePassport): string | null {
  const min = formatCents(passport.budget_range_min_cents)
  const max = formatCents(passport.budget_range_max_cents)
  if (min && max) return `${min} - ${max}`
  return min ?? max
}

function formatDelegate(passport: ClientDefaultKnowledgePassport): string | null {
  const parts = [passport.delegate_name, passport.delegate_email, passport.delegate_phone]
    .map((value) => value?.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

function formatServiceStyle(value: ClientDefaultKnowledgePassport['service_style']): string | null {
  const labels: Record<NonNullable<ClientDefaultKnowledgePassport['service_style']>, string> = {
    formal_plated: 'Formal plated',
    family_style: 'Family style',
    buffet: 'Buffet',
    cocktail: 'Cocktail',
    tasting_menu: 'Tasting menu',
    no_preference: 'No preference',
  }
  return value ? labels[value] : null
}

function formatCommunicationMode(
  value: ClientDefaultKnowledgePassport['communication_mode']
): string {
  const labels: Record<ClientDefaultKnowledgePassport['communication_mode'], string> = {
    direct: 'Direct',
    delegate_only: 'Delegate only',
    delegate_preferred: 'Delegate preferred',
  }
  return labels[value]
}

function formatContactMethod(value: ClientDefaultKnowledgePassport['preferred_contact_method']) {
  const labels: Record<ClientDefaultKnowledgePassport['preferred_contact_method'], string> = {
    email: 'Email',
    sms: 'SMS',
    phone: 'Phone',
    circle: 'Dinner Circle',
  }
  return labels[value]
}

function formatAutonomy(value: ClientDefaultKnowledgePassport['chef_autonomy_level']) {
  const labels: Record<ClientDefaultKnowledgePassport['chef_autonomy_level'], string> = {
    full: 'Chef decides everything',
    high: 'Chef decides most things',
    moderate: 'Chef proposes, client approves',
    low: 'Client directs',
  }
  return labels[value]
}

function buildProvenance(
  profile: ClientProfileForDefaults,
  passport: ClientDefaultKnowledgePassport,
  passportUpdatedAt: string | null
): ClientDefaultKnowledgeProvenance[] {
  const profileConfirmedAt = profile.updated_at ?? null
  const passportConfirmedAt = passportUpdatedAt

  return [
    provenance('full_name', 'Full name', profile.full_name, 'client_profile', profileConfirmedAt),
    provenance(
      'preferred_name',
      'Preferred name',
      profile.preferred_name,
      'client_profile',
      profileConfirmedAt
    ),
    provenance('email', 'Email', profile.email, 'client_profile', profileConfirmedAt),
    provenance('phone', 'Phone', profile.phone, 'client_profile', profileConfirmedAt),
    provenance('address', 'Primary address', profile.address, 'client_profile', profileConfirmedAt),
    provenance(
      'dietary_restrictions',
      'Dietary restrictions',
      formatList(profile.dietary_restrictions),
      'client_profile',
      profileConfirmedAt,
      true,
      'review_30d'
    ),
    provenance(
      'dietary_protocols',
      'Dietary protocols',
      formatList(profile.dietary_protocols),
      'client_profile',
      profileConfirmedAt,
      true,
      'review_30d'
    ),
    provenance(
      'allergies',
      'Allergies',
      formatList(profile.allergies),
      'client_profile',
      profileConfirmedAt,
      true,
      'review_30d'
    ),
    provenance(
      'dislikes',
      'Dislikes',
      formatList(profile.dislikes),
      'client_profile',
      profileConfirmedAt
    ),
    provenance(
      'spice_tolerance',
      'Spice tolerance',
      profile.spice_tolerance,
      'client_profile',
      profileConfirmedAt
    ),
    provenance(
      'favorite_cuisines',
      'Favorite cuisines',
      formatList(profile.favorite_cuisines),
      'client_profile',
      profileConfirmedAt
    ),
    provenance(
      'favorite_dishes',
      'Favorite dishes',
      formatList(profile.favorite_dishes),
      'client_profile',
      profileConfirmedAt
    ),
    provenance(
      'wine_beverage_preferences',
      'Wine and beverages',
      profile.wine_beverage_preferences,
      'client_profile',
      profileConfirmedAt
    ),
    provenance(
      'parking_instructions',
      'Parking instructions',
      profile.parking_instructions,
      'client_profile',
      profileConfirmedAt,
      false,
      'event_scoped'
    ),
    provenance(
      'access_instructions',
      'Access instructions',
      profile.access_instructions,
      'client_profile',
      profileConfirmedAt,
      false,
      'event_scoped'
    ),
    provenance(
      'kitchen_size',
      'Kitchen size',
      profile.kitchen_size,
      'client_profile',
      profileConfirmedAt,
      false,
      'event_scoped'
    ),
    provenance(
      'kitchen_constraints',
      'Kitchen notes',
      profile.kitchen_constraints,
      'client_profile',
      profileConfirmedAt,
      true,
      'event_scoped'
    ),
    provenance(
      'house_rules',
      'House rules',
      profile.house_rules,
      'client_profile',
      profileConfirmedAt
    ),
    provenance(
      'equipment_available',
      'Equipment',
      formatList(profile.equipment_available),
      'client_profile',
      profileConfirmedAt
    ),
    provenance(
      'partner_name',
      'Partner name',
      profile.partner_name,
      'client_profile',
      profileConfirmedAt
    ),
    provenance(
      'children',
      'Children',
      formatList(profile.children),
      'client_profile',
      profileConfirmedAt
    ),
    provenance(
      'family_notes',
      'Family notes',
      profile.family_notes,
      'client_profile',
      profileConfirmedAt
    ),
    provenance(
      'communication_mode',
      'Communication mode',
      formatCommunicationMode(passport.communication_mode),
      'client_passport',
      passportConfirmedAt
    ),
    provenance(
      'preferred_contact_method',
      'Preferred contact',
      formatContactMethod(passport.preferred_contact_method),
      'client_passport',
      passportConfirmedAt
    ),
    provenance(
      'chef_autonomy_level',
      'Chef autonomy',
      formatAutonomy(passport.chef_autonomy_level),
      'client_passport',
      passportConfirmedAt
    ),
    provenance(
      'auto_approve_under_cents',
      'Auto approve under',
      formatCents(passport.auto_approve_under_cents),
      'client_passport',
      passportConfirmedAt
    ),
    provenance(
      'max_interaction_rounds',
      'Max interaction rounds',
      formatNumber(passport.max_interaction_rounds),
      'client_passport',
      passportConfirmedAt
    ),
    provenance(
      'standing_instructions',
      'Standing instructions',
      passport.standing_instructions,
      'client_passport',
      passportConfirmedAt
    ),
    provenance(
      'default_guest_count',
      'Typical guest count',
      formatNumber(passport.default_guest_count),
      'client_passport',
      passportConfirmedAt
    ),
    provenance(
      'budget_range',
      'Budget range',
      formatBudgetRange(passport),
      'client_passport',
      passportConfirmedAt
    ),
    provenance(
      'service_style',
      'Service style',
      formatServiceStyle(passport.service_style),
      'client_passport',
      passportConfirmedAt
    ),
    provenance(
      'delegate',
      'Delegate',
      formatDelegate(passport),
      'client_passport',
      passportConfirmedAt
    ),
  ]
}

function provenance(
  fieldKey: ClientDefaultKnowledgeFieldKey,
  label: string,
  value: string | null | undefined,
  source: ClientDefaultKnowledgeProvenance['source'],
  lastConfirmedAt: string | null,
  safetyCritical = false,
  freshness: ClientDefaultKnowledgeProvenance['freshness'] = 'review_90d'
): ClientDefaultKnowledgeProvenance {
  return {
    fieldKey,
    label,
    source,
    sourceLabel: source === 'client_profile' ? 'Profile' : 'Default Knowledge',
    value: normalizeOptionalText(value),
    lastConfirmedAt,
    freshness,
    safetyCritical,
    editableHref: '/my-profile',
  }
}

function attachProvenance(
  scopes: ClientDefaultKnowledgeScope[],
  provenanceRows: ClientDefaultKnowledgeProvenance[]
): ClientDefaultKnowledgeScope[] {
  const provenanceByKey = new Map(provenanceRows.map((row) => [row.fieldKey, row]))
  return scopes.map((scope) => ({
    ...scope,
    items: scope.items.map((scopeItem) => ({
      ...scopeItem,
      provenance: scopeItem.fieldKey ? provenanceByKey.get(scopeItem.fieldKey) : undefined,
    })),
  }))
}

function buildHouseholdProfiles(
  profile: ClientProfileForDefaults
): ClientHouseholdKnowledgeProfile[] {
  const householdProfiles: ClientHouseholdKnowledgeProfile[] = [
    {
      id: 'client',
      label: profile.preferred_name || profile.full_name || 'Client',
      role: 'client',
      facts: [
        item('Allergies', formatList(profile.allergies), false, 'allergies'),
        item(
          'Dietary restrictions',
          formatList(profile.dietary_restrictions),
          false,
          'dietary_restrictions'
        ),
        item('Dislikes', formatList(profile.dislikes), false, 'dislikes'),
      ],
    },
  ]

  if (profile.partner_name) {
    householdProfiles.push({
      id: 'partner',
      label: profile.partner_name,
      role: 'partner',
      facts: [item('Household relationship', 'Partner', false, 'partner_name')],
    })
  }

  for (const [index, child] of (profile.children ?? []).entries()) {
    if (!child.trim()) continue
    householdProfiles.push({
      id: `child-${index}`,
      label: child,
      role: 'child',
      facts: [item('Child profile', child, false, 'children')],
    })
  }

  if (profile.family_notes) {
    householdProfiles.push({
      id: 'household',
      label: 'Household notes',
      role: 'household',
      facts: [item('Family notes', profile.family_notes, false, 'family_notes')],
    })
  }

  return householdProfiles
}

function buildSafetyConfirmationState(
  provenanceRows: ClientDefaultKnowledgeProvenance[]
): ClientSafetyConfirmationState {
  const safetyRows = provenanceRows.filter((row) =>
    ['allergies', 'dietary_restrictions', 'dietary_protocols'].includes(row.fieldKey)
  )
  const fields: ClientSafetyConfirmationState['fields'] = safetyRows.map((row) => ({
    fieldKey: row.fieldKey as 'allergies' | 'dietary_restrictions' | 'dietary_protocols',
    label: row.label,
    value: row.value,
    confirmationLabel: row.value ? 'Still current' : 'Add or confirm none',
  }))
  const populated = fields.filter((field) => field.value).length

  return {
    status:
      populated === 0 ? 'missing' : populated === fields.length ? 'current' : 'needs_confirmation',
    fields,
  }
}

function buildDefaultKnowledgeReviewQueue(
  provenanceRows: ClientDefaultKnowledgeProvenance[]
): ClientDefaultKnowledgeReviewItem[] {
  return provenanceRows
    .filter((row) => row.value && row.freshness !== 'current')
    .map((row) => ({
      id: `review-${row.fieldKey}`,
      fieldKey: row.fieldKey,
      label: row.label,
      proposedValue: row.value ?? '',
      sourceLabel: row.sourceLabel,
      decision: 'pending_client_review',
      action: 'approve',
    }))
}

function buildClientRestatementGuards(
  provenanceRows: ClientDefaultKnowledgeProvenance[]
): ClientRestatementGuard[] {
  const guards: ClientRestatementGuard[] = []
  for (const row of provenanceRows) {
    if (!row.value) continue
    const formField = toFormField(row.fieldKey)
    if (!formField) continue
    guards.push({
      formField,
      fieldKey: row.fieldKey,
      label: row.label,
      knownValue: row.value,
      action: row.safetyCritical ? 'confirm_instead' : 'prefill',
      failureMessage: `${row.label} is already saved. Confirm or edit it instead of asking again.`,
    })
  }
  return guards
}

function toFormField(
  fieldKey: ClientDefaultKnowledgeFieldKey
): ClientDefaultKnowledgeAppliedField['formField'] | null {
  const map: Partial<
    Record<ClientDefaultKnowledgeFieldKey, ClientDefaultKnowledgeAppliedField['formField']>
  > = {
    full_name: 'full_name',
    email: 'email',
    phone: 'phone',
    address: 'address',
    default_guest_count: 'guest_count',
    budget_range: 'budget',
    service_style: 'service_style',
    standing_instructions: 'standing_instructions',
    communication_mode: 'communication_mode',
    allergies: 'dietary_notes',
    dietary_restrictions: 'dietary_notes',
    dietary_protocols: 'dietary_notes',
  }
  return map[fieldKey] ?? null
}

function applied(
  row: ClientDefaultKnowledgeProvenance | undefined,
  formField: ClientDefaultKnowledgeAppliedField['formField']
): ClientDefaultKnowledgeAppliedField | null {
  if (!row?.value) return null
  return {
    fieldKey: row.fieldKey,
    formField,
    value: row.value,
    sourceLabel: row.sourceLabel,
    freshness: row.freshness,
    safetyCritical: row.safetyCritical,
  }
}

function appliedDietary(
  fields: Map<ClientDefaultKnowledgeFieldKey, ClientDefaultKnowledgeProvenance>
): ClientDefaultKnowledgeAppliedField | null {
  const values = [
    fields.get('dietary_restrictions')?.value,
    fields.get('allergies')?.value,
    fields.get('dietary_protocols')?.value,
  ].filter(Boolean)

  if (values.length === 0) return null

  return {
    fieldKey: 'dietary_restrictions',
    formField: 'dietary_notes',
    value: values.join('; '),
    sourceLabel: 'Profile',
    freshness: 'review_30d',
    safetyCritical: true,
  }
}

function compactAppliedFields(
  fields: Array<ClientDefaultKnowledgeAppliedField | null>
): ClientDefaultKnowledgeAppliedField[] {
  const seen = new Set<string>()
  const compacted: ClientDefaultKnowledgeAppliedField[] = []
  for (const field of fields) {
    if (!field) continue
    if (seen.has(field.formField)) continue
    seen.add(field.formField)
    compacted.push(field)
  }
  return compacted
}

function isFieldRelevantForContext(
  formField: ClientDefaultKnowledgeAppliedField['formField'],
  context: ClientDefaultKnowledgeApplication['context']
): boolean {
  const contextMap: Record<
    ClientDefaultKnowledgeApplication['context'],
    ClientDefaultKnowledgeAppliedField['formField'][]
  > = {
    booking: ['full_name', 'email', 'phone', 'address', 'guest_count', 'budget', 'dietary_notes'],
    inquiry: ['full_name', 'email', 'phone', 'address', 'guest_count', 'budget', 'dietary_notes'],
    pre_event_checklist: ['address', 'guest_count', 'dietary_notes', 'service_style'],
    menu_approval: ['dietary_notes', 'service_style', 'standing_instructions'],
    payment_plan: ['email', 'communication_mode'],
    chat: ['communication_mode', 'standing_instructions'],
  }
  return contextMap[context].includes(formField)
}

function coercePassport(
  row: PassportRowForDefaults | null
): Partial<ClientDefaultKnowledgePassport> {
  if (!row) return {}
  return {
    communication_mode: row.communication_mode ?? DEFAULT_PASSPORT.communication_mode,
    preferred_contact_method:
      row.preferred_contact_method ?? DEFAULT_PASSPORT.preferred_contact_method,
    chef_autonomy_level: row.chef_autonomy_level ?? DEFAULT_PASSPORT.chef_autonomy_level,
    auto_approve_under_cents: row.auto_approve_under_cents ?? null,
    max_interaction_rounds: row.max_interaction_rounds ?? null,
    standing_instructions: row.standing_instructions ?? null,
    default_guest_count: row.default_guest_count ?? null,
    budget_range_min_cents: row.budget_range_min_cents ?? null,
    budget_range_max_cents: row.budget_range_max_cents ?? null,
    service_style: row.service_style ?? null,
    delegate_name: row.delegate_name ?? null,
    delegate_email: row.delegate_email ?? null,
    delegate_phone: row.delegate_phone ?? null,
  }
}
