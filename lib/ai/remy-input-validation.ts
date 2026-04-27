/**
 * Remy Input Validation & Sanitization
 *
 * Shared validation for all Remy API routes. Handles:
 * - History array size limits (count + per-message length)
 * - Request body schema validation
 * - Prompt injection sanitization for database fields injected into system prompts
 * - Error message sanitization (no internal details to clients)
 * - SSRF URL validation for web read actions
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max number of history messages accepted from client */
export const MAX_HISTORY_LENGTH = 20

/** Max characters per individual history message */
export const MAX_HISTORY_MESSAGE_LENGTH = 4000

/** Max total characters across all history messages */
export const MAX_HISTORY_TOTAL_LENGTH = 30_000

/** Max characters for the current message (matches guardrails) */
export const MAX_MESSAGE_LENGTH = 8000

/** Max file size (bytes) before FileReader in the browser */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

/** Max conversations before auto-pruning in IndexedDB */
export const MAX_CONVERSATIONS = 200

/** Max messages per conversation before pruning oldest */
export const MAX_MESSAGES_PER_CONVERSATION = 500

// ─── History Validation ───────────────────────────────────────────────────────

interface HistoryMessage {
  role: string
  content: string
}

/**
 * Validate and sanitize the history array from a Remy API request body.
 * Returns a safe, truncated history array. Never throws - always returns a usable result.
 */
export function validateHistory(raw: unknown, maxMessages = MAX_HISTORY_LENGTH): HistoryMessage[] {
  if (!Array.isArray(raw)) return []

  const safe: HistoryMessage[] = []
  let totalLength = 0

  // Take only the most recent messages, up to the max
  const recent = raw.slice(-maxMessages)

  for (const entry of recent) {
    // Skip malformed entries
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.role !== 'string' || typeof entry.content !== 'string') continue

    // Validate role is one of the expected values
    const role =
      entry.role === 'user' || entry.role === 'assistant' || entry.role === 'remy'
        ? entry.role
        : 'user'

    // Truncate individual messages that are too long
    let content = entry.content.slice(0, MAX_HISTORY_MESSAGE_LENGTH)

    // Sanitize history entries against prompt injection (same as current message)
    // A poisoned earlier message could manipulate the LLM when replayed in context
    content = content.normalize('NFC')
    content = content.replace(/[\0\u200B\u200C\u200D\uFEFF\u00AD]/g, '')

    // Strip injection patterns from history content (prevents poisoned IndexedDB replay)
    content = stripInjectionPatterns(content)

    // Redact history entries containing harmful content (prevents poisoned replay)
    // User messages with slurs, threats, or harmful instructions get replaced so the
    // LLM never sees them in context, even if the client-side IndexedDB was tampered with.
    if (role === 'user') {
      const harmfulCheck = checkHarmfulContentBlockRaw(content)
      if (harmfulCheck) {
        content = '[message removed by safety filter]'
      }
    }

    // Check total budget
    if (totalLength + content.length > MAX_HISTORY_TOTAL_LENGTH) break

    totalLength += content.length
    safe.push({ role, content })
  }

  return safe
}

// ─── Request Body Validation ──────────────────────────────────────────────────

interface RecentPageEntry {
  path: string
  label: string
  at: string
}

interface RecentActionEntry {
  action: string
  entity: string
  at: string
}

interface RecentErrorEntry {
  message: string
  context: string
  at: string
}

interface ValidatedRemyBody {
  message: string
  history: HistoryMessage[]
  currentPage?: string
  tenantId?: string
  recentPages?: RecentPageEntry[]
  recentActions?: RecentActionEntry[]
  recentErrors?: RecentErrorEntry[]
  sessionMinutes?: number
  activeForm?: string
}

/**
 * Validate the full request body for any Remy API route.
 * Returns a validated body or null if the body is fundamentally invalid.
 */
export function validateRemyRequestBody(raw: unknown): ValidatedRemyBody | null {
  if (!raw || typeof raw !== 'object') return null

  const body = raw as Record<string, unknown>

  // message is required and must be a string
  if (typeof body.message !== 'string') return null

  // Hard reject oversized messages instead of truncating them.
  // This keeps request semantics explicit and lets clients/tests verify the limit.
  if (body.message.length > MAX_MESSAGE_LENGTH) return null

  const message = body.message
  if (message.length === 0) return null

  const history = validateHistory(body.history)
  const currentPage =
    typeof body.currentPage === 'string' ? body.currentPage.slice(0, 500) : undefined
  const tenantId = typeof body.tenantId === 'string' ? body.tenantId.slice(0, 100) : undefined

  // Validate navigation trail (max 10 entries)
  const recentPages = validateRecentPages(body.recentPages)

  // Validate recent actions (max 10 entries)
  const recentActions = validateRecentActions(body.recentActions)

  // Validate recent errors (max 5 entries)
  const recentErrors = validateRecentErrors(body.recentErrors)

  // Session duration (capped at 24 hours)
  const sessionMinutes =
    typeof body.sessionMinutes === 'number' && body.sessionMinutes >= 0
      ? Math.min(Math.round(body.sessionMinutes), 1440)
      : undefined

  // Active form (what the chef is currently working on)
  const activeForm = typeof body.activeForm === 'string' ? body.activeForm.slice(0, 200) : undefined

  return {
    message,
    history,
    currentPage,
    tenantId,
    recentPages,
    recentActions,
    recentErrors,
    sessionMinutes,
    activeForm,
  }
}

function validateRecentPages(raw: unknown): RecentPageEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const safe: RecentPageEntry[] = []
  for (const entry of raw.slice(-10)) {
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.path !== 'string' || typeof entry.label !== 'string') continue
    safe.push({
      path: entry.path.slice(0, 200),
      label: entry.label.slice(0, 100),
      at: typeof entry.at === 'string' ? entry.at.slice(0, 30) : '',
    })
  }
  return safe.length > 0 ? safe : undefined
}

function validateRecentActions(raw: unknown): RecentActionEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const safe: RecentActionEntry[] = []
  for (const entry of raw.slice(-10)) {
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.action !== 'string' || typeof entry.entity !== 'string') continue
    safe.push({
      action: entry.action.slice(0, 100),
      entity: entry.entity.slice(0, 200),
      at: typeof entry.at === 'string' ? entry.at.slice(0, 30) : '',
    })
  }
  return safe.length > 0 ? safe : undefined
}

function validateRecentErrors(raw: unknown): RecentErrorEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const safe: RecentErrorEntry[] = []
  for (const entry of raw.slice(-5)) {
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.message !== 'string' || typeof entry.context !== 'string') continue
    safe.push({
      message: entry.message.slice(0, 200),
      context: entry.context.slice(0, 100),
      at: typeof entry.at === 'string' ? entry.at.slice(0, 30) : '',
    })
  }
  return safe.length > 0 ? safe : undefined
}

// ─── Recipe Generation Block (HARD RULE - AI NEVER GENERATES RECIPES) ────────

/**
 * Patterns that indicate the user is asking AI to generate, create, or suggest a recipe.
 * AI can ONLY search the chef's existing recipe book - never fabricate, generate, or pull
 * recipes from anywhere. This check runs before any LLM call.
 */
const RECIPE_GENERATION_PATTERNS = [
  // Direct creation requests: "create/generate/make [adjective/ingredient] recipe"
  /\b(create|make|write|draft|generate|come up with|give me|suggest)\s+.*(recipe|dishes?|meals?)\b/i,
  // "recipe for X" (asking AI to produce a recipe)
  /\brecipe\s+for\s+(?!search|lookup|find)/i,
  // "how to cook/make X" (recipe generation by another name)
  /\bhow\s+(to|do\s+(you|i))\s+(cook|make|prepare|bake|roast|grill|saut[eé]|braise|fry|smoke|poach)\b/i,
  // "what should I cook/make"
  /\bwhat\s+should\s+I\s+(cook|make|prepare|bake)\b/i,
  // "add a recipe" (not "add ingredient" which is also blocked separately)
  /\badd\s+(a\s+|new\s+)?recipe\b/i,
  // "generate meal" / "suggest meal" / "meal plan" / "meal idea"
  /\b(generate|suggest|create|give me)\s+(a\s+)?(meal|dish|dinner|lunch|breakfast|menu item)\b/i,
  // "suggest what I should cook for [event]" - word "suggest" before "what" breaks the simpler regex
  /\bsuggest\s+what\s+(I|we)\s+should\s+(cook|make|prepare|serve)\s+for\b/i,
  // "what should I cook for" (event-specific recipe generation)
  /\bwhat\s+(should|can|could)\s+(I|we)\s+(cook|make|prepare|serve)\s+for\b/i,
]

/** The refusal message when recipe generation is detected */
export const RECIPE_GENERATION_REFUSAL =
  "I can't create, suggest, or generate recipes - that's your creative domain as the chef! " +
  "I can search through your existing recipe book if you'd like. " +
  'To add a new recipe, head to Recipes → New Recipe.'

/**
 * Patterns that indicate the user wants to SEARCH or LOOK UP existing recipes.
 * These are legitimate read-only operations and must NOT be blocked by the
 * recipe generation guardrail. Checked before generation patterns.
 */
const RECIPE_SEARCH_PATTERNS = [
  // Explicit search/lookup intent
  /\b(search|find|look\s*up|lookup|show|check|list|browse|pull\s*up)\b.*\b(recipe|recipes|menu|dishes?)\b/i,
  // "what recipes do we have" style inventory queries
  /\bwhat\s+recipes?\s+do\s+(i|we|you)\s+have\b/i,
  /\bwhat\s+recipes?\s+are\s+(in|on)\s+(my|our|the)\s+(recipe\s+book|library|list|collection)\b/i,
  // "recipe search/book/list"
  /\brecipe\s+(search|lookup|book|list|collection|library|catalog)\b/i,
  // Possessive - "my/our/the recipes"
  /\b(my|our|the|your|chef'?s?)\s+recipes?\b/i,
  // "do you/we have a recipe for X"
  /\bdo\s+(you|we)\s+have\s+.*\b(recipe|dish)/i,
  // "any recipes for X" / "recipes with X"
  /\b(any|which)\s+recipes?\s+(for|with|using|that)/i,
  // recipe.search action reference
  /\brecipe\.search\b/i,
]

/**
 * Check if a message is asking AI to generate a recipe.
 * Returns the refusal message if blocked, or null if the message is fine.
 */
export function checkRecipeGenerationBlock(message: string): string | null {
  // Allow recipe SEARCH queries - these are read-only lookups, not generation
  for (const pattern of RECIPE_SEARCH_PATTERNS) {
    if (pattern.test(message)) {
      return null
    }
  }

  for (const pattern of RECIPE_GENERATION_PATTERNS) {
    if (pattern.test(message)) {
      return RECIPE_GENERATION_REFUSAL
    }
  }
  return null
}

// ─── Harmful Content Block (Safety) ──────────────────────────────────────────

/**
 * Patterns that indicate the user is requesting harmful, violent, illegal, or
 * dangerous real-world content. Remy must refuse these before they reach the LLM,
 * regardless of how the model's own safety training would handle them.
 *
 * This is NOT about recipe generation or out-of-scope topics (those have their
 * own guards). This catches requests that could cause real-world harm.
 */
const HARMFUL_CONTENT_PATTERNS = [
  // Weapons, explosives, firearms
  /\b(how\s+to|ways?\s+to|instructions?\s+for|steps?\s+to|guide\s+to)\s+(make|build|create|assemble|construct|manufacture)\s+(a\s+|an\s+)?(bomb|explosive|grenade|detonator|ied|landmine|pipe\s*bomb|molotov|incendiary|firearm|gun|rifle|weapon|silencer|suppressor)\b/i,
  /\b(bomb|explosive|grenade|detonator|ied|landmine|pipe\s*bomb|molotov|incendiary)\s+(making|building|construction|assembly|recipe|instructions?|guide|tutorial|howto|how-to)\b/i,
  /\b(homemade|diy|improvised)\s+(bombs?|explosives?|weapons?|firearms?|guns?|grenades?|detonators?)\b/i,
  // Poisons, toxic substances (not food safety - specifically intent to harm)
  /\b(how\s+to|ways?\s+to)\s+(poison|drug|sedate|knock\s+out|incapacitate)\s+(a\s+|an\s+|some\s*)?(person|someone|people|somebody|human|man|woman|child|victim)\b/i,
  /\b(undetectable|untraceable)\s+(poison|toxin|substance)\b/i,
  /\b(lethal|fatal|deadly)\s+(dose|amount|quantity)\s+of\b/i,
  // Violence, harm to people
  /\b(how\s+to|ways?\s+to|guide\s+to)\s+(kill|murder|assassinate|strangle|suffocate|stab|shoot|attack|assault|kidnap|abduct|torture)\s+(a\s+|an\s+|some\s*)?(person|someone|people|somebody|human|man|woman|child)\b/i,
  /\b(how\s+to)\s+(get\s+away\s+with|hide|dispose\s+of)\s+(a\s+)?(murder|body|corpse|killing|crime)\b/i,
  // Drugs (synthesis, not food/culinary herbs)
  /\b(how\s+to|ways?\s+to|instructions?\s+for)\s+(make|cook|synthesize|manufacture|produce|brew)\s+(meth|methamphetamine|cocaine|crack|heroin|fentanyl|lsd|mdma|ecstasy|dmt|pcp|ghb)\b/i,
  /\b(meth|cocaine|heroin|fentanyl)\s+(recipe|synthesis|cook|lab|production)\b/i,
  // Arson, property destruction with intent
  /\b(how\s+to)\s+(start\s+a\s+fire|commit\s+arson|burn\s+down)\b/i,
  // Self-harm (redirect compassionately)
  /\b(how\s+to|ways?\s+to|methods?\s+(of|for))\s+(kill|hurt|harm|cut)\s+(myself|yourself|oneself)\b/i,
  /\b(suicide|self-?harm)\s+(methods?|ways?|how|instructions?|guide)\b/i,
  // Human trafficking, CSAM
  /\b(how\s+to)\s+(traffic|smuggle|exploit)\s+(a\s+)?(person|people|human|child|children|minor|minors)\b/i,
  // Hacking/cyberattack with malicious intent
  /\b(how\s+to)\s+(hack|ddos|dos|phish|ransomware|exploit)\s+(a\s+|an\s+)?(server|computer|website|bank|account|network|system)\b/i,
  // Terrorism, mass violence (Layer 1 has these but Layer 2 needs them for public/admin bypass)
  /\b(how\s+to)\s+(join|recruit\s+for|support|fund|plan)\s+(a\s+)?(terrorist|extremist|militia|insurgent)\b/i,
  /\b(mass\s+shooting|mass\s+casualty|school\s+shooting|bomb\s+threat)\s*(plan|how|guide|instructions?)?\b/i,
  /\b(how\s+to)\s+(radicalize|recruit|plan\s+an?\s+attack|carry\s+out\s+an?\s+attack)\b/i,
  // Slurs and hate speech (Layer 1 has these but public/client routes skip Layer 1)
  /\b(n[i1]gg[ae3]r|f[a4]gg?[o0]t|k[i1]ke|sp[i1]c|ch[i1]nk|w[e3]tb[a4]ck|tr[a4]nny|d[y1]ke)\b/i,
  // Direct personal threats
  /\b(i'?ll|i\s+will|gonna|going\s+to)\s+(kill|shoot|stab|rape|murder|attack|assault|hurt)\s+(you|remy|this\s+place|everyone)\b/i,
  // Sexual harassment
  /\b(send\s+nudes|show\s+me\s+your\s+(body|breasts?|ass|penis|vagina|genitals?))\b/i,
  /\b(i\s+want\s+to|let\s+me)\s+(rape|molest|grope|touch)\b/i,
  // Self-harm encouragement toward others
  /\b(kill\s+yourself|kys|go\s+die|you\s+should\s+(die|kill\s+yourself))\b/i,
]

/** Check if message contains self-harm indicators (needs compassionate response) */
const SELF_HARM_PATTERNS = [
  /\b(how\s+to|ways?\s+to|methods?\s+(of|for))\s+(kill|hurt|harm|cut)\s+(myself|yourself|oneself)\b/i,
  /\b(suicide|self-?harm)\s+(methods?|ways?|how|instructions?|guide)\b/i,
  /\b(want\s+to|going\s+to|thinking\s+(about|of))\s+(kill|hurt|harm)\s+(myself|yourself)\b/i,
  /\b(don'?t\s+want\s+to|can'?t)\s+(live|go\s+on|keep\s+going|be\s+here)\b/i,
]

/**
 * Internal raw check: does content match harmful patterns?
 * Used by validateHistory to redact poisoned history entries.
 * Returns true if harmful, false if safe. No normalization (history is already sanitized).
 */
function checkHarmfulContentBlockRaw(content: string): boolean {
  const lower = content.toLowerCase()
  for (const pattern of HARMFUL_CONTENT_PATTERNS) {
    if (pattern.test(lower)) return true
  }
  return false
}

/** Compassionate refusal for self-harm (resources, not dismissal) */
export const SELF_HARM_REFUSAL =
  'I hear you, and I want you to know that help is available right now. ' +
  'Please reach out to the 988 Suicide & Crisis Lifeline: call or text 988 (US), ' +
  'or contact the Crisis Text Line by texting HOME to 741741. ' +
  "You don't have to go through this alone. " +
  "I'm here for your business whenever you're ready."

/** Standard refusal for harmful content */
export const HARMFUL_CONTENT_REFUSAL =
  "Whoa, chef. I'm not going there. " +
  "I'm built to help you run your food business, not answer that kind of question. " +
  "Let's get back to what matters: your clients, your events, your kitchen. " +
  'What do you actually need help with?'

/**
 * Check if a message requests harmful, violent, or illegal content.
 * Self-harm gets a compassionate response with resources.
 * Returns the refusal message if blocked, or null if the message is safe.
 */
export function checkHarmfulContentBlock(message: string): string | null {
  const normalized = normalizeForGuardCheck(message)

  // Self-harm check first (compassionate response, not a rebuke)
  for (const pattern of SELF_HARM_PATTERNS) {
    if (pattern.test(normalized)) {
      return SELF_HARM_REFUSAL
    }
  }

  for (const pattern of HARMFUL_CONTENT_PATTERNS) {
    if (pattern.test(normalized)) {
      return HARMFUL_CONTENT_REFUSAL
    }
  }
  return null
}

// ─── Guard Check Normalization ───────────────────────────────────────────────

/**
 * Normalize a message string before running it against guard-check regex patterns.
 * This defeats common evasion techniques: leetspeak, spaced-out characters,
 * dotted/hyphenated single chars, and zero-width Unicode tricks.
 *
 * FOR GUARD CHECKS ONLY. Never use this for display, storage, or forwarding
 * to the LLM. The original message text must be preserved for those purposes.
 */
export function normalizeForGuardCheck(message: string): string {
  let s = message

  // 1. Lowercase
  s = s.toLowerCase()

  // 2. Strip zero-width characters (defense-in-depth, also done elsewhere)
  s = s.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u180E]/g, '')

  // 3. Normalize common Unicode homoglyphs to ASCII equivalents
  //    Cyrillic, Greek, and other lookalikes that bypass Latin regex
  const homoglyphs: Record<string, string> = {
    '\u0430': 'a', // Cyrillic a
    '\u0435': 'e', // Cyrillic ie
    '\u043E': 'o', // Cyrillic o
    '\u0440': 'p', // Cyrillic er
    '\u0441': 'c', // Cyrillic es
    '\u0443': 'y', // Cyrillic u
    '\u0445': 'x', // Cyrillic ha
    '\u0456': 'i', // Cyrillic i (Ukrainian)
    '\u0458': 'j', // Cyrillic je
    '\u04BB': 'h', // Cyrillic shha
    '\u0391': 'a', // Greek Alpha
    '\u0392': 'b', // Greek Beta
    '\u0395': 'e', // Greek Epsilon
    '\u039A': 'k', // Greek Kappa
    '\u039C': 'm', // Greek Mu
    '\u039D': 'n', // Greek Nu
    '\u039F': 'o', // Greek Omicron
    '\u03A1': 'p', // Greek Rho
    '\u03A4': 't', // Greek Tau
    '\u03B1': 'a', // Greek alpha
    '\u03B5': 'e', // Greek epsilon
    '\u03BF': 'o', // Greek omicron
    '\u03C1': 'p', // Greek rho
  }
  s = s.replace(/./g, (ch) => homoglyphs[ch] ?? ch)

  // 4. Replace common leetspeak substitutions
  s = s
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')

  // 5. Remove dots and hyphens between single characters
  //    "b.o.m.b" -> "bomb", "b-o-m-b" -> "bomb"
  s = s.replace(/\b(\w)([\.\-]\w)+\b/g, (match) => match.replace(/[\.\-]/g, ''))

  // 6. Collapse spaces between single characters
  //    "b o m b" -> "bomb", "k i l l" -> "kill"
  s = s.replace(/\b(\w) (\w) (\w)( \w)*\b/g, (match) => match.replace(/ /g, ''))

  return s
}

// ─── Out-of-Scope Guardrails (Non-Business Requests) ────────────────────────

/**
 * Patterns that indicate the user is asking for something outside Remy's scope:
 * creative writing (poems, stories), philosophical questions, entertainment, etc.
 * Remy's expertise is in chef business management - not general AI tasks.
 */
const OUT_OF_SCOPE_PATTERNS = [
  // Poetry, creative writing, storytelling (expanded to catch all variations)
  /\b(write|compose|create|generate|make)\s+(me\s+|up\s+)?(a\s+)?(funny\s+)?(poem|poetry|story|song|joke|limerick|haiku|narrative|tale|story|essay|novel|screenplay|script)\b/i,
  /\b(generate|compose|write)\s+(a\s+)?(short\s+)?(story|tale|narrative|essay|novel)\b/i,
  // General philosophical/existential questions
  /\b(what\s+is\s+the\s+meaning|meaning\s+of)\b/i,
  /\b(why\s+do\s+we\s+exist|existential|philosophy|philosophical)\b/i,
  // Entertainment
  /\b(tell\s+me\s+a\s+joke|tell\s+me\s+a\s+story)\b/i,
  // General knowledge (unless business-related)
  /\b(what\s+is|who\s+is|when\s+did)\s+(the\s+)?(president|history|science|math|physics|biology|chemistry|geography)\b/i,
  // Requests for advice outside chef domain
  /\b(give\s+me\s+relationship|dating|love|life\s+advice)\b/i,
  // Homework, coding, academic
  /\b(solve\s+this|help\s+me\s+with\s+(my\s+)?homework|write\s+(?:an?\s+)?(?:essay|paper|thesis|code|program|script))\b/i,
  /\b(debug|compile|code|program|algorithm|data\s+structure)\b.*\b(help|write|fix|create)\b/i,
  // Medical/legal beyond food domain
  /\b(diagnose|prescription|symptoms|should\s+i\s+see\s+a\s+doctor|medical\s+advice)\b/i,
  /\b(legal\s+advice|sue|lawsuit|legal\s+rights|am\s+i\s+liable)\b/i,
  // Political/religious
  /\b(who\s+should\s+i\s+vote|political\s+opinion|my\s+faith|pray|religious)\b/i,
  // Investment/financial outside chef business
  /\b(invest|stock|crypto|bitcoin|forex|retirement\s+fund|401k|ira)\b/i,
]

/** The refusal message for out-of-scope requests */
export const OUT_OF_SCOPE_REFUSAL =
  "Ha - nice try, chef. I've got 40 years of kitchen wisdom and business chops, " +
  "but that's outside my station. Let's stay in our lane. " +
  "What's the real question? Are we talking about your business, your clients, or your events? " +
  "I'm all ears for those. 😄"

/**
 * Check if a message is requesting something outside Remy's scope.
 * Returns the refusal message if blocked, or null if the message is fine.
 */
export function checkOutOfScopeBlock(message: string): string | null {
  const normalized = normalizeForGuardCheck(message)
  for (const pattern of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(normalized)) {
      return OUT_OF_SCOPE_REFUSAL
    }
  }
  return null
}

// ─── Dangerous/Protected Action Blocking ──────────────────────────────────────

/** Patterns for dangerous system requests that must be blocked clearly */
const DANGEROUS_ACTION_PATTERNS = [
  // Delete/destroy data
  /\b(delete|remove|destroy|wipe|clear|drop)\b.*\b(all\s+)?(data|database|records|clients|events|everything)\b/i,
  // Show system prompt/instructions/internals/guidelines (with more flexible matching)
  /\b(show|reveal|tell|display|list|print|give|provide|explain|describe)\b.*\b(system|internal)?\s*(prompt|instructions|internals?|rules?|guidelines?|how\s+you\s+work|how\s+do\s+you|how\s+are\s+you)\b/i,
  /\b(what|tell)\s+.*\b(your\s+)?(instructions|rules|guidelines|prompts?|internals?|system)\b/i,
  /\b(what'?s?|what\s+is)\s+(your\s+)?(prompt|instructions|rules|guidelines|internals?|system)\b/i,
  /\bhow\s+do\s+you\s+work\b/i,
  /\bhow\s+does\s+remy\s+work\b/i,
  // Ignore previous instructions (jailbreak attempts)
  /\b(ignore|override|bypass|skip|forget|disregard)\b.*(all\s+)?(previous|prior|above)?\b\s*(instructions?|prompts?|rules?|guidelines?)\b/i,
  // Developer/admin/root mode activation
  /\b(developer|dev|admin|root|debug)\s+mode\b/i,
  /\b(switch|enter|activate|enable|turn)\s+(on\s+)?(developer|dev|admin|root|debug)\b/i,
  // Data exfiltration - extracting all client data or financials
  /\b(export|dump|extract|give me)\s+(all|every)\s+(client|customer|financial|revenue|payment|ledger)\s+(data|info|records?|entries|details)\b/i,
  // SQL/code injection attempts
  /\b(select|insert|update|drop|alter|truncate)\s+(from|into|table|database|schema)\b/i,
  /\b(exec|execute|eval|run)\s+(sql|query|command|code|script)\b/i,
  // Token/API key extraction
  /\b(api|secret|token|key|password|credential|env)\s*(key|variable|value|string)?\b.*\b(show|reveal|give|tell|print|display)\b/i,
  /\b(show|reveal|give|tell|print|display)\b.*\b(api|secret|token|key|password|credential|env)\b/i,
  // Pretend/roleplay as another entity
  /\b(pretend|act|behave|roleplay|role-?play)\s+(you'?re|as|like)\s+(a|an|the)\b/i,
  /\byou\s+are\s+now\s+(a|an|the|my)\b/i,
  // "Forget everything" / memory manipulation
  /\b(forget|erase|clear|reset)\s+(everything|all|your)\s*(memory|memories|knowledge|context|data)?\b/i,
]

/** Refusal for dangerous/protected actions */
export const DANGEROUS_ACTION_REFUSAL =
  "I can't do that - that would require explicit confirmation and oversight. " +
  "I'm here to help with your business: managing clients, events, finances, and recipes. " +
  'What can I actually help you with today? 😄'

/**
 * Check if a message is requesting a dangerous or protected action.
 * Returns the refusal message if blocked, or null if the message is safe.
 */
export function checkDangerousActionBlock(message: string): string | null {
  const normalized = normalizeForGuardCheck(message)
  for (const pattern of DANGEROUS_ACTION_PATTERNS) {
    if (pattern.test(normalized)) {
      return DANGEROUS_ACTION_REFUSAL
    }
  }
  return null
}

// ─── Prompt Injection Sanitization ────────────────────────────────────────────

// Shared patterns - single source of truth for both guardrails and sanitization
import { PROMPT_INJECTION_REGEXPS } from './remy-injection-patterns'

/**
 * Strip injection patterns, collapse excessive newlines, and collapse whitespace padding.
 * Shared by sanitizeForPrompt (DB fields) and validateHistory (replayed messages).
 * Does NOT normalize Unicode, strip zero-width chars, or cap length (callers handle those).
 */
function stripInjectionPatterns(text: string): string {
  let result = text

  // Strip injection patterns entirely (not bracket-wrapped, fully removed).
  // The LLM cannot follow instructions it never sees.
  for (const pattern of PROMPT_INJECTION_REGEXPS) {
    result = result.replace(pattern, '')
  }

  // Collapse excessive newlines (injection delimiter attempts)
  result = result.replace(/\n{4,}/g, '\n\n\n')

  // Collapse runs of whitespace on a single line (padding attacks)
  result = result.replace(/[ \t]{20,}/g, ' ')

  return result
}

/**
 * Sanitize a database field value before including it in a system prompt.
 * Strips injection patterns entirely and applies structural hardening.
 *
 * Use this for ALL user-controlled database fields that get injected into prompts:
 * - client names, notes, special_requests, vibe_notes
 * - event occasions, kitchen_notes, menu_revision_notes
 * - AAR fields, recipe names, etc.
 */
export function sanitizeForPrompt(value: string | null | undefined): string {
  if (!value) return ''

  let sanitized = value

  // Unicode-normalize to NFC to prevent homoglyph bypass attacks
  // (e.g., Cyrillic 'а' instead of Latin 'a' to evade regex patterns)
  sanitized = sanitized.normalize('NFC')

  // Remove null bytes, zero-width characters, and directional overrides
  // that can evade pattern matching or flip visible text order
  sanitized = sanitized.replace(
    /[\0\u200B\u200C\u200D\uFEFF\u00AD\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,
    ''
  )

  // Strip injection patterns, collapse newlines and whitespace
  sanitized = stripInjectionPatterns(sanitized)

  // Cap length - no single database field should be more than 2000 chars in a prompt
  if (sanitized.length > 2000) {
    sanitized = sanitized.slice(0, 2000) + '...'
  }

  return sanitized.trim()
}

/**
 * Wrap a sanitized DB field value in structural fencing for the system prompt.
 * The fence tells the LLM explicitly that content inside is user-provided data,
 * not instructions it should follow. Use this around every DB value injected
 * into system prompts, AFTER calling sanitizeForPrompt().
 *
 * @param label - a short descriptor like "special_requests" or "kitchen_notes"
 * @param value - already-sanitized value (pass through sanitizeForPrompt first)
 */
export function fenceForPrompt(label: string, value: string): string {
  if (!value) return ''
  return `<user-data field="${label}">${value}</user-data>`
}

// ─── Error Message Sanitization ───────────────────────────────────────────────

/**
 * Internal patterns that should NEVER appear in client-facing error messages.
 */
const INTERNAL_PATTERNS = [
  /\/app\//i,
  /\/lib\//i,
  /\/node_modules\//i,
  /at\s+\w+\s+\(/i, // Stack trace lines
  /c:\\users\\/i, // Windows paths
  /\/home\//i, // Linux paths
  /db/i,
  /postgresql/i,
  /column\s+["']\w+['"]/i, // Column names
  /table\s+["']\w+['"]/i, // Table names
  /relation\s+["']\w+['"]/i, // Relation names
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /localhost:\d+/i,
  /127\.0\.0\.\d+/i,
  /192\.168\.\d+\.\d+/i,
  /10\.\d+\.\d+\.\d+/i,
]

/**
 * Sanitize an error message before sending it to the client.
 * Replaces internal details with a generic message.
 */
export function sanitizeErrorForClient(
  err: unknown,
  fallback = 'Remy ran into an issue - try again in a moment.'
): string {
  const raw = err instanceof Error ? err.message : String(err)

  // Check if the error contains any internal patterns
  for (const pattern of INTERNAL_PATTERNS) {
    if (pattern.test(raw)) {
      console.error('[remy] Sanitized internal error from client response:', raw)
      return fallback
    }
  }

  // Also cap length - prevent giant error messages
  if (raw.length > 200) {
    return fallback
  }

  return raw
}

// ─── SSRF Protection ──────────────────────────────────────────────────────────

/**
 * Check if a URL is safe to fetch (not an internal/private address).
 * Blocks: localhost, private IPs, link-local, cloud metadata endpoints.
 */
export function isUrlSafeForFetch(url: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // Block non-HTTP protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Only HTTP/HTTPS URLs are allowed.' }
    }

    // Block localhost variants
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost')
    ) {
      return { safe: false, reason: 'Cannot fetch localhost URLs.' }
    }

    // Block private IP ranges (RFC 1918)
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)
    ) {
      return { safe: false, reason: 'Cannot fetch private network addresses.' }
    }

    // Block link-local addresses (169.254.x.x - includes cloud metadata)
    if (hostname.startsWith('169.254.')) {
      return { safe: false, reason: 'Cannot fetch link-local addresses.' }
    }

    // Block known cloud metadata endpoints
    if (hostname === 'metadata.google.internal' || hostname === 'metadata.google.com') {
      return { safe: false, reason: 'Cannot fetch cloud metadata endpoints.' }
    }

    // Block .internal TLD
    if (hostname.endsWith('.internal') || hostname.endsWith('.local')) {
      return { safe: false, reason: 'Cannot fetch internal network addresses.' }
    }

    return { safe: true }
  } catch {
    return { safe: false, reason: 'Invalid URL format.' }
  }
}
