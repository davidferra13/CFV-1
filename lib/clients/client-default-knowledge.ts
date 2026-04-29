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
  completion: {
    ready: number
    partial: number
    empty: number
    total: number
  }
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
        item('Full name', profile.full_name, true),
        item('Preferred name', profile.preferred_name, false),
        item('Email', profile.email, true),
        item('Phone', profile.phone, false),
        item('Primary address', profile.address, false),
      ],
    }),
    buildScope({
      key: 'food_safety',
      label: 'Food safety',
      description: 'Allergies, dietary restrictions, and protocols that should follow every event.',
      source: 'client_profile',
      lockedOn: true,
      items: [
        item('Allergies', formatList(profile.allergies), false),
        item('Dietary restrictions', formatList(profile.dietary_restrictions), false),
        item('Dietary protocols', formatList(profile.dietary_protocols), false),
      ],
    }),
    buildScope({
      key: 'taste',
      label: 'Taste',
      description: 'Likes, dislikes, spice tolerance, dishes, cuisines, and beverage preferences.',
      source: 'client_profile',
      lockedOn: false,
      items: [
        item('Favorite cuisines', formatList(profile.favorite_cuisines), false),
        item('Favorite dishes', formatList(profile.favorite_dishes), false),
        item('Dislikes', formatList(profile.dislikes), false),
        item('Spice tolerance', profile.spice_tolerance, false),
        item('Wine and beverages', profile.wine_beverage_preferences, false),
      ],
    }),
    buildScope({
      key: 'home_logistics',
      label: 'Home and logistics',
      description: 'Kitchen setup, parking, arrival, house rules, and available equipment.',
      source: 'client_profile',
      lockedOn: false,
      items: [
        item('Kitchen size', profile.kitchen_size, false),
        item('Kitchen notes', profile.kitchen_constraints, false),
        item('Equipment', formatList(profile.equipment_available), false),
        item('House rules', profile.house_rules, false),
        item('Parking instructions', profile.parking_instructions, false),
        item('Access instructions', profile.access_instructions, false),
      ],
    }),
    buildScope({
      key: 'household',
      label: 'Household',
      description: 'Partner, children, and household notes that prevent repeat questions.',
      source: 'client_profile',
      lockedOn: false,
      items: [
        item('Partner name', profile.partner_name, false),
        item('Children', formatList(profile.children), false),
        item('Family notes', profile.family_notes, false),
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
        item('Typical guest count', formatNumber(passport.default_guest_count), false),
        item('Budget range', formatBudgetRange(passport), false),
        item('Service style', formatServiceStyle(passport.service_style), false),
        item('Standing instructions', passport.standing_instructions, false),
        item('Auto approve under', formatCents(passport.auto_approve_under_cents), false),
      ],
    }),
    buildScope({
      key: 'communication',
      label: 'Communication',
      description: 'How ChefFlow should route contact, approvals, and delegate details by default.',
      source: 'client_passport',
      lockedOn: false,
      items: [
        item('Communication mode', formatCommunicationMode(passport.communication_mode), true),
        item('Preferred contact', formatContactMethod(passport.preferred_contact_method), true),
        item('Chef autonomy', formatAutonomy(passport.chef_autonomy_level), true),
        item('Max interaction rounds', formatNumber(passport.max_interaction_rounds), false),
        item('Delegate', formatDelegate(passport), false),
      ],
    }),
  ]

  const completion = scopes.reduce(
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
    scopes,
    completion,
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

function item(label: string, value: string | number | null | undefined, required: boolean) {
  return {
    label,
    value: value === null || value === undefined ? null : String(value),
    required,
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
