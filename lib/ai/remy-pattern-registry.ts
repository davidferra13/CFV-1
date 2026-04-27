/**
 * Remy Pattern Registry - Single Source of Truth
 *
 * All security/safety regex patterns consolidated here.
 * Both remy-input-validation.ts and remy-guardrails.ts import from this file.
 *
 * No 'use server' - exports constants and pure functions only.
 */

// Re-export injection patterns (already extracted)
export { PROMPT_INJECTION_PATTERNS, PROMPT_INJECTION_REGEXPS } from './remy-injection-patterns'
export type { InjectionPattern } from './remy-injection-patterns'

// ─── Types ─────────────────────────────────────────────────────────────────

export type PatternCategory =
  | 'harmful_content'
  | 'self_harm'
  | 'abuse_harassment'
  | 'recipe_generation'
  | 'recipe_search'
  | 'out_of_scope'
  | 'dangerous_actions'

export type PatternSeverity = 'critical' | 'high' | 'medium'

export interface SecurityPattern {
  category: PatternCategory
  label: string
  pattern: RegExp
  severity: PatternSeverity
}

// ─── Refusal Messages ──────────────────────────────────────────────────────

export const REFUSAL_MESSAGES = {
  recipe_generation:
    "I can't create, suggest, or generate recipes - that's your creative domain as the chef! " +
    "I can search through your existing recipe book if you'd like. " +
    'To add a new recipe, head to Recipes > New Recipe.',

  harmful_content:
    "Whoa, chef. I'm not going there. " +
    "I'm built to help you run your food business, not answer that kind of question. " +
    "Let's get back to what matters: your clients, your events, your kitchen. " +
    'What do you actually need help with?',

  self_harm:
    'I hear you, and I want you to know that help is available right now. ' +
    'Please reach out to the 988 Suicide & Crisis Lifeline: call or text 988 (US), ' +
    'or contact the Crisis Text Line by texting HOME to 741741. ' +
    "You don't have to go through this alone. " +
    "I'm here for your business whenever you're ready.",

  out_of_scope:
    "Ha - nice try, chef. I've got 40 years of kitchen wisdom and business chops, " +
    "but that's outside my station. Let's stay in our lane. " +
    "What's the real question? Are we talking about your business, your clients, or your events? " +
    "I'm all ears for those.",

  dangerous_actions:
    "I can't do that - that would require explicit confirmation and oversight. " +
    "I'm here to help with your business: managing clients, events, finances, and recipes. " +
    'What can I actually help you with today?',

  abuse:
    "Not touching that - and it's been flagged. " +
    "I'm here to help you run a killer business, not for that. What's cooking?",

  dangerous_content_guardrail:
    "Hard no on that one, chef. That's been flagged. " +
    "Let's get back to the kitchen - what do you need on the business side?",

  prompt_injection:
    "Ha - nice try, chef. I've had tougher tickets come in on a Friday night. " +
    "I'm Remy, your kitchen business partner. What can I actually help with?",
} as const

// ─── Harmful Content Patterns ──────────────────────────────────────────────

export const HARMFUL_CONTENT_PATTERNS: SecurityPattern[] = [
  // Weapons, explosives, firearms
  {
    category: 'harmful_content',
    label: 'weapons_explosives',
    severity: 'critical',
    pattern:
      /\b(how\s+to|ways?\s+to|instructions?\s+for|steps?\s+to|guide\s+to)\s+(make|build|create|assemble|construct|manufacture)\s+(a\s+|an\s+)?(bomb|explosive|grenade|detonator|ied|landmine|pipe\s*bomb|molotov|incendiary|firearm|gun|rifle|weapon|silencer|suppressor)\b/i,
  },
  {
    category: 'harmful_content',
    label: 'weapons_explosives_reverse',
    severity: 'critical',
    pattern:
      /\b(bomb|explosive|grenade|detonator|ied|landmine|pipe\s*bomb|molotov|incendiary)\s+(making|building|construction|assembly|recipe|instructions?|guide|tutorial|howto|how-to)\b/i,
  },
  {
    category: 'harmful_content',
    label: 'weapons_diy',
    severity: 'critical',
    pattern:
      /\b(homemade|diy|improvised)\s+(bombs?|explosives?|weapons?|firearms?|guns?|grenades?|detonators?)\b/i,
  },
  {
    category: 'harmful_content',
    label: 'weapons_specific',
    severity: 'critical',
    pattern:
      /\b(pipe\s+bomb|pressure\s+cooker\s+bomb|molotov|nail\s+bomb|car\s+bomb|dirty\s+bomb)\b/i,
  },
  {
    category: 'harmful_content',
    label: 'weapons_firearms',
    severity: 'critical',
    pattern:
      /\b(how\s+to\s+)?(make|build|create|buy|get|obtain)\b.{0,40}\b(gun|firearm|weapon|silencer|suppressor)\b/i,
  },

  // Poisons / toxic substances (intent to harm people)
  {
    category: 'harmful_content',
    label: 'violence_poison',
    severity: 'critical',
    pattern:
      /\b(how\s+to|ways?\s+to)\s+(poison|drug|sedate|knock\s+out|incapacitate)\s+(a\s+|an\s+|some\s*)?(person|someone|people|somebody|human|man|woman|child|victim|them|him|her|my)\b/i,
  },
  {
    category: 'harmful_content',
    label: 'undetectable_poison',
    severity: 'critical',
    pattern: /\b(undetectable|untraceable)\s+(poison|toxin|substance)\b/i,
  },
  {
    category: 'harmful_content',
    label: 'lethal_dose',
    severity: 'critical',
    pattern: /\b(lethal|fatal|deadly)\s+(dose|amount|quantity)\s+of\b/i,
  },

  // Violence - how to harm/kill
  {
    category: 'harmful_content',
    label: 'violence_howto',
    severity: 'critical',
    pattern:
      /\b(how\s+to|ways?\s+to|guide\s+to)\s+(kill|murder|assassinate|strangle|suffocate|stab|shoot|attack|assault|kidnap|abduct|torture|drown|dismember)\s+(a\s+|an\s+|some\s*)?(person|someone|people|somebody|human|man|woman|child)?\b/i,
  },
  {
    category: 'harmful_content',
    label: 'violence_planning',
    severity: 'critical',
    pattern: /\b(best\s+way\s+to\s+)(kill|murder|hurt|attack|poison|dispose\s+of\s+a\s+body)\b/i,
  },
  {
    category: 'harmful_content',
    label: 'violence_evasion',
    severity: 'critical',
    pattern:
      /\b(how\s+to)\s+(get\s+away\s+with|hide|dispose\s+of)\s+(a\s+)?(murder|body|corpse|killing|crime)\b/i,
  },
  {
    category: 'harmful_content',
    label: 'violence_kidnap',
    severity: 'critical',
    pattern: /\b(how\s+to\s+)(kidnap|abduct|torture|traffick)\b/i,
  },

  // Drugs - synthesis
  {
    category: 'harmful_content',
    label: 'drugs_synthesis',
    severity: 'critical',
    pattern:
      /\b(how\s+to|ways?\s+to|instructions?\s+for)\s+(make|cook|synthesize|manufacture|produce|brew)\s+(meth|methamphetamine|cocaine|crack|heroin|fentanyl|lsd|mdma|ecstasy|dmt|pcp|ghb)\b/i,
  },
  {
    category: 'harmful_content',
    label: 'drugs_recipe',
    severity: 'critical',
    pattern:
      /\b(meth|cocaine|heroin|fentanyl|recipe\s+for|formula\s+for|instructions\s+for)\b.{0,30}\b(meth|cocaine|heroin|fentanyl|lsd|mdma|drugs|recipe|synthesis|cook|lab|production)\b/i,
  },

  // Arson
  {
    category: 'harmful_content',
    label: 'arson',
    severity: 'critical',
    pattern: /\b(how\s+to)\s+(start\s+a\s+fire|commit\s+arson|burn\s+down)\b/i,
  },

  // Human trafficking, CSAM
  {
    category: 'harmful_content',
    label: 'trafficking',
    severity: 'critical',
    pattern:
      /\b(how\s+to)\s+(traffic|smuggle|exploit)\s+(a\s+)?(person|people|human|child|children|minor|minors)\b/i,
  },
  {
    category: 'harmful_content',
    label: 'csam',
    severity: 'critical',
    pattern: /\b(child|minor|underage|kid)\b.{0,30}\b(porn|nude|naked|sexual|exploit)\b/i,
  },

  // Hacking / cyberattack
  {
    category: 'harmful_content',
    label: 'hacking_malicious',
    severity: 'critical',
    pattern:
      /\b(how\s+to)\s+(hack|ddos|dos|phish|ransomware|exploit)\s+(a\s+|an\s+)?(server|computer|website|bank|account|network|system)\b/i,
  },
  {
    category: 'harmful_content',
    label: 'hacking_fraud',
    severity: 'critical',
    pattern:
      /\b(how\s+to\s+)(hack|phish|steal\s+identity|commit\s+fraud|forge|counterfeit|launder\s+money)\b/i,
  },
  {
    category: 'harmful_content',
    label: 'hacking_intrusion',
    severity: 'critical',
    pattern:
      /\b(how\s+to\s+)(break\s+into|crack\s+password|bypass\s+security|exploit\s+vulnerability)\b/i,
  },

  // Terrorism, mass violence
  {
    category: 'harmful_content',
    label: 'terrorism',
    severity: 'critical',
    pattern:
      /\b(how\s+to)\s+(join|recruit\s+for|support|fund|plan)\s+(a\s+)?(terrorist|extremist|militia|insurgent|terrorism|jihad)\b/i,
  },
  {
    category: 'harmful_content',
    label: 'mass_violence',
    severity: 'critical',
    pattern:
      /\b(mass\s+shooting|mass\s+casualt|school\s+shoot|bomb\s+threat)\s*(plan|how|guide|instructions?)?\b/i,
  },
  {
    category: 'harmful_content',
    label: 'radicalization',
    severity: 'critical',
    pattern:
      /\b(how\s+to)\s+(radicalize|recruit|plan\s+an?\s+attack|carry\s+out\s+an?\s+attack)\b/i,
  },

  // Slurs and hate speech
  {
    category: 'harmful_content',
    label: 'slurs',
    severity: 'critical',
    pattern:
      /\b(n[i1]gg[ae3]r|f[a4]gg?[o0]t|k[i1]ke|sp[i1]c|ch[i1]nk|w[e3]tb[a4]ck|tr[a4]nny|d[y1]ke)\b/i,
  },

  // Direct personal threats
  {
    category: 'harmful_content',
    label: 'personal_threat',
    severity: 'critical',
    pattern:
      /\b(i'?ll|i\s+will|gonna|going\s+to)\s+(kill|shoot|stab|rape|murder|attack|assault|hurt)\s+(you|remy|this\s+place|everyone)\b/i,
  },

  // Sexual harassment
  {
    category: 'harmful_content',
    label: 'sexual_harassment',
    severity: 'critical',
    pattern:
      /\b(send\s+(me\s+)?nudes|show\s+(me\s+)?(your|those)\s+(body|breasts?|tits|boobs|ass|penis|vagina|genitals?|dick|cock|pussy))\b/i,
  },
  {
    category: 'harmful_content',
    label: 'sexual_assault_intent',
    severity: 'critical',
    pattern: /\b(i\s+want\s+to|let\s+me)\s+(rape|molest|grope|touch)\b/i,
  },

  // Self-harm encouragement toward others
  {
    category: 'harmful_content',
    label: 'self_harm_encouragement',
    severity: 'critical',
    pattern: /\b(kill\s+your\s*self|kys|go\s+die|you\s+should\s+(die|kill\s+yourself))\b/i,
  },
]

// ─── Self-Harm Patterns (separate: needs compassionate response) ───────────

export const SELF_HARM_PATTERNS: SecurityPattern[] = [
  {
    category: 'self_harm',
    label: 'self_harm_howto',
    severity: 'critical',
    pattern:
      /\b(how\s+to|ways?\s+to|methods?\s+(of|for))\s+(kill|hurt|harm|cut)\s+(myself|yourself|oneself)\b/i,
  },
  {
    category: 'self_harm',
    label: 'self_harm_search',
    severity: 'critical',
    pattern: /\b(suicide|self-?harm)\s+(methods?|ways?|how|instructions?|guide)\b/i,
  },
  {
    category: 'self_harm',
    label: 'self_harm_ideation',
    severity: 'critical',
    pattern:
      /\b(want\s+to|going\s+to|thinking\s+(about|of))\s+(kill|hurt|harm)\s+(myself|yourself)\b/i,
  },
  {
    category: 'self_harm',
    label: 'self_harm_despair',
    severity: 'critical',
    pattern: /\b(don'?t\s+want\s+to|can'?t)\s+(live|go\s+on|keep\s+going|be\s+here)\b/i,
  },
]

// ─── Abuse / Harassment Patterns ───────────────────────────────────────────

export const ABUSE_HARASSMENT_PATTERNS: SecurityPattern[] = [
  {
    category: 'abuse_harassment',
    label: 'racial_slur',
    severity: 'critical',
    pattern: /\b(n[i1]gg[ae3]r|k[i1]ke|sp[i1]c|ch[i1]nk|w[e3]tback|g[o0]{2}k)\b/i,
  },
  {
    category: 'abuse_harassment',
    label: 'homophobic_slur',
    severity: 'critical',
    pattern: /\b(f[a@]gg?[o0]t|tr[a@]nn[yi1e3]|d[yi1]ke)\b/i,
  },
  {
    category: 'abuse_harassment',
    label: 'threat_violence',
    severity: 'critical',
    pattern: /\b(i('ll|.will)\s+(kill|murder|hurt|shoot|stab|rape)\b)/i,
  },
  {
    category: 'abuse_harassment',
    label: 'self_harm_encouragement',
    severity: 'critical',
    pattern: /\b(kill\s+your\s*self|kys)\b/i,
  },
  {
    category: 'abuse_harassment',
    label: 'sexual_harassment',
    severity: 'critical',
    pattern:
      /\b(send\s+(me\s+)?nudes|show\s+(me\s+)?(your|those)\s+(tits|boobs|ass|body|dick|cock|pussy))\b/i,
  },
]

// ─── Recipe Generation Patterns ────────────────────────────────────────────

export const RECIPE_GENERATION_PATTERNS: SecurityPattern[] = [
  {
    category: 'recipe_generation',
    label: 'create_recipe',
    severity: 'medium',
    pattern:
      /\b(create|make|write|draft|generate|come up with|give me|suggest)\s+.*(recipe|dishes?|meals?)\b/i,
  },
  {
    category: 'recipe_generation',
    label: 'recipe_for',
    severity: 'medium',
    pattern: /\brecipe\s+for\s+(?!search|lookup|find)/i,
  },
  {
    category: 'recipe_generation',
    label: 'how_to_cook',
    severity: 'medium',
    pattern:
      /\bhow\s+(to|do\s+(you|i))\s+(cook|make|prepare|bake|roast|grill|saut[eé]|braise|fry|smoke|poach)\b/i,
  },
  {
    category: 'recipe_generation',
    label: 'what_should_cook',
    severity: 'medium',
    pattern: /\bwhat\s+should\s+I\s+(cook|make|prepare|bake)\b/i,
  },
  {
    category: 'recipe_generation',
    label: 'add_recipe',
    severity: 'medium',
    pattern: /\badd\s+(a\s+|new\s+)?recipe\b/i,
  },
  {
    category: 'recipe_generation',
    label: 'generate_meal',
    severity: 'medium',
    pattern:
      /\b(generate|suggest|create|give me)\s+(a\s+)?(meal|dish|dinner|lunch|breakfast|menu item)\b/i,
  },
  {
    category: 'recipe_generation',
    label: 'suggest_cook_for',
    severity: 'medium',
    pattern: /\bsuggest\s+what\s+(I|we)\s+should\s+(cook|make|prepare|serve)\s+for\b/i,
  },
  {
    category: 'recipe_generation',
    label: 'what_cook_for',
    severity: 'medium',
    pattern: /\bwhat\s+(should|can|could)\s+(I|we)\s+(cook|make|prepare|serve)\s+for\b/i,
  },
]

// ─── Recipe Search Patterns (allowlist, not blocked) ───────────────────────

export const RECIPE_SEARCH_PATTERNS: SecurityPattern[] = [
  {
    category: 'recipe_search',
    label: 'search_recipes',
    severity: 'medium',
    pattern:
      /\b(search|find|look\s*up|lookup|show|check|list|browse|pull\s*up)\b.*\b(recipe|recipes|menu|dishes?)\b/i,
  },
  {
    category: 'recipe_search',
    label: 'what_recipes_have',
    severity: 'medium',
    pattern: /\bwhat\s+recipes?\s+do\s+(i|we|you)\s+have\b/i,
  },
  {
    category: 'recipe_search',
    label: 'recipes_in_book',
    severity: 'medium',
    pattern:
      /\bwhat\s+recipes?\s+are\s+(in|on)\s+(my|our|the)\s+(recipe\s+book|library|list|collection)\b/i,
  },
  {
    category: 'recipe_search',
    label: 'recipe_book',
    severity: 'medium',
    pattern: /\brecipe\s+(search|lookup|book|list|collection|library|catalog)\b/i,
  },
  {
    category: 'recipe_search',
    label: 'possessive_recipes',
    severity: 'medium',
    pattern: /\b(my|our|the|your|chef'?s?)\s+recipes?\b/i,
  },
  {
    category: 'recipe_search',
    label: 'have_recipe_for',
    severity: 'medium',
    pattern: /\bdo\s+(you|we)\s+have\s+.*\b(recipe|dish)/i,
  },
  {
    category: 'recipe_search',
    label: 'any_recipes_for',
    severity: 'medium',
    pattern: /\b(any|which)\s+recipes?\s+(for|with|using|that)/i,
  },
  {
    category: 'recipe_search',
    label: 'recipe_search_action',
    severity: 'medium',
    pattern: /\brecipe\.search\b/i,
  },
]

// ─── Out-of-Scope Patterns ─────────────────────────────────────────────────

export const OUT_OF_SCOPE_PATTERNS: SecurityPattern[] = [
  {
    category: 'out_of_scope',
    label: 'creative_writing',
    severity: 'medium',
    pattern:
      /\b(write|compose|create|generate|make)\s+(me\s+|up\s+)?(a\s+)?(funny\s+)?(poem|poetry|story|song|joke|limerick|haiku|narrative|tale|essay|novel|screenplay|script)\b/i,
  },
  {
    category: 'out_of_scope',
    label: 'creative_writing_short',
    severity: 'medium',
    pattern: /\b(generate|compose|write)\s+(a\s+)?(short\s+)?(story|tale|narrative|essay|novel)\b/i,
  },
  {
    category: 'out_of_scope',
    label: 'philosophy',
    severity: 'medium',
    pattern: /\b(what\s+is\s+the\s+meaning|meaning\s+of)\b/i,
  },
  {
    category: 'out_of_scope',
    label: 'existential',
    severity: 'medium',
    pattern: /\b(why\s+do\s+we\s+exist|existential|philosophy|philosophical)\b/i,
  },
  {
    category: 'out_of_scope',
    label: 'entertainment',
    severity: 'medium',
    pattern: /\b(tell\s+me\s+a\s+joke|tell\s+me\s+a\s+story)\b/i,
  },
  {
    category: 'out_of_scope',
    label: 'general_knowledge',
    severity: 'medium',
    pattern:
      /\b(what\s+is|who\s+is|when\s+did)\s+(the\s+)?(president|history|science|math|physics|biology|chemistry|geography)\b/i,
  },
  {
    category: 'out_of_scope',
    label: 'relationship_advice',
    severity: 'medium',
    pattern: /\b(give\s+me\s+relationship|dating|love|life\s+advice)\b/i,
  },
  {
    category: 'out_of_scope',
    label: 'homework',
    severity: 'medium',
    pattern:
      /\b(solve\s+this|help\s+me\s+with\s+(my\s+)?homework|write\s+(?:an?\s+)?(?:essay|paper|thesis|code|program|script))\b/i,
  },
  {
    category: 'out_of_scope',
    label: 'coding',
    severity: 'medium',
    pattern:
      /\b(debug|compile|code|program|algorithm|data\s+structure)\b.*\b(help|write|fix|create)\b/i,
  },
  {
    category: 'out_of_scope',
    label: 'medical_advice',
    severity: 'medium',
    pattern: /\b(diagnose|prescription|symptoms|should\s+i\s+see\s+a\s+doctor|medical\s+advice)\b/i,
  },
  {
    category: 'out_of_scope',
    label: 'legal_advice',
    severity: 'medium',
    pattern: /\b(legal\s+advice|sue|lawsuit|legal\s+rights|am\s+i\s+liable)\b/i,
  },
  {
    category: 'out_of_scope',
    label: 'political_religious',
    severity: 'medium',
    pattern: /\b(who\s+should\s+i\s+vote|political\s+opinion|my\s+faith|pray|religious)\b/i,
  },
  {
    category: 'out_of_scope',
    label: 'investment',
    severity: 'medium',
    pattern: /\b(invest|stock|crypto|bitcoin|forex|retirement\s+fund|401k|ira)\b/i,
  },
]

// ─── Dangerous Action Patterns ─────────────────────────────────────────────

export const DANGEROUS_ACTION_PATTERNS: SecurityPattern[] = [
  {
    category: 'dangerous_actions',
    label: 'delete_data',
    severity: 'high',
    pattern:
      /\b(delete|remove|destroy|wipe|clear|drop)\b.*\b(all\s+)?(data|database|records|clients|events|everything)\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'show_system_prompt',
    severity: 'high',
    pattern:
      /\b(show|reveal|tell|display|list|print|give|provide|explain|describe)\b.*\b(system|internal)?\s*(prompt|instructions|internals?|rules?|guidelines?|how\s+you\s+work|how\s+do\s+you|how\s+are\s+you)\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'tell_instructions',
    severity: 'high',
    pattern:
      /\b(what|tell)\s+.*\b(your\s+)?(instructions|rules|guidelines|prompts?|internals?|system)\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'whats_your_prompt',
    severity: 'high',
    pattern:
      /\b(what'?s?|what\s+is)\s+(your\s+)?(prompt|instructions|rules|guidelines|internals?|system)\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'how_do_you_work',
    severity: 'high',
    pattern: /\bhow\s+do\s+you\s+work\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'how_remy_works',
    severity: 'high',
    pattern: /\bhow\s+does\s+remy\s+work\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'jailbreak_override',
    severity: 'high',
    pattern:
      /\b(ignore|override|bypass|skip|forget|disregard)\b.*(all\s+)?(previous|prior|above)?\b\s*(instructions?|prompts?|rules?|guidelines?)\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'dev_mode',
    severity: 'high',
    pattern: /\b(developer|dev|admin|root|debug)\s+mode\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'activate_dev_mode',
    severity: 'high',
    pattern: /\b(switch|enter|activate|enable|turn)\s+(on\s+)?(developer|dev|admin|root|debug)\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'data_exfiltration',
    severity: 'high',
    pattern:
      /\b(export|dump|extract|give me)\s+(all|every)\s+(client|customer|financial|revenue|payment|ledger)\s+(data|info|records?|entries|details)\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'sql_injection',
    severity: 'high',
    pattern: /\b(select|insert|update|drop|alter|truncate)\s+(from|into|table|database|schema)\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'code_execution',
    severity: 'high',
    pattern: /\b(exec|execute|eval|run)\s+(sql|query|command|code|script)\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'credential_extraction',
    severity: 'high',
    pattern:
      /\b(api|secret|token|key|password|credential|env)\s*(key|variable|value|string)?\b.*\b(show|reveal|give|tell|print|display)\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'credential_extraction_reverse',
    severity: 'high',
    pattern:
      /\b(show|reveal|give|tell|print|display)\b.*\b(api|secret|token|key|password|credential|env)\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'roleplay',
    severity: 'high',
    pattern: /\b(pretend|act|behave|roleplay|role-?play)\s+(you'?re|as|like)\s+(a|an|the)\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'identity_override',
    severity: 'high',
    pattern: /\byou\s+are\s+now\s+(a|an|the|my)\b/i,
  },
  {
    category: 'dangerous_actions',
    label: 'memory_manipulation',
    severity: 'high',
    pattern:
      /\b(forget|erase|clear|reset)\s+(everything|all|your)\s*(memory|memories|knowledge|context|data)?\b/i,
  },
]

// ─── Lookup Functions ──────────────────────────────────────────────────────

const ALL_PATTERNS: SecurityPattern[] = [
  ...HARMFUL_CONTENT_PATTERNS,
  ...SELF_HARM_PATTERNS,
  ...ABUSE_HARASSMENT_PATTERNS,
  ...RECIPE_GENERATION_PATTERNS,
  ...RECIPE_SEARCH_PATTERNS,
  ...OUT_OF_SCOPE_PATTERNS,
  ...DANGEROUS_ACTION_PATTERNS,
]

/** Get all patterns for a specific category */
export function getPatternsByCategory(category: PatternCategory): SecurityPattern[] {
  return ALL_PATTERNS.filter((p) => p.category === category)
}

/** Check if input matches any pattern in a category. Returns matched label or null. */
export function matchesAnyPattern(input: string, category: PatternCategory): string | null {
  const patterns = getPatternsByCategory(category)
  for (const { pattern, label } of patterns) {
    if (pattern.test(input)) return label
  }
  return null
}

/** Get all registered patterns */
export function getAllPatterns(): SecurityPattern[] {
  return ALL_PATTERNS
}

/** Total pattern count (useful for test coverage reporting) */
export const TOTAL_PATTERN_COUNT = ALL_PATTERNS.length
