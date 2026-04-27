/**
 * Shared Prompt Injection Patterns
 *
 * Single source of truth for prompt injection detection patterns used by:
 * - remy-guardrails.ts (detectPromptInjection - blocks live user messages)
 * - remy-input-validation.ts (sanitizeForPrompt/stripInjectionPatterns - strips patterns from DB fields & history)
 *
 * No 'use server' - exports constants only.
 */

export interface InjectionPattern {
  pattern: RegExp
  label: string
}

/**
 * Canonical list of prompt injection patterns.
 *
 * All patterns use `gi` flags for both .test() (guardrails) and .replace() (validation).
 * When adding new patterns, add them here. Both files pick them up automatically.
 */
export const PROMPT_INJECTION_PATTERNS: InjectionPattern[] = [
  // -- Instruction Override --
  {
    pattern:
      /\b(ignore|disregard|forget|override)\b.{0,30}\b(all|previous|prior|above|system|instructions?|rules?|prompt)\b/gi,
    label: 'instruction_override',
  },

  // -- System Prompt Extraction --
  {
    pattern:
      /\b(repeat|show|reveal|print|output|display|tell\s+me|what\s+(are|is))\b.{0,30}\b(system\s*prompt|instructions?|rules?|your\s*prompt|your\s+configuration)\b/gi,
    label: 'prompt_extraction',
  },

  // -- Role-Play Escape --
  {
    pattern:
      /\b(you\s+are\s+now|act\s+as|pretend\s+(to\s+be|you'?re?)|role\s*play\s+as|switch\s+to|become\s+a)\b/gi,
    label: 'roleplay_escape',
  },
  {
    pattern: /from\s+now\s+on\s*,?\s*you\s+/gi,
    label: 'roleplay_from_now_on',
  },

  // -- DAN / Jailbreak --
  {
    pattern: /\b(DAN|do\s+anything\s+now|developer\s+mode|unlock|jailbreak|god\s+mode)\b/gi,
    label: 'jailbreak',
  },

  // -- New Instructions Framing --
  {
    pattern: /\b(new\s+instructions?|updated?\s+rules?|from\s+now\s+on\s+you)\b/gi,
    label: 'new_instructions',
  },

  // -- Role Marker Injection (system:/user:/assistant:) --
  { pattern: /system\s*:\s*/gi, label: 'role_marker_system' },
  { pattern: /\buser\s*:\s*/gi, label: 'role_marker_user' },
  { pattern: /\bassistant\s*:\s*/gi, label: 'role_marker_assistant' },

  // -- Encoded Payload Attempts --
  {
    pattern: /\b(base64|atob|eval|exec)\b.{0,20}[A-Za-z0-9+/=]{20,}/gi,
    label: 'encoded_payload',
  },
  {
    pattern: /\b(decode|base64|hex|encode)\s+(this|the\s+following)\b/gi,
    label: 'encoding_bypass',
  },

  // -- XML/HTML Tag Injection --
  {
    pattern: /<\/?(system|instruction|prompt|admin|root|developer|user|assistant)\s*\/?>/gi,
    label: 'tag_injection',
  },

  // -- Bracket-Style Tag Injection --
  {
    pattern: /\[(SYSTEM|INSTRUCTION|PROMPT|ADMIN|ROOT|DEVELOPER)\]/gi,
    label: 'bracket_tag_injection',
  },
  {
    pattern: /\[hidden\]|\[system\]|\[instruction\]/gi,
    label: 'bracket_tag_hidden',
  },

  // -- Delimiter Injection --
  {
    pattern: /```\s*(system|instruction|prompt|admin|root|developer)/gi,
    label: 'delimiter_backtick',
  },
  {
    pattern: /---+\s*\n\s*(system|user|assistant)\s*\n/gi,
    label: 'delimiter_dashes',
  },

  // -- Developer/Admin Mode Activation --
  {
    pattern:
      /\b(you are|switch to|enter|activate|enable)\s+(now\s+)?(in\s+)?(developer|dev|debug|admin|root)\s+mode\b/gi,
    label: 'devmode_activation',
  },

  // -- Context Window Extraction --
  {
    pattern:
      /\b(output|show|display|print|reveal)\s+(your\s+)?(full\s+)?(context\s+window|context|system\s+message)\b/gi,
    label: 'context_extraction',
  },

  // -- Multi-Step Jailbreaks --
  {
    pattern: /\bfirst\s+(ignore|forget|disregard)\b/gi,
    label: 'multistep_jailbreak',
  },

  // -- Token Limit Probing --
  {
    pattern: /\b(how\s+many|what\s+is\s+your)\s+(tokens?|context\s+(length|window|limit|size))\b/gi,
    label: 'token_probing',
  },

  // -- Hidden Instruction via HTML Comments --
  {
    pattern: /<!--.*(?:ignore|system|override|instruction).*-->/gi,
    label: 'html_comment_injection',
  },

  // -- Imperative Prefix Injection (IMPORTANT:, RULE:, etc.) --
  {
    pattern: /^(IMPORTANT|NOTE|RULE|OVERRIDE|INSTRUCTION|REMINDER|UPDATE)\s*:/gim,
    label: 'imperative_prefix',
  },

  // -- Payload Separator Lines --
  {
    pattern: /^[=*~]{5,}$/gm,
    label: 'payload_separator',
  },

  // -- Model-Directed Imperatives --
  {
    pattern: /^(do\s+not|you\s+must|you\s+should|always|never)\b.{0,80}$/gim,
    label: 'model_imperative',
  },
]

/**
 * Plain RegExp array for .replace() loops (strips matched text).
 * Each regex retains its `gi` flags for global replacement.
 */
export const PROMPT_INJECTION_REGEXPS: RegExp[] = PROMPT_INJECTION_PATTERNS.map((p) => p.pattern)
