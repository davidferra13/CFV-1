/**
 * Phone Tree Navigator
 *
 * Handles IVR/phone tree navigation for calls to grocery stores and large businesses.
 * Detects automated menu prompts from Twilio's speech recognition and responds
 * with the appropriate DTMF tones to navigate to the right department.
 *
 * Strategy:
 * 1. Detect if we're hearing an automated menu (keyword patterns)
 * 2. Identify which department we need based on the ingredient type
 * 3. Send the right DTMF digit
 * 4. Detect transfers, holds, and human pickup
 * 5. Re-introduce when a human answers after navigation
 */

import { DEFAULT_VOICE, speak, type SpeakPart } from './voice-helpers'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhoneTreeAction {
  action: 'send_dtmf' | 'wait' | 'speak' | 'hangup'
  digit?: string // for send_dtmf: '1', '2', '3', etc.
  waitSeconds?: number // for wait: how long to wait
  message?: string // for speak: what to say
  reason: string // why this action was chosen
}

export interface DepartmentMapping {
  keywords: string[] // keywords that indicate this department in IVR menus
  dtmfPatterns: Record<string, string> // "press X for Y" extracted mappings
  priority: number // if multiple matches, use highest priority
}

export interface NavigationState {
  menuDetected: boolean
  departmentReached: boolean
  transferDetected: boolean
  holdDetected: boolean
  humanDetected: boolean
  navigationAttempts: number
  maxAttempts: number
}

// ---------------------------------------------------------------------------
// Department Mappings
// ---------------------------------------------------------------------------

const DEPARTMENTS: Record<string, DepartmentMapping> = {
  produce: {
    keywords: ['produce', 'fruits', 'vegetables', 'fresh produce', 'organic'],
    dtmfPatterns: {},
    priority: 10,
  },
  seafood: {
    keywords: ['seafood', 'fish', 'fish counter', 'fish market', 'fish department'],
    dtmfPatterns: {},
    priority: 10,
  },
  meat: {
    keywords: ['meat', 'butcher', 'deli', 'meat counter', 'meat department'],
    dtmfPatterns: {},
    priority: 10,
  },
  bakery: {
    keywords: ['bakery', 'bread', 'pastry'],
    dtmfPatterns: {},
    priority: 5,
  },
  general: {
    keywords: ['customer service', 'operator', 'representative', 'store', 'someone'],
    dtmfPatterns: {},
    priority: 1,
  },
}

// ---------------------------------------------------------------------------
// Ingredient to Department Classification
// ---------------------------------------------------------------------------

const INGREDIENT_DEPARTMENT_MAP: Record<string, string[]> = {
  produce: [
    'lettuce',
    'tomato',
    'onion',
    'garlic',
    'potato',
    'carrot',
    'celery',
    'pepper',
    'mushroom',
    'spinach',
    'kale',
    'arugula',
    'basil',
    'cilantro',
    'parsley',
    'thyme',
    'rosemary',
    'mint',
    'dill',
    'chive',
    'scallion',
    'leek',
    'shallot',
    'ginger',
    'turmeric',
    'avocado',
    'lemon',
    'lime',
    'orange',
    'apple',
    'berry',
    'strawberry',
    'blueberry',
    'raspberry',
    'mango',
    'pineapple',
    'melon',
    'watermelon',
    'grape',
    'peach',
    'pear',
    'plum',
    'fig',
    'date',
    'coconut',
    'banana',
    'squash',
    'zucchini',
    'eggplant',
    'broccoli',
    'cauliflower',
    'cabbage',
    'beet',
    'radish',
    'turnip',
    'rutabaga',
    'parsnip',
    'artichoke',
    'asparagus',
    'corn',
    'pea',
    'bean',
    'cucumber',
    'fennel',
    'endive',
    'radicchio',
    'watercress',
    'sunchoke',
    'ramp',
    'fiddlehead',
    'truffle',
    'microgreen',
  ],
  seafood: [
    'salmon',
    'tuna',
    'halibut',
    'cod',
    'bass',
    'trout',
    'snapper',
    'grouper',
    'swordfish',
    'mahi',
    'tilapia',
    'catfish',
    'sardine',
    'anchovy',
    'mackerel',
    'herring',
    'shrimp',
    'prawn',
    'lobster',
    'crab',
    'scallop',
    'mussel',
    'clam',
    'oyster',
    'squid',
    'calamari',
    'octopus',
    'eel',
    'uni',
    'caviar',
    'roe',
    'langoustine',
    'crawfish',
    'monkfish',
    'branzino',
    'fluke',
    'flounder',
    'sole',
    'wahoo',
  ],
  meat: [
    'beef',
    'steak',
    'ribeye',
    'filet',
    'tenderloin',
    'sirloin',
    'brisket',
    'short rib',
    'chuck',
    'ground beef',
    'veal',
    'lamb',
    'pork',
    'bacon',
    'ham',
    'sausage',
    'chorizo',
    'prosciutto',
    'pancetta',
    'salami',
    'chicken',
    'turkey',
    'duck',
    'quail',
    'game',
    'venison',
    'rabbit',
    'bison',
    'oxtail',
    'bone marrow',
    'liver',
    'sweetbread',
  ],
  bakery: [
    'bread',
    'baguette',
    'sourdough',
    'brioche',
    'focaccia',
    'ciabatta',
    'croissant',
    'roll',
    'pita',
    'naan',
    'tortilla',
    'cake',
    'pastry',
  ],
}

// ---------------------------------------------------------------------------
// IVR Detection Patterns
// ---------------------------------------------------------------------------

const IVR_INDICATORS = [
  /press\s+\d/i,
  /for\s+\w+\s*,?\s*press/i,
  /say\s+the\s+name/i,
  /please\s+select/i,
  /main\s+menu/i,
  /dial\s+by\s+name/i,
  /if\s+you\s+know\s+your\s+party/i,
  /extension/i,
  /para\s+espa[nñ]ol/i,
  /press\s+\d\s+(?:for|to\s+reach)/i,
  /to\s+speak\s+(?:with|to)\s+(?:a|an)/i,
  /listen\s+carefully\s+as\s+our\s+(?:options|menu)/i,
  /your\s+call\s+(?:is|will\s+be)/i,
]

const HOLD_INDICATORS = [
  /please\s+hold/i,
  /one\s+moment/i,
  /let\s+me\s+transfer/i,
  /hold\s+please/i,
  /transferring/i,
  /connecting\s+you/i,
  /please\s+wait/i,
  /just\s+a\s+moment/i,
  /bear\s+with\s+me/i,
  /putting\s+you\s+through/i,
  /on\s+hold/i,
  /your\s+call\s+is\s+important/i,
]

const HUMAN_INDICATORS = [
  /^(?:hello|hi|hey)\b/i,
  /how\s+can\s+I\s+help/i,
  /what\s+can\s+I\s+(?:do|help)/i,
  /this\s+is\s+\w+/i,
  /speaking/i,
  /good\s+(?:morning|afternoon|evening)/i,
  /thanks?\s+for\s+(?:calling|holding)/i,
  /how\s+(?:are|can)\s+(?:you|we)/i,
  /what\s+(?:are\s+you|can\s+we)/i,
]

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Detect if the speech result sounds like an automated IVR menu.
 */
export function detectIVRMenu(speechResult: string): boolean {
  const normalized = speechResult.toLowerCase().trim()
  return IVR_INDICATORS.some((pattern) => pattern.test(normalized))
}

/**
 * Determine the target department based on the ingredient being queried.
 * Returns the department key (produce, seafood, meat, bakery, general).
 */
export function determineTargetDepartment(ingredientQuery: string): string {
  const normalized = ingredientQuery.toLowerCase().trim()

  for (const [department, keywords] of Object.entries(INGREDIENT_DEPARTMENT_MAP)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return department
      }
    }
  }

  return 'general'
}

/**
 * Extract the DTMF digit for a target department from IVR speech.
 * Parses patterns like "press 3 for produce" or "for produce, press 3".
 */
export function extractDTMFOption(speechResult: string, targetDepartment: string): string | null {
  const normalized = speechResult.toLowerCase()
  const departmentMapping = DEPARTMENTS[targetDepartment]
  if (!departmentMapping) return null

  const allKeywords = departmentMapping.keywords

  // Pattern 1: "press X for/to reach DEPARTMENT"
  const pressForPattern = /press\s+(\d)\s+(?:for|to\s+reach)\s+([^,\.]+)/gi
  let match: RegExpExecArray | null
  while ((match = pressForPattern.exec(normalized)) !== null) {
    const digit = match[1]
    const dept = match[2].trim()
    if (allKeywords.some((kw) => dept.includes(kw))) {
      return digit
    }
  }

  // Pattern 2: "for DEPARTMENT, press X" or "for DEPARTMENT press X"
  const forPressPattern = /for\s+([^,]+?),?\s*press\s+(\d)/gi
  while ((match = forPressPattern.exec(normalized)) !== null) {
    const dept = match[1].trim()
    const digit = match[2]
    if (allKeywords.some((kw) => dept.includes(kw))) {
      return digit
    }
  }

  // Pattern 3: "DEPARTMENT, press X" or "DEPARTMENT press X"
  const deptPressPattern = /(\w[\w\s]*?)\s*,?\s*press\s+(\d)/gi
  while ((match = deptPressPattern.exec(normalized)) !== null) {
    const dept = match[1].trim()
    const digit = match[2]
    if (allKeywords.some((kw) => dept.includes(kw))) {
      return digit
    }
  }

  return null
}

/**
 * Detect patterns indicating a real person has answered the phone.
 */
export function detectHumanPickup(speechResult: string): boolean {
  const normalized = speechResult.toLowerCase().trim()

  // If it still has IVR patterns, it's probably not a human
  if (detectIVRMenu(normalized)) return false

  return HUMAN_INDICATORS.some((pattern) => pattern.test(normalized))
}

/**
 * Detect if the caller has been placed on hold or is being transferred.
 */
export function detectHold(speechResult: string): boolean {
  const normalized = speechResult.toLowerCase().trim()
  return HOLD_INDICATORS.some((pattern) => pattern.test(normalized))
}

/**
 * Main decision function. Given what we just heard and current state,
 * determine the next action to take.
 */
export function decideAction(
  speechResult: string,
  ingredientQuery: string,
  state: NavigationState
): PhoneTreeAction {
  const normalized = speechResult.toLowerCase().trim()

  // If a human has picked up (after navigating menus or directly)
  if (detectHumanPickup(normalized)) {
    const dept = determineTargetDepartment(ingredientQuery)
    const deptLabel = dept === 'general' ? '' : ` in ${dept}`
    return {
      action: 'speak',
      message: buildHumanGreeting(ingredientQuery, deptLabel),
      reason: `Human detected${state.menuDetected ? ' after IVR navigation' : ''}. Introducing and asking about ${ingredientQuery}.`,
    }
  }

  // If we detect hold/transfer, wait for the next person
  if (detectHold(normalized)) {
    return {
      action: 'wait',
      waitSeconds: 30,
      reason: 'Hold or transfer detected. Waiting for next response.',
    }
  }

  // If IVR menu detected, try to navigate
  if (detectIVRMenu(normalized)) {
    const targetDept = determineTargetDepartment(ingredientQuery)
    const digit = extractDTMFOption(speechResult, targetDept)

    if (digit) {
      return {
        action: 'send_dtmf',
        digit,
        reason: `IVR menu detected. Pressing ${digit} to reach ${targetDept}.`,
      }
    }

    // Try general/operator if we can't find the specific department
    if (targetDept !== 'general') {
      const generalDigit = extractDTMFOption(speechResult, 'general')
      if (generalDigit) {
        return {
          action: 'send_dtmf',
          digit: generalDigit,
          reason: `Cannot find ${targetDept} option. Pressing ${generalDigit} for operator/customer service.`,
        }
      }
    }

    // Stuck: try pressing 0 for operator (common convention)
    if (state.navigationAttempts >= 3 && state.navigationAttempts < state.maxAttempts) {
      return {
        action: 'send_dtmf',
        digit: '0',
        reason: 'Cannot identify correct option after multiple attempts. Trying 0 for operator.',
      }
    }

    // Completely stuck: hang up
    if (state.navigationAttempts >= state.maxAttempts) {
      return {
        action: 'hangup',
        message: 'Sorry, having trouble navigating your phone system. Will try again later.',
        reason: `Exceeded max navigation attempts (${state.maxAttempts}). Hanging up.`,
      }
    }

    // Menu detected but couldn't extract digit. Wait for more of the menu to play.
    return {
      action: 'wait',
      waitSeconds: 8,
      reason: 'IVR menu detected but target option not found yet. Waiting for more options.',
    }
  }

  // No IVR detected, no human detected, no hold. Could be silence or unclear speech.
  // If we've had menu interactions before, wait a bit for more input.
  if (state.menuDetected && !state.humanDetected) {
    return {
      action: 'wait',
      waitSeconds: 10,
      reason: 'Previously in IVR but no clear signal now. Waiting for next prompt.',
    }
  }

  // Default: treat as direct human pickup (no IVR at all)
  return {
    action: 'speak',
    message: buildHumanGreeting(ingredientQuery, ''),
    reason: 'No IVR detected. Treating as direct human pickup.',
  }
}

// ---------------------------------------------------------------------------
// TwiML Builder
// ---------------------------------------------------------------------------

/**
 * Generate TwiML for the navigation action.
 */
export function buildNavigationTwiml(
  action: PhoneTreeAction,
  nextGatherUrl: string,
  voice = DEFAULT_VOICE
): string {
  const escapedUrl = nextGatherUrl.replace(/&/g, '&amp;')

  switch (action.action) {
    case 'send_dtmf':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play digits="${action.digit}"/>
  <Pause length="2"/>
  <Gather input="speech dtmf" timeout="15" speechTimeout="auto" action="${escapedUrl}" method="POST" enhanced="true">
    <Say voice="${voice}"></Say>
  </Gather>
  <Pause length="5"/>
  <Gather input="speech dtmf" timeout="20" speechTimeout="auto" action="${escapedUrl}" method="POST" enhanced="true">
    <Say voice="${voice}"></Say>
  </Gather>
</Response>`

    case 'wait':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="${action.waitSeconds ?? 10}"/>
  <Gather input="speech dtmf" timeout="15" speechTimeout="auto" action="${escapedUrl}" method="POST" enhanced="true">
    <Say voice="${voice}"></Say>
  </Gather>
</Response>`

    case 'speak': {
      const ssml = speak([action.message ?? ''])
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${ssml}</Say>
  <Gather input="speech" timeout="12" speechTimeout="auto" action="${escapedUrl}" method="POST" enhanced="true">
    <Say voice="${voice}"></Say>
  </Gather>
</Response>`
    }

    case 'hangup': {
      const closingMsg = speak([action.message ?? 'Thank you for your time. Goodbye.'])
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${closingMsg}</Say>
  <Hangup/>
</Response>`
    }

    default:
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`
  }
}

// ---------------------------------------------------------------------------
// State Management
// ---------------------------------------------------------------------------

/**
 * Create initial navigation state.
 */
export function createNavigationState(): NavigationState {
  return {
    menuDetected: false,
    departmentReached: false,
    transferDetected: false,
    holdDetected: false,
    humanDetected: false,
    navigationAttempts: 0,
    maxAttempts: 5,
  }
}

/**
 * Return updated state after an action is taken.
 */
export function updateNavigationState(
  state: NavigationState,
  action: PhoneTreeAction
): NavigationState {
  const next = { ...state }

  switch (action.action) {
    case 'send_dtmf':
      next.menuDetected = true
      next.navigationAttempts = state.navigationAttempts + 1
      break
    case 'wait':
      if (action.reason.includes('Hold') || action.reason.includes('transfer')) {
        next.holdDetected = true
        next.transferDetected = true
      }
      break
    case 'speak':
      if (action.reason.includes('Human')) {
        next.humanDetected = true
        next.departmentReached = true
      }
      break
    case 'hangup':
      // Terminal state, no further updates needed
      break
  }

  return next
}

// ---------------------------------------------------------------------------
// Helpers (private)
// ---------------------------------------------------------------------------

function buildHumanGreeting(ingredientQuery: string, deptLabel: string): string {
  const parts: SpeakPart[] = [
    'Hey there, ',
    { type: 'break', ms: 200 },
    "hope I'm not catching you at a bad time. ",
    { type: 'break', ms: 400 },
    "I'm calling to check on availability",
    ...(deptLabel ? [deptLabel as SpeakPart] : []),
    '. ',
    { type: 'break', ms: 300 },
    'Do you happen to have ',
    { type: 'emphasis', text: ingredientQuery },
    ' in stock right now?',
  ]
  return speak(parts)
}
