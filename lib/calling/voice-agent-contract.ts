export type VoiceAgentRole =
  | 'vendor_availability'
  | 'vendor_delivery'
  | 'venue_confirmation'
  | 'inbound_vendor_callback'
  | 'inbound_unknown'
  | 'inbound_voicemail'

export type VoiceAgentDecisionType =
  | 'answer_and_collect'
  | 'collect_message'
  | 'handoff_required'
  | 'restricted'
  | 'opt_out'

export interface VoiceAgentDecision {
  type: VoiceAgentDecisionType
  category:
    | 'availability'
    | 'pricing'
    | 'booking'
    | 'dietary'
    | 'menu'
    | 'recipe'
    | 'human'
    | 'opt_out'
    | 'unknown'
  answer: string
  followUpPrompt: string
  escalationReason: string | null
  allowedToAnswer: boolean
}

export interface VoiceAgentFollowUp {
  label: string
  urgency: 'standard' | 'review' | 'urgent'
  nextStep: string
  quickNoteText: string
  alertBody: string
}

export interface VoiceAgentContract {
  identityDisclosure: string
  recordingDisclosure: string
  optOutInstruction: string
  allowedRoles: VoiceAgentRole[]
  hardBoundaries: string[]
  handoffTriggers: string[]
}

const ALLOWED_ROLES: VoiceAgentRole[] = [
  'vendor_availability',
  'vendor_delivery',
  'venue_confirmation',
  'inbound_vendor_callback',
  'inbound_unknown',
  'inbound_voicemail',
]

export const VOICE_AGENT_CONTRACT: VoiceAgentContract = {
  identityDisclosure: 'I am an AI assistant calling on behalf of the chef.',
  recordingDisclosure: 'This call may be recorded and transcribed for the chef.',
  optOutInstruction: 'Say stop calling at any time and AI assistant calls to this number stop.',
  allowedRoles: ALLOWED_ROLES,
  hardBoundaries: [
    'Never pretend to be human.',
    'Never call clients from outbound automation.',
    'Never invent prices, availability, booking confirmation, menus, recipes, or medical advice.',
    'Never generate recipes, menus, dish ideas, or tell the chef what to cook.',
    'Never collect payment card details by voice.',
  ],
  handoffTriggers: [
    'caller asks for a human',
    'caller asks for exact pricing or a binding quote',
    'caller has allergy, medical, legal, refund, or payment dispute concerns',
    'caller asks for recipes, menu invention, menu changes, or chef creative work',
    'caller asks for anything outside known ChefFlow operational data',
  ],
}

const STOP_CALLING_PATTERNS = [
  /\bstop calling\b/i,
  /\bdo not call\b/i,
  /\bdon't call\b/i,
  /\bremove (me|us)\b/i,
  /\btake (me|us) off\b/i,
  /\bno (ai|automated) calls\b/i,
]

const HUMAN_PATTERNS = [
  /\bhuman\b/i,
  /\bperson\b/i,
  /\bchef\b/i,
  /\bcall me back\b/i,
  /\bspeak to\b/i,
  /\btalk to\b/i,
]

const PRICING_PATTERNS = [
  /\bprice\b/i,
  /\bpricing\b/i,
  /\bcost\b/i,
  /\bquote\b/i,
  /\brate\b/i,
  /\bfee\b/i,
  /\bdeposit\b/i,
  /\binvoice\b/i,
]

const BOOKING_PATTERNS = [
  /\bbook\b/i,
  /\bbooking\b/i,
  /\bavailable\b/i,
  /\bavailability\b/i,
  /\bdate\b/i,
  /\bevent\b/i,
  /\bdinner\b/i,
  /\bcatering\b/i,
]

const DIETARY_PATTERNS = [
  /\ballerg/i,
  /\bdietary\b/i,
  /\bmedical\b/i,
  /\bgluten\b/i,
  /\bnut\b/i,
  /\bshellfish\b/i,
  /\brestriction\b/i,
]

const MENU_CREATION_PATTERNS = [
  /\bmenu idea\b/i,
  /\bdish idea\b/i,
  /\bwhat should\b/i,
  /\bbuild (?:me |us )?a menu\b/i,
  /\bmake (?:me |us )?a menu\b/i,
  /\bcreate (?:me |us )?a menu\b/i,
  /\bsuggest (?:a |some )?(?:menu|menus|dishes)\b/i,
  /\bplan (?:a |the )?menu\b/i,
]

const MENU_REVIEW_PATTERNS = [
  /\bmenu\b/i,
  /\btasting menu\b/i,
  /\bcourse\b/i,
  /\bdish\b/i,
  /\bapprove(?:d)?\b/i,
  /\bchoose\b/i,
  /\bselection\b/i,
  /\bswap\b/i,
  /\bsubstitution\b/i,
]

const RECIPE_PATTERNS = [/\brecipe\b/i]

export function isAllowedVoiceAgentRole(role: string): role is VoiceAgentRole {
  return ALLOWED_ROLES.includes(role as VoiceAgentRole)
}

export function hasVoiceAgentOptOutRequest(utterance: string | null | undefined): boolean {
  const text = normalizeUtterance(utterance)
  if (!text) return false
  return STOP_CALLING_PATTERNS.some((pattern) => pattern.test(text))
}

export function resolveVoiceAgentTurn(params: {
  utterance: string | null | undefined
  role: VoiceAgentRole
}): VoiceAgentDecision {
  const text = normalizeUtterance(params.utterance)

  if (!text) {
    return collectMessageDecision(
      'unknown',
      'I did not catch that clearly. Please leave your name, number, and what you need.'
    )
  }

  if (hasVoiceAgentOptOutRequest(text)) {
    return {
      type: 'opt_out',
      category: 'opt_out',
      answer:
        "Understood. We'll stop AI assistant calls to this number. The chef can follow up manually if needed.",
      followUpPrompt: '',
      escalationReason: null,
      allowedToAnswer: true,
    }
  }

  if (HUMAN_PATTERNS.some((pattern) => pattern.test(text))) {
    return handoffDecision(
      'human',
      "I can take a message for the chef, but I cannot represent that I'm a person."
    )
  }

  if (
    RECIPE_PATTERNS.some((pattern) => pattern.test(text)) ||
    MENU_CREATION_PATTERNS.some((pattern) => pattern.test(text))
  ) {
    return restrictedDecision(
      'recipe',
      'I cannot create recipes, menu ideas, dish ideas, or tell the chef what to cook. I can pass your preference to the chef.'
    )
  }

  if (MENU_REVIEW_PATTERNS.some((pattern) => pattern.test(text))) {
    return handoffDecision(
      'menu',
      "I can record menu confirmations, selections, constraints, and revision notes for the chef, but I cannot create or change the chef's menu by voice."
    )
  }

  if (DIETARY_PATTERNS.some((pattern) => pattern.test(text))) {
    return handoffDecision(
      'dietary',
      'Dietary and allergy details need chef review. I can record the concern for the chef now.'
    )
  }

  if (PRICING_PATTERNS.some((pattern) => pattern.test(text))) {
    return handoffDecision(
      'pricing',
      'I can explain that pricing depends on date, guest count, menu scope, service style, and location, but I cannot give a binding quote by voice.'
    )
  }

  if (BOOKING_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      type: 'answer_and_collect',
      category: 'booking',
      answer:
        'I can help start the booking conversation. The chef needs the event date, guest count, location, service style, and any dietary constraints before confirming availability.',
      followUpPrompt:
        'Please share those details, and I will get them to the chef for a direct follow-up.',
      escalationReason: null,
      allowedToAnswer: true,
    }
  }

  return collectMessageDecision(
    'unknown',
    'I can take that message for the chef. Please include your name, number, and the best next step.'
  )
}

export function isVoiceAgentDecision(value: unknown): value is VoiceAgentDecision {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<VoiceAgentDecision>
  return (
    typeof candidate.type === 'string' &&
    typeof candidate.category === 'string' &&
    typeof candidate.answer === 'string' &&
    typeof candidate.followUpPrompt === 'string' &&
    typeof candidate.allowedToAnswer === 'boolean'
  )
}

export function resolveVoiceAgentConversationDecision(params: {
  previousDecision: unknown
  currentDecision: VoiceAgentDecision
  step: number
}): VoiceAgentDecision {
  const previous = isVoiceAgentDecision(params.previousDecision) ? params.previousDecision : null

  if (params.currentDecision.type === 'opt_out') return params.currentDecision
  if (!previous || params.step <= 1) return params.currentDecision

  if (params.currentDecision.type === 'restricted') return params.currentDecision
  if (params.currentDecision.category === 'dietary') return params.currentDecision

  if (previous.type === 'handoff_required' || previous.type === 'restricted') {
    return previous
  }

  if (previous.type === 'answer_and_collect') return previous

  return params.currentDecision
}

export function buildVoiceAgentFollowUp(params: {
  decision: VoiceAgentDecision
  callerLabel: string
  transcript: string | null | undefined
}): VoiceAgentFollowUp {
  const excerpt = compactExcerpt(params.transcript)
  const base = followUpBase(params.decision)
  const quotedExcerpt = excerpt ? ` "${excerpt}"` : ''

  return {
    ...base,
    quickNoteText: `${base.label} from ${params.callerLabel}:${quotedExcerpt} Next step: ${base.nextStep}`,
    alertBody: `${params.callerLabel}: ${base.nextStep}`,
  }
}

function normalizeUtterance(utterance: string | null | undefined): string {
  return (utterance ?? '').replace(/\s+/g, ' ').trim()
}

function compactExcerpt(value: string | null | undefined): string {
  const text = normalizeUtterance(value)
  if (text.length <= 420) return text
  return `${text.slice(0, 417).trim()}...`
}

function followUpBase(
  decision: VoiceAgentDecision
): Omit<VoiceAgentFollowUp, 'quickNoteText' | 'alertBody'> {
  if (decision.type === 'opt_out') {
    return {
      label: 'AI call opt-out',
      urgency: 'review',
      nextStep: 'Review the contact and avoid future AI assistant calls to this number.',
    }
  }

  if (decision.category === 'booking') {
    return {
      label: 'Booking intake',
      urgency: 'standard',
      nextStep:
        'Review the event date, guest count, location, service style, and dietary constraints, then follow up directly.',
    }
  }

  if (decision.category === 'pricing') {
    return {
      label: 'Pricing callback',
      urgency: 'review',
      nextStep: 'Review the scope before sending any quote or price guidance.',
    }
  }

  if (decision.category === 'dietary') {
    return {
      label: 'Dietary review',
      urgency: 'urgent',
      nextStep: 'Review allergy or dietary details before any menu, quote, or confirmation step.',
    }
  }

  if (decision.category === 'menu') {
    return {
      label: 'Menu review',
      urgency: 'review',
      nextStep:
        'Review the menu confirmation, selection, or revision request before changing any menu.',
    }
  }

  if (decision.category === 'recipe' || decision.type === 'restricted') {
    return {
      label: 'Restricted request',
      urgency: 'review',
      nextStep: 'Review manually. The assistant did not create recipes, menus, or chef IP.',
    }
  }

  if (decision.category === 'human') {
    return {
      label: 'Human callback',
      urgency: 'review',
      nextStep: 'Call back or reply directly because the caller asked for a person.',
    }
  }

  return {
    label: 'Inbound call follow-up',
    urgency: 'standard',
    nextStep: 'Review the message and decide whether a callback is needed.',
  }
}

function collectMessageDecision(
  category: VoiceAgentDecision['category'],
  prompt: string
): VoiceAgentDecision {
  return {
    type: 'collect_message',
    category,
    answer: prompt,
    followUpPrompt: prompt,
    escalationReason: null,
    allowedToAnswer: true,
  }
}

function handoffDecision(
  category: VoiceAgentDecision['category'],
  answer: string
): VoiceAgentDecision {
  return {
    type: 'handoff_required',
    category,
    answer,
    followUpPrompt: 'Please leave the details you want the chef to review.',
    escalationReason: VOICE_AGENT_CONTRACT.handoffTriggers.join('; '),
    allowedToAnswer: true,
  }
}

function restrictedDecision(
  category: VoiceAgentDecision['category'],
  answer: string
): VoiceAgentDecision {
  return {
    type: 'restricted',
    category,
    answer,
    followUpPrompt:
      'Please leave the preference or question and the chef can decide how to respond.',
    escalationReason: 'Restricted voice-agent boundary.',
    allowedToAnswer: false,
  }
}
