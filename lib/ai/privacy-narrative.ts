/**
 * Canonical Privacy Narrative for all AI/Remy surfaces.
 *
 * SINGLE SOURCE OF TRUTH. Every user-facing surface that mentions
 * AI privacy, architecture, or speed must import from here.
 *
 * Architecture reality:
 *   - Self-hosted Ollama-compatible runtime (local GPU in dev, self-managed cloud in prod)
 *   - NOT OpenAI, Google, Anthropic, or any third-party AI service
 *   - Conversation content not stored server-side
 *   - Browser history stays in browser
 *   - Usage metrics (counts only, no content) collected for reliability
 *
 * Rules:
 *   - Never say "Ollama" to users (infrastructure detail)
 *   - Never say "third-party AI infrastructure" (contradicts reality)
 *   - Never say "your PC" (not true in production)
 *   - "Private AI" is the canonical framing
 */

// ─── Core Narrative Fragments ─────────────────────────────────────────────────
// Composable pieces. Combine as needed for different surfaces.

/** One-line summary for footers and compact disclosures */
export const PRIVACY_ONELINER =
  "Remy runs on ChefFlow's own private AI. Your data is never sent to third-party AI services."

/** Speed + privacy note (for chat surfaces) */
export const SPEED_PRIVACY = 'Remy runs on private AI. Your data never leaves ChefFlow.'

/** Speed + privacy, shorter variant (for footers) */
export const SPEED_PRIVACY_SHORT = 'Private AI. Your data stays yours.'

/** What "private AI" means, expanded (for onboarding, trust center) */
export const PRIVATE_AI_EXPLAINED =
  "ChefFlow runs its own private AI infrastructure, separate from companies like OpenAI or Google. Your conversations are processed by ChefFlow's AI and returned to you. We do not send your data to any third-party AI service."

/** Data storage policy */
export const DATA_STORAGE =
  'We do not store conversation content on our servers. Your conversation history lives in your browser. We collect only usage counts (feature used, error counts) for reliability monitoring, never conversation content.'

/** Data control assurance */
export const DATA_CONTROL =
  "Delete anything at any time. Turn Remy off whenever you want. When you delete, it's truly gone."

/** Training data assurance */
export const NO_TRAINING = 'We do not sell your data or use it to train AI models.'

// ─── Composed Narratives ──────────────────────────────────────────────────────
// Pre-composed for specific surfaces. Prefer these over ad-hoc composition.

/** Onboarding "How it works" card (step 1) */
export const ONBOARDING_HOW_IT_WORKS =
  'ChefFlow runs its own private AI. Your inputs are processed and returned to you. No third-party AI services like OpenAI or Google are involved.'

/** Onboarding recap bullet (step 5) */
export const ONBOARDING_RECAP_PRIVATE =
  "Remy runs on ChefFlow's own private AI, not third-party services"

/** Remy Gate pre-onboarding description */
export const GATE_DESCRIPTION =
  "Remy runs on ChefFlow's own private AI. Your conversations are never sent to external AI services."

/** Trust Center "How it works" paragraph */
export const TRUST_CENTER_HOW = `Remy runs on ChefFlow's own private AI infrastructure to process your requests and generate responses. When you talk to Remy, your message is processed by ChefFlow's AI runtime, not by third-party services like OpenAI or Google. The response is returned directly to you.`

/** AiProcessingNotice compact variant */
export const NOTICE_COMPACT = "AI features run on ChefFlow's private infrastructure."

/** AiProcessingNotice full variant */
export const NOTICE_FULL =
  "ChefFlow runs its own private AI infrastructure for features like Remy, recipe parsing, and auto-responses. When you use these features, your inputs are processed by ChefFlow's AI and returned to you. No third-party AI services are involved."

/** FAQ answer */
export const FAQ_PRIVACY =
  "Yes. Client data, financials, recipes, and conversations are processed by ChefFlow's own private AI infrastructure. We do not store conversation content on our servers. Your recipes are your intellectual property. We never use your data to train AI models or share it with third parties. The Trust Center has the full breakdown."

/** Data flow diagram: ChefFlow side label */
export const FLOW_CHEFFLOW_LABEL = 'Data stays within ChefFlow'
export const FLOW_CHEFFLOW_AI_LABEL = 'Private AI'
export const FLOW_CHEFFLOW_BADGE = 'No Third-Party AI Services'
export const FLOW_BULLETS = [
  "AI runs on ChefFlow's own infrastructure",
  'No data sent to external AI companies',
  "Delete anytime, it's truly gone",
] as const

/** Data flow schematic header */
export const SCHEMATIC_SUBTITLE = "Remy runs on ChefFlow's private AI. Here is how your data flows."
export const SCHEMATIC_BOUNDARY = 'ChefFlow + Private AI'
export const SCHEMATIC_NODE = 'Remy (Private AI)'
export const SCHEMATIC_SUBTEXT = "ChefFlow's own infrastructure"

// ─── Offline / Error Messages (Provider-Agnostic) ─────────────────────────────
// Never mention "Ollama" to users. These replace all Ollama-leaking messages.

/** Generic AI offline message */
export const AI_OFFLINE = 'AI features are temporarily unavailable. Please try again in a moment.'

/** AI offline with manual fallback */
export const AI_OFFLINE_MANUAL_FALLBACK =
  'AI features are temporarily unavailable. You can continue manually.'

/** AI offline for drafting surfaces */
export const AI_OFFLINE_DRAFTING =
  'AI drafting is temporarily unavailable. You can write manually instead.'

/** AI offline for content generation */
export const AI_OFFLINE_CONTENT =
  'AI content generation is unavailable right now. Please try again shortly.'

/** AI offline for receipt/parsing surfaces */
export const AI_OFFLINE_PARSING =
  'AI parsing is temporarily unavailable. Please try again in a moment.'

/** AI offline for import surfaces with CSV fallback */
export const AI_OFFLINE_IMPORT =
  'AI parsing is temporarily unavailable. You can switch to CSV mode instead.'

/** Remy limited mode (drawer) */
export const REMY_LIMITED_MODE =
  'Limited mode: AI is temporarily unavailable. I can still answer common questions instantly, but complex queries need the AI runtime.'

/** Loading registry: generic AI error */
export const AI_ERROR_GENERIC =
  'AI features are temporarily unavailable. Please try again in a moment.'

/** Loading registry: Remy error */
export const AI_ERROR_REMY = 'The AI assistant encountered an error. Please try again.'

/** Loading registry: specific feature errors */
export const AI_ERROR_INSIGHTS = 'Business analysis is temporarily unavailable. Please try again.'
export const AI_ERROR_BIO = 'Bio generation is temporarily unavailable. Please try again.'

/** Category fallback for all AI errors */
export const AI_ERROR_CATEGORY =
  'AI features are temporarily unavailable. Please try again in a moment.'

// ─── Remy System Prompt Self-Knowledge ────────────────────────────────────────
// Injected into Remy's system prompt so it can answer questions about itself.

export const REMY_SELF_KNOWLEDGE = `
ABOUT YOURSELF (use when users ask about privacy, speed, or how you work):
- You run on ChefFlow's own private AI infrastructure, not on third-party services like OpenAI or Google.
- You respond fast because you run on dedicated hardware optimized for this workload.
- Conversation content is not stored on ChefFlow's servers. Chat history lives in the user's browser.
- If asked about speed: "I run on ChefFlow's own private AI, purpose-built for chef operations. Fast and private."
- Keep explanations brief. Don't over-explain the architecture.
`

// ─── Auto-Response Settings Label ─────────────────────────────────────────────

export const AUTO_RESPONSE_AI_LABEL = 'Let Remy personalize auto-responses (private AI)'
