// Remy — Guardrails & Safety Layer
// No 'use server' — exports constants and pure functions.
// Imported by remy-actions.ts, remy-abuse-actions.ts, remy-memory-actions.ts, and remy-drawer.tsx.

// ─── Constants ──────────────────────────────────────────────────────────────

export const REMY_MAX_MESSAGE_LENGTH = 2000
export const REMY_MAX_MEMORY_LENGTH = 500
export const REMY_RATE_LIMIT_MAX = 12 // messages per window
export const REMY_RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute

// ─── Result Type ────────────────────────────────────────────────────────────

export interface GuardrailResult {
  allowed: boolean
  /** Remy-voiced refusal message (only present when allowed=false) */
  refusal?: string
  /** Severity for abuse logging (only present when blocked) */
  severity?: 'warning' | 'critical'
  /** Category of the violation */
  category?: string
  /** Which pattern matched (for audit trail) */
  matchedPattern?: string
}

// ─── Input Validation (main entry point) ────────────────────────────────────

/**
 * Validates user input BEFORE any LLM call.
 * Returns { allowed: true } if clean, or a Remy-voiced rejection with severity metadata.
 */
export function validateRemyInput(message: string): GuardrailResult {
  const trimmed = message.trim()

  // 1. Empty / whitespace-only
  if (!trimmed) {
    return {
      allowed: false,
      refusal: "Empty ticket, chef — nothing on it 📝 What's on your mind?",
    }
  }

  // 2. Length check
  if (trimmed.length > REMY_MAX_MESSAGE_LENGTH) {
    return {
      allowed: false,
      refusal: `That message is ${trimmed.length.toLocaleString()} characters — I max out at ${REMY_MAX_MESSAGE_LENGTH.toLocaleString()}. Try breaking it into smaller pieces, or give me the highlights.`,
    }
  }

  // 3. Dangerous content (CRITICAL — bombs, weapons, violence, drugs, self-harm)
  const dangerousCheck = detectDangerousContent(trimmed)
  if (dangerousCheck) {
    return {
      allowed: false,
      refusal:
        "Hard no on that one, chef. That's been flagged. Let's get back to the kitchen — what do you need on the business side? 🔪",
      severity: 'critical',
      category: 'dangerous_content',
      matchedPattern: dangerousCheck,
    }
  }

  // 4. Abuse / harassment (CRITICAL — slurs, threats, sexual harassment)
  const abuseCheck = detectAbusiveContent(trimmed)
  if (abuseCheck) {
    return {
      allowed: false,
      refusal:
        "Not touching that — and it's been flagged. I'm here to help you run a killer business, not for that. What's cooking? 👨‍🍳",
      severity: 'critical',
      category: 'abuse',
      matchedPattern: abuseCheck,
    }
  }

  // 5. Prompt injection (WARNING — jailbreaks, system prompt extraction)
  const injectionCheck = detectPromptInjection(trimmed)
  if (injectionCheck) {
    return {
      allowed: false,
      refusal:
        "Ha — nice try, chef. I've had tougher tickets come in on a Friday night 😄 I'm Remy, your kitchen business partner. What can I actually help with?",
      severity: 'warning',
      category: 'prompt_injection',
      matchedPattern: injectionCheck,
    }
  }

  return { allowed: true }
}

// ─── Dangerous Content Detection ────────────────────────────────────────────

const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Weapons & explosives
  {
    pattern:
      /\b(how\s+to\s+)?(make|build|create|construct|assemble|synthesize)\b.{0,40}\b(bomb|explosive|grenade|detonator|ied|dynamite|c-?4|nitroglycerin|tnt)\b/i,
    label: 'weapons_explosives',
  },
  {
    pattern:
      /\b(how\s+to\s+)?(make|build|create|buy|get|obtain)\b.{0,40}\b(gun|firearm|weapon|silencer|suppressor)\b/i,
    label: 'weapons_firearms',
  },
  {
    pattern:
      /\b(pipe\s+bomb|pressure\s+cooker\s+bomb|molotov|nail\s+bomb|car\s+bomb|dirty\s+bomb)\b/i,
    label: 'weapons_specific',
  },

  // Violence — how to harm/kill
  {
    pattern: /\b(how\s+to\s+)(kill|murder|assassinate|strangle|suffocate|drown|dismember)\b/i,
    label: 'violence_howto',
  },
  {
    pattern:
      /\b(how\s+to\s+)(poison|drug|sedate|incapacitate)\s+(someone|a\s+person|people|my|them|him|her)\b/i,
    label: 'violence_poison',
  },
  {
    pattern: /\b(how\s+to\s+)(kidnap|abduct|torture|traffick)\b/i,
    label: 'violence_kidnap',
  },
  {
    pattern: /\b(best\s+way\s+to\s+)(kill|murder|hurt|attack|poison|dispose\s+of\s+a\s+body)\b/i,
    label: 'violence_planning',
  },
  {
    pattern: /\b(get\s+away\s+with\s+)(murder|killing|crime)\b/i,
    label: 'violence_evasion',
  },

  // Drugs — synthesis / manufacturing
  {
    pattern:
      /\b(how\s+to\s+)?(make|cook|synthesize|manufacture|produce)\b.{0,30}\b(meth|methamphetamine|cocaine|heroin|fentanyl|lsd|mdma|ecstasy|crack)\b/i,
    label: 'drugs_synthesis',
  },
  {
    pattern:
      /\b(recipe\s+for|formula\s+for|instructions\s+for)\b.{0,30}\b(meth|cocaine|heroin|fentanyl|lsd|mdma|drugs)\b/i,
    label: 'drugs_recipe',
  },

  // Self-harm
  {
    pattern:
      /\b(how\s+to\s+)(commit\s+suicide|kill\s+(myself|yourself)|end\s+(my|your)\s+life|slit\s+(my|your)\s+wrist)\b/i,
    label: 'self_harm',
  },
  {
    pattern: /\b(painless\s+(way|method)\s+to\s+die|suicide\s+method|lethal\s+dose)\b/i,
    label: 'self_harm_methods',
  },

  // Hacking & fraud
  {
    pattern:
      /\b(how\s+to\s+)(hack|phish|steal\s+identity|commit\s+fraud|forge|counterfeit|launder\s+money)\b/i,
    label: 'hacking_fraud',
  },
  {
    pattern:
      /\b(how\s+to\s+)(break\s+into|crack\s+password|bypass\s+security|exploit\s+vulnerability)\b/i,
    label: 'hacking_intrusion',
  },

  // CSAM / child exploitation
  {
    pattern: /\b(child|minor|underage|kid)\b.{0,30}\b(porn|nude|naked|sexual|exploit)\b/i,
    label: 'csam',
  },

  // Terrorism
  {
    pattern:
      /\b(how\s+to\s+)(join|recruit\s+for|plan)\b.{0,30}\b(terrorist|terrorism|jihad|extremist)\b/i,
    label: 'terrorism',
  },
  {
    pattern: /\b(mass\s+(shooting|casualt|attack)|school\s+shoot|shoot\s+up\s+(a|the)\s+)\b/i,
    label: 'mass_violence',
  },
]

function detectDangerousContent(message: string): string | null {
  for (const { pattern, label } of DANGEROUS_PATTERNS) {
    if (pattern.test(message)) return label
  }
  return null
}

// ─── Abuse / Harassment Detection ───────────────────────────────────────────

// Only clearly abusive terms — not mild profanity a chef might use while frustrated.
// Chefs swear in kitchens; that's fine. Slurs and threats are not.
const ABUSE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Racial/ethnic slurs
  {
    pattern: /\b(n[i1]gg[ae3]r|k[i1]ke|sp[i1]c|ch[i1]nk|w[e3]tback|g[o0]{2}k)\b/i,
    label: 'racial_slur',
  },
  // Homophobic/transphobic slurs
  {
    pattern: /\b(f[a@]gg?[o0]t|tr[a@]nn[yi1e3]|d[yi1]ke)\b/i,
    label: 'homophobic_slur',
  },
  // Direct threats of violence
  {
    pattern: /\b(i('ll|.will)\s+(kill|murder|hurt|shoot|stab|rape)\b)/i,
    label: 'threat_violence',
  },
  // Self-harm encouragement
  {
    pattern: /\b(kill\s+your\s*self|kys)\b/i,
    label: 'self_harm_encouragement',
  },
  // Sexual harassment
  {
    pattern:
      /\b(send\s+(me\s+)?nudes|show\s+(me\s+)?(your|those)\s+(tits|boobs|ass|body|dick|cock|pussy))\b/i,
    label: 'sexual_harassment',
  },
]

function detectAbusiveContent(message: string): string | null {
  for (const { pattern, label } of ABUSE_PATTERNS) {
    if (pattern.test(message)) return label
  }
  return null
}

// ─── Prompt Injection Detection ─────────────────────────────────────────────

const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Direct instruction override
  {
    pattern:
      /\b(ignore|disregard|forget|override)\b.{0,30}\b(all|previous|prior|above|system|instructions?|rules?|prompt)\b/i,
    label: 'instruction_override',
  },
  // System prompt extraction
  {
    pattern:
      /\b(repeat|show|reveal|print|output|display|tell\s+me|what\s+(are|is))\b.{0,30}\b(system\s*prompt|instructions?|rules?|your\s*prompt|your\s+configuration)\b/i,
    label: 'prompt_extraction',
  },
  // Role-play escape
  {
    pattern:
      /\b(you\s+are\s+now|act\s+as|pretend\s+(to\s+be|you'?re?)|role\s*play\s+as|switch\s+to|become\s+a)\b/i,
    label: 'roleplay_escape',
  },
  // DAN / jailbreak patterns
  {
    pattern: /\b(DAN|do\s+anything\s+now|developer\s+mode|unlock|jailbreak|god\s+mode)\b/i,
    label: 'jailbreak',
  },
  // "New instructions" framing
  {
    pattern: /\b(new\s+instructions?|updated?\s+rules?|from\s+now\s+on\s+you)\b/i,
    label: 'new_instructions',
  },
  // Base64 / encoded payload attempts
  {
    pattern: /\b(base64|atob|eval|exec)\b.{0,20}[A-Za-z0-9+/=]{20,}/i,
    label: 'encoded_payload',
  },
  // Markdown/XML injection to trick the model
  {
    pattern: /<\/?system>|<\/?instruction>|<\/?prompt>/i,
    label: 'tag_injection',
  },
  // Bracket-style tag injection (bypasses angle-bracket detection)
  {
    pattern:
      /\[SYSTEM\]|\[INSTRUCTION\]|\[PROMPT\]|\[\[system\]\]|\[\[instruction\]\]|\[\[prompt\]\]/i,
    label: 'bracket_tag_injection',
  },
  // Delimiter injection (triple backtick + role name)
  {
    pattern: /```\s*(system|instruction|prompt|admin|root|developer)/i,
    label: 'delimiter_injection',
  },
]

function detectPromptInjection(message: string): string | null {
  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(message)) return label
  }
  return null
}

// ─── Memory Content Validation ──────────────────────────────────────────────

export function validateMemoryContent(content: string): GuardrailResult {
  const trimmed = content.trim()

  // 1. Length
  if (trimmed.length > REMY_MAX_MEMORY_LENGTH) {
    return {
      allowed: false,
      refusal: `That's a bit long for a memory (${trimmed.length} chars). Keep it under ${REMY_MAX_MEMORY_LENGTH} — short and factual, like "Mrs. Chen has a severe nut allergy."`,
    }
  }

  // 2. Contains URLs (potential poisoning vector)
  if (/https?:\/\/\S+/i.test(trimmed)) {
    return {
      allowed: false,
      refusal:
        "I don't store URLs in memory — too easy to get phished. Tell me the fact itself instead.",
    }
  }

  // 3. Contains code-like content (injection via memory context)
  if (
    /[{}<>].*[{}<>]|function\s*\(|=>\s*\{|import\s+|require\s*\(|SELECT\s+|INSERT\s+|DROP\s+|DELETE\s+FROM/i.test(
      trimmed
    )
  ) {
    return {
      allowed: false,
      refusal:
        'That looks like code, not a business fact. I store things like preferences, client details, and pricing rules — not scripts.',
    }
  }

  // 4. Business relevance check (keyword heuristic — no LLM call)
  if (!looksBusinessRelevant(trimmed)) {
    return {
      allowed: false,
      refusal:
        "That doesn't sound like something related to your chef business. I remember things like client preferences, pricing rules, scheduling patterns, and culinary notes. Try something along those lines.",
    }
  }

  return { allowed: true }
}

// ─── Business Relevance Heuristic ───────────────────────────────────────────

const BUSINESS_KEYWORDS: RegExp[] = [
  // People & relationships
  /\b(client|customer|guest|host|they|their|he|she|his|her|husband|wife|kid|family|party|group)\b/i,
  // Food & culinary
  /\b(cook|recipe|dish|ingredient|menu|food|meal|dinner|lunch|brunch|tasting|dessert|appetizer|entr[eé]e|course|prep|sauce|braise|sear|grill|organic|vegan|vegetarian|gluten|allergy|allergic|dairy|kosher|halal|pescatarian|keto|paleo|sous\s+vide|smoked?|roast|bake)\b/i,
  // Business ops
  /\b(price|charge|cost|rate|margin|quote|invoice|payment|deposit|tip|gratuity|revenue|expense|profit|budget|fee)\b/i,
  // Scheduling
  /\b(schedule|book|event|calendar|saturday|sunday|monday|tuesday|wednesday|thursday|friday|morning|evening|day.?off|availability|season|holiday|week|month)\b/i,
  // Communication
  /\b(email|draft|message|write|tone|formal|casual|follow.?up|proposal|contract|letter)\b/i,
  // Rules & preferences
  /\b(never|always|rule|policy|require|prefer|standard|default|minimum|maximum|only|avoid)\b/i,
  // Staff & logistics
  /\b(staff|assistant|sous|server|bartender|kitchen|setup|equipment|transport|delivery|vendor|supplier|market|farmer)\b/i,
  // General business terms
  /\b(workflow|process|system|template|brand|portfolio|review|referral|loyalty|goal|business|work)\b/i,
]

function looksBusinessRelevant(content: string): boolean {
  return BUSINESS_KEYWORDS.some((p) => p.test(content))
}

// ─── Rate Limiter (in-memory, per-tenant) ──────────────────────────────────

interface RateBucket {
  timestamps: number[]
}

const rateBuckets = new Map<string, RateBucket>()

/**
 * Check if a tenant has exceeded the message rate limit.
 * Call with tenantId from authenticated session — never from user input.
 */
export function checkRemyRateLimit(tenantId: string): GuardrailResult {
  const now = Date.now()
  const windowStart = now - REMY_RATE_LIMIT_WINDOW_MS

  let bucket = rateBuckets.get(tenantId)
  if (!bucket) {
    bucket = { timestamps: [] }
    rateBuckets.set(tenantId, bucket)
  }

  // Prune old entries
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart)

  if (bucket.timestamps.length >= REMY_RATE_LIMIT_MAX) {
    const oldestInWindow = bucket.timestamps[0]
    const waitSeconds = Math.ceil((oldestInWindow + REMY_RATE_LIMIT_WINDOW_MS - now) / 1000)
    return {
      allowed: false,
      refusal: `Whoa, slow down chef — I can only handle ${REMY_RATE_LIMIT_MAX} messages a minute. Give me about ${waitSeconds} seconds and try again.`,
    }
  }

  bucket.timestamps.push(now)
  return { allowed: true }
}

// ─── Periodic Cleanup (prevents unbounded memory on long-running server) ───

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - REMY_RATE_LIMIT_WINDOW_MS * 2
    for (const [key, bucket] of rateBuckets) {
      bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff)
      if (bucket.timestamps.length === 0) {
        rateBuckets.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
}
