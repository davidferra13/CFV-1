/**
 * Call Scripts Engine - Configurable call script system for AI calling
 *
 * Instead of hardcoding TwiML per role, each role is a configuration
 * that generates TwiML dynamically. Scripts are designed to sound human,
 * introduce as calling on behalf of the chef, and only disclose AI
 * assistance at the END of the call.
 */

import { speak, sayElement, DEFAULT_VOICE, type SpeakPart } from './voice-helpers'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CallScript {
  role: string
  label: string
  description: string
  steps: CallStep[]
  closingMessages: {
    success: SpeakPart[]
    notAvailable: SpeakPart[]
    timeout: SpeakPart[]
    error: SpeakPart[]
  }
  disclosure: SpeakPart[]
  gatherConfig: {
    input: 'speech' | 'dtmf' | 'speech dtmf'
    timeout: number
    speechTimeout: 'auto' | number
    hints?: string
    enhanced?: boolean
  }
}

export interface CallStep {
  step: number
  prompt: SpeakPart[]
  followUpPrompt?: SpeakPart[]
  extractors: string[]
  maxRetries?: number
}

// ---------------------------------------------------------------------------
// Script Definitions
// ---------------------------------------------------------------------------

const SCRIPTS: CallScript[] = [
  // -------------------------------------------------------------------------
  // 1. Sourcing Availability
  // -------------------------------------------------------------------------
  {
    role: 'sourcing_availability',
    label: 'Ingredient Sourcing',
    description:
      'Call vendors to check if an ingredient is in stock, get pricing, and request a hold for pickup.',
    steps: [
      {
        step: 1,
        prompt: [
          'Hi, ',
          { type: 'break', ms: 200 },
          "I'm calling on behalf of ",
          { type: 'emphasis', text: '[businessName]' },
          ', a private chef in the area. ',
          { type: 'break', ms: 400 },
          'Quick question: ',
          { type: 'break', ms: 200 },
          'do you have ',
          { type: 'emphasis', text: '[ingredient]' },
          ' in stock today?',
        ],
        followUpPrompt: [
          'Just a yes or no is fine, ',
          { type: 'break', ms: 200 },
          'or press 1 for yes and 2 for no.',
        ],
        extractors: ['availability', 'yes_no'],
        maxRetries: 2,
      },
      {
        step: 2,
        prompt: [
          'Great, appreciate it. ',
          { type: 'break', ms: 400 },
          "What's the price on that? ",
          { type: 'break', ms: 300 },
          'And could you set some aside for pickup in the next couple hours?',
        ],
        followUpPrompt: ['Just the price and whether you can hold it for us.'],
        extractors: ['price', 'quantity', 'yes_no'],
        maxRetries: 1,
      },
    ],
    closingMessages: {
      success: [
        'Perfect, thank you so much. ',
        { type: 'break', ms: 300 },
        "We'll be by to pick that up shortly. Have a great day.",
      ],
      notAvailable: [
        'No worries at all. Thanks for checking. ',
        { type: 'break', ms: 200 },
        'Have a good one.',
      ],
      timeout: [
        "Sorry, didn't catch that. ",
        { type: 'break', ms: 200 },
        "We'll try again later. Thanks for your time.",
      ],
      error: ["Apologies for the trouble. We'll follow up another way. Thanks."],
    },
    disclosure: [
      { type: 'break', ms: 500 },
      'By the way, this call was assisted by an automated system on behalf of ',
      { type: 'emphasis', text: '[businessName]' },
      '. Thanks again.',
    ],
    gatherConfig: {
      input: 'speech dtmf',
      timeout: 10,
      speechTimeout: 'auto',
      hints:
        'yes, yeah, we do, absolutely, we have it, in stock, no, nope, sorry, out of stock, not right now',
      enhanced: true,
    },
  },

  // -------------------------------------------------------------------------
  // 2. Staff Dispatch
  // -------------------------------------------------------------------------
  {
    role: 'staff_dispatch',
    label: 'Staff Availability',
    description:
      'Call staff members to check availability for an upcoming event and confirm rate and transportation.',
    steps: [
      {
        step: 1,
        prompt: [
          'Hi ',
          { type: 'emphasis', text: '[staffName]' },
          ', ',
          { type: 'break', ms: 200 },
          "I'm calling on behalf of ",
          { type: 'emphasis', text: '[businessName]' },
          '. ',
          { type: 'break', ms: 400 },
          "There's a dinner on ",
          { type: 'emphasis', text: '[eventDate]' },
          ' from ',
          { type: 'emphasis', text: '[startTime]' },
          ' to ',
          { type: 'emphasis', text: '[endTime]' },
          ' in ',
          { type: 'emphasis', text: '[location]' },
          '. ',
          { type: 'break', ms: 400 },
          'Are you available?',
        ],
        followUpPrompt: ['Just let me know if that date works for you.'],
        extractors: ['availability', 'yes_no'],
        maxRetries: 2,
      },
      {
        step: 2,
        prompt: [
          'Great. ',
          { type: 'break', ms: 300 },
          'Just to confirm, your rate is still ',
          { type: 'emphasis', text: '[rate]' },
          ' per hour? ',
          { type: 'break', ms: 400 },
          'And do you need a ride or are you all set on transportation?',
        ],
        followUpPrompt: ['Rate confirmation and whether you need a ride.'],
        extractors: ['rate_confirmation', 'transportation'],
        maxRetries: 1,
      },
    ],
    closingMessages: {
      success: [
        'Awesome, you are confirmed. ',
        { type: 'break', ms: 300 },
        "We'll send you the details. Thanks.",
      ],
      notAvailable: [
        'Totally understand. ',
        { type: 'break', ms: 200 },
        "We'll find someone else. Thanks for letting us know.",
      ],
      timeout: [
        "Didn't catch a response. ",
        { type: 'break', ms: 200 },
        "We'll text you the details and you can reply when you get a chance.",
      ],
      error: ["Sorry about that. We'll reach out again shortly."],
    },
    disclosure: [
      { type: 'break', ms: 500 },
      'Just so you know, this call was assisted by an automated system on behalf of ',
      { type: 'emphasis', text: '[businessName]' },
      '. Talk soon.',
    ],
    gatherConfig: {
      input: 'speech dtmf',
      timeout: 10,
      speechTimeout: 'auto',
      hints: 'yes, yeah, I can do that, available, no, not available, busy, booked',
      enhanced: true,
    },
  },

  // -------------------------------------------------------------------------
  // 3. Equipment Rental
  // -------------------------------------------------------------------------
  {
    role: 'equipment_rental',
    label: 'Equipment Rental',
    description:
      'Call rental companies to check equipment availability, pricing, and logistics for an event.',
    steps: [
      {
        step: 1,
        prompt: [
          'Hi, ',
          { type: 'break', ms: 200 },
          "I'm calling on behalf of ",
          { type: 'emphasis', text: '[businessName]' },
          '. ',
          { type: 'break', ms: 400 },
          'I need to check availability on some rental equipment for ',
          { type: 'emphasis', text: '[eventDate]' },
          '. ',
          { type: 'break', ms: 300 },
          "I'm looking for ",
          { type: 'emphasis', text: '[equipmentList]' },
          '.',
        ],
        followUpPrompt: ['Do you have those items available for that date?'],
        extractors: ['availability'],
        maxRetries: 2,
      },
      {
        step: 2,
        prompt: [
          'Great. ',
          { type: 'break', ms: 300 },
          'What would the rental cost be, ',
          { type: 'break', ms: 200 },
          'and what are the pickup and return times?',
        ],
        followUpPrompt: ['Just the total cost and when we can pick up and return.'],
        extractors: ['price', 'pickup_time', 'return_time', 'deposit'],
        maxRetries: 1,
      },
    ],
    closingMessages: {
      success: [
        'Perfect, that works. ',
        { type: 'break', ms: 300 },
        "We'll confirm the reservation. Thank you.",
      ],
      notAvailable: [
        'Understood. ',
        { type: 'break', ms: 200 },
        "We'll check elsewhere. Thanks for your time.",
      ],
      timeout: ["Sorry, I lost you there. We'll call back. Thanks."],
      error: ["Apologies for the trouble. We'll follow up by email."],
    },
    disclosure: [
      { type: 'break', ms: 500 },
      'By the way, this call was assisted by an automated system on behalf of ',
      { type: 'emphasis', text: '[businessName]' },
      '. Appreciate your help.',
    ],
    gatherConfig: {
      input: 'speech',
      timeout: 12,
      speechTimeout: 'auto',
      hints: 'yes, available, we have that, no, not available, sold out, rented out',
      enhanced: true,
    },
  },

  // -------------------------------------------------------------------------
  // 4. Venue Scout
  // -------------------------------------------------------------------------
  {
    role: 'venue_scout',
    label: 'Venue Scouting',
    description:
      'Call venues to learn about kitchen setup, parking, and any restrictions before an event.',
    steps: [
      {
        step: 1,
        prompt: [
          'Hi, ',
          { type: 'break', ms: 200 },
          "I'm calling on behalf of ",
          { type: 'emphasis', text: '[businessName]' },
          ', a private chef. ',
          { type: 'break', ms: 400 },
          'We have an event at your venue on ',
          { type: 'emphasis', text: '[eventDate]' },
          '. ',
          { type: 'break', ms: 400 },
          'Could you walk me through the kitchen setup?',
        ],
        followUpPrompt: [
          "Things like how many ovens, burner type, counter space, and whether there's refrigeration.",
        ],
        extractors: ['oven_count', 'burner_type', 'counter_space', 'refrigeration'],
        maxRetries: 2,
      },
      {
        step: 2,
        prompt: [
          'That helps a lot. ',
          { type: 'break', ms: 400 },
          'And how about parking for load-in, ',
          { type: 'break', ms: 200 },
          'and is there anything else we should know before arrival?',
        ],
        followUpPrompt: ['Parking situation and any restrictions or things to be aware of.'],
        extractors: ['parking', 'restrictions'],
        maxRetries: 1,
      },
    ],
    closingMessages: {
      success: [
        'This is really helpful. ',
        { type: 'break', ms: 300 },
        "We'll be well prepared. Thank you so much.",
      ],
      notAvailable: [
        'Understood. ',
        { type: 'break', ms: 200 },
        "We'll coordinate directly as the date gets closer. Thanks.",
      ],
      timeout: ["Sorry, didn't catch all of that. We'll follow up by email. Thanks."],
      error: ["Apologies for the trouble. We'll reach out another way."],
    },
    disclosure: [
      { type: 'break', ms: 500 },
      'Just a heads up, this call was assisted by an automated system on behalf of ',
      { type: 'emphasis', text: '[businessName]' },
      '. Thanks for all the info.',
    ],
    gatherConfig: {
      input: 'speech',
      timeout: 15,
      speechTimeout: 'auto',
      hints:
        'oven, ovens, gas, electric, induction, burner, counter, fridge, refrigerator, parking, lot, street, loading dock',
      enhanced: true,
    },
  },

  // -------------------------------------------------------------------------
  // 5. Vendor Onboarding
  // -------------------------------------------------------------------------
  {
    role: 'vendor_onboarding',
    label: 'Vendor Onboarding',
    description:
      'Call new vendors to establish a relationship, learn about their offerings, ordering process, and terms.',
    steps: [
      {
        step: 1,
        prompt: [
          'Hi, ',
          { type: 'break', ms: 200 },
          "I'm calling on behalf of ",
          { type: 'emphasis', text: '[businessName]' },
          ', a private chef in the area. ',
          { type: 'break', ms: 400 },
          "We're looking for a reliable source for ",
          { type: 'emphasis', text: '[specialty]' },
          '. ',
          { type: 'break', ms: 300 },
          'Do you carry that?',
        ],
        followUpPrompt: ['Just wondering if that is something you stock or can source.'],
        extractors: ['carries_item', 'yes_no'],
        maxRetries: 2,
      },
      {
        step: 2,
        prompt: [
          'Great. ',
          { type: 'break', ms: 300 },
          'Could you tell me about minimum orders, ',
          { type: 'break', ms: 200 },
          'whether you do delivery or just pickup, ',
          { type: 'break', ms: 200 },
          'and what the lead time usually is?',
        ],
        followUpPrompt: ['Minimums, delivery options, and how far in advance we need to order.'],
        extractors: ['min_order', 'delivery_or_pickup', 'lead_time'],
        maxRetries: 1,
      },
      {
        step: 3,
        prompt: [
          'And last thing. ',
          { type: 'break', ms: 300 },
          "What's the best way to place orders going forward? ",
          { type: 'break', ms: 200 },
          'Phone, email, or do you have an online system?',
        ],
        followUpPrompt: ['Just how you prefer to receive orders.'],
        extractors: ['ordering_method', 'payment_terms'],
        maxRetries: 1,
      },
    ],
    closingMessages: {
      success: [
        "This is exactly what we needed. We'll be in touch soon to place our first order. Thank you.",
      ],
      notAvailable: [
        'No problem, thanks for letting us know. ',
        { type: 'break', ms: 200 },
        'Have a good one.',
      ],
      timeout: ["Sorry about that. We'll try reaching out again. Thanks."],
      error: ["Apologies for the trouble. We'll follow up by email instead."],
    },
    disclosure: [
      { type: 'break', ms: 500 },
      'One more thing. This call was assisted by an automated system on behalf of ',
      { type: 'emphasis', text: '[businessName]' },
      '. Appreciate your time today.',
    ],
    gatherConfig: {
      input: 'speech',
      timeout: 15,
      speechTimeout: 'auto',
      hints:
        'yes, we carry that, we have it, no, minimum, delivery, pickup, phone, email, online, website',
      enhanced: true,
    },
  },

  // -------------------------------------------------------------------------
  // 6. Vendor Feedback
  // -------------------------------------------------------------------------
  {
    role: 'vendor_feedback',
    label: 'Vendor Feedback',
    description:
      'Call vendors to give feedback on a recent delivery, both positive and constructive.',
    steps: [
      {
        step: 1,
        prompt: [
          'Hi, this is calling on behalf of ',
          { type: 'emphasis', text: '[businessName]' },
          '. ',
          { type: 'break', ms: 400 },
          'We received a delivery from you on ',
          { type: 'emphasis', text: '[deliveryDate]' },
          '. ',
          { type: 'break', ms: 300 },
          'Quick feedback: ',
          { type: 'break', ms: 200 },
          '[feedbackMessage]',
        ],
        followUpPrompt: ['Just wanted to pass that along.'],
        extractors: ['freeform'],
        maxRetries: 1,
      },
      {
        step: 2,
        prompt: [
          'Do you have consistent supply on that, ',
          { type: 'break', ms: 200 },
          'or was that a one-time batch?',
        ],
        followUpPrompt: ['Just wondering about ongoing availability.'],
        extractors: ['supply_consistency', 'freeform'],
        maxRetries: 1,
      },
    ],
    closingMessages: {
      success: [
        'Good to know. ',
        { type: 'break', ms: 300 },
        'Thanks for the info, we appreciate the partnership.',
      ],
      notAvailable: ['Understood. Thanks for letting us know.'],
      timeout: ['No worries, just wanted to pass that along. Thanks for your time.'],
      error: ["Sorry about that. We'll follow up another way."],
    },
    disclosure: [
      { type: 'break', ms: 500 },
      'This call was assisted by an automated system on behalf of ',
      { type: 'emphasis', text: '[businessName]' },
      '. Have a great day.',
    ],
    gatherConfig: {
      input: 'speech',
      timeout: 12,
      speechTimeout: 'auto',
      hints: 'consistent, regular, seasonal, one time, batch, always have it, depends',
      enhanced: true,
    },
  },

  // -------------------------------------------------------------------------
  // 7. Price Check
  // -------------------------------------------------------------------------
  {
    role: 'price_check',
    label: 'Price Check',
    description:
      'Systematic price intelligence gathering. Call vendors to get current prices on specific items.',
    steps: [
      {
        step: 1,
        prompt: [
          'Hi, ',
          { type: 'break', ms: 200 },
          'calling on behalf of ',
          { type: 'emphasis', text: '[businessName]' },
          '. ',
          { type: 'break', ms: 400 },
          'Just doing a quick price check. ',
          { type: 'break', ms: 300 },
          "What's your current price on ",
          { type: 'emphasis', text: '[item1]' },
          '?',
        ],
        followUpPrompt: ['Just the price per unit or per pound, whatever you sell it by.'],
        extractors: ['price', 'unit'],
        maxRetries: 2,
      },
      {
        step: 2,
        prompt: [
          'Got it. ',
          { type: 'break', ms: 300 },
          'And how about ',
          { type: 'emphasis', text: '[item2]' },
          '? ',
          { type: 'break', ms: 200 },
          'And ',
          { type: 'emphasis', text: '[item3]' },
          '?',
        ],
        followUpPrompt: ['Prices on those two items when you get a chance.'],
        extractors: ['price', 'unit'],
        maxRetries: 1,
      },
    ],
    closingMessages: {
      success: ["That's everything I needed. Thanks so much for the info."],
      notAvailable: ["No worries. We'll check back another time. Thanks."],
      timeout: ["Sorry, missed that. We'll follow up later. Thank you."],
      error: ["Apologies for the trouble. We'll try again."],
    },
    disclosure: [
      { type: 'break', ms: 500 },
      'Just so you know, this call was assisted by an automated system on behalf of ',
      { type: 'emphasis', text: '[businessName]' },
      '. Thanks for your time.',
    ],
    gatherConfig: {
      input: 'speech',
      timeout: 12,
      speechTimeout: 'auto',
      hints: 'dollar, dollars, cents, per pound, per unit, each, a piece, per case, per dozen',
      enhanced: true,
    },
  },
]

// ---------------------------------------------------------------------------
// Script Registry
// ---------------------------------------------------------------------------

const scriptMap = new Map<string, CallScript>(SCRIPTS.map((s) => [s.role, s]))

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getCallScript(role: string): CallScript | null {
  return scriptMap.get(role) ?? null
}

export function getAllScripts(): CallScript[] {
  return [...SCRIPTS]
}

export function getScriptLabels(): Array<{ role: string; label: string; description: string }> {
  return SCRIPTS.map((s) => ({ role: s.role, label: s.label, description: s.description }))
}

// ---------------------------------------------------------------------------
// TwiML Builders
// ---------------------------------------------------------------------------

/**
 * Replace template placeholders like [businessName] with actual values from params.
 */
function interpolateParams(parts: SpeakPart[], params: Record<string, string>): SpeakPart[] {
  return parts.map((part) => {
    if (typeof part === 'string') {
      return replaceTemplateVars(part, params)
    }
    if (part.type === 'emphasis') {
      return { ...part, text: replaceTemplateVars(part.text, params) }
    }
    return part
  })
}

function replaceTemplateVars(text: string, params: Record<string, string>): string {
  return text.replace(/\[(\w+)\]/g, (_, key) => params[key] ?? `[${key}]`)
}

function escapeXmlAttr(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Build TwiML for a specific step of a call script.
 * Step 1 prepends upfront AI disclosure (TCPA/FCC compliance).
 */
export function buildStepTwiml(
  script: CallScript,
  step: number,
  params: Record<string, string>,
  gatherActionUrl: string,
  voice = DEFAULT_VOICE
): string {
  const callStep = script.steps.find((s) => s.step === step)
  if (!callStep) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="${voice}">Sorry, something went wrong. Goodbye.</Say><Hangup/></Response>`
  }

  const interpolatedPrompt = interpolateParams(callStep.prompt, params)
  const promptSsml = speak(interpolatedPrompt)

  // Upfront AI disclosure on first step (TCPA/FCC requires disclosure at call start)
  let upfrontDisclosure = ''
  if (step === 1) {
    const disclosureParts: SpeakPart[] = [
      'Hi, just so you know, this is an automated call on behalf of ',
      { type: 'emphasis', text: '[businessName]' },
      '. ',
      { type: 'break', ms: 300 },
    ]
    const interpolatedDisclosure = interpolateParams(disclosureParts, params)
    upfrontDisclosure = `\n  ${sayElement(speak(interpolatedDisclosure), voice)}`
  }

  const { input, timeout, speechTimeout, hints, enhanced } = script.gatherConfig
  const escapedUrl = escapeXmlAttr(gatherActionUrl)

  const speechTimeoutAttr = speechTimeout === 'auto' ? 'auto' : String(speechTimeout)
  const hintsAttr = hints ? ` hints="${escapeXmlAttr(hints)}"` : ''
  const enhancedAttr = enhanced ? ' enhanced="true"' : ''

  let gatherContent = ''
  if (callStep.followUpPrompt) {
    const followUpSsml = speak(interpolateParams(callStep.followUpPrompt, params))
    gatherContent = `\n    ${sayElement(followUpSsml, voice)}`
  }

  // Timeout fallback: if no response, play the timeout closing
  const timeoutSsml = speak(interpolateParams(script.closingMessages.timeout, params))

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>${upfrontDisclosure}
  ${sayElement(promptSsml, voice)}
  <Gather input="${input}" timeout="${timeout}" speechTimeout="${speechTimeoutAttr}" action="${escapedUrl}" method="POST"${hintsAttr}${enhancedAttr}>${gatherContent}
  </Gather>
  ${sayElement(timeoutSsml, voice)}
  <Hangup/>
</Response>`
}

/**
 * Build TwiML for the closing of a call (closing message + AI disclosure + hangup).
 */
export function buildDisclosureTwiml(
  script: CallScript,
  closingType: 'success' | 'notAvailable' | 'timeout' | 'error',
  params: Record<string, string>,
  voice = DEFAULT_VOICE
): string {
  const closingParts = script.closingMessages[closingType]
  const interpolatedClosing = interpolateParams(closingParts, params)
  const interpolatedDisclosure = interpolateParams(script.disclosure, params)

  const combined: SpeakPart[] = [...interpolatedClosing, ...interpolatedDisclosure]

  const ssml = speak(combined)

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${sayElement(ssml, voice)}
  <Hangup/>
</Response>`
}
