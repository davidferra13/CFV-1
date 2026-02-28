// ACE Ollama — Private AI drafting for client correspondence
// All client PII (names, emails, budgets, messages) stays local via Ollama.
// No Gemini fallback. If Ollama is offline, OllamaOfflineError is thrown.

'use server'

import { Ollama } from 'ollama'
import { isOllamaEnabled, getOllamaConfig, getOllamaModel } from './providers'
import { OllamaOfflineError } from './ollama-errors'

const DEFAULT_TIMEOUT_MS = 90_000 // 90s for longer text generation

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new OllamaOfflineError(
          `Ollama ${label} timed out after ${Math.round(timeoutMs / 1000)}s`,
          'timeout'
        )
      )
    }, timeoutMs)
    promise.then(
      (val) => {
        clearTimeout(timer)
        resolve(val)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

async function generateText(
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<string> {
  if (!isOllamaEnabled()) {
    throw new OllamaOfflineError('OLLAMA_BASE_URL is not set in environment', 'not_configured')
  }

  const config = getOllamaConfig()
  const model = getOllamaModel('standard')
  const ollama = new Ollama({ host: config.baseUrl })
  const startTime = Date.now()

  try {
    const response = await withTimeout(
      ollama.chat({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        options: {
          num_predict: 2048, // Email drafts can be longer than JSON
          temperature,
        },
        keep_alive: '5m',
        think: false,
      } as any),
      DEFAULT_TIMEOUT_MS,
      'ace-draft'
    )

    const text = response.message.content || ''
    const durationMs = Date.now() - startTime
    console.log(`[ace-ollama] Generated ${text.length} chars with ${model} (${durationMs}ms)`)
    return text
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    const errMsg = err instanceof Error ? err.message : String(err)
    if (
      errMsg.includes('model') &&
      (errMsg.includes('not found') || errMsg.includes('does not exist'))
    ) {
      throw new OllamaOfflineError(
        `Model "${model}" not found. Run: ollama pull ${model}`,
        'model_missing'
      )
    }
    if (errMsg.includes('timeout') || errMsg.includes('aborted')) {
      throw new OllamaOfflineError(`Ollama timed out at ${config.baseUrl}`, 'timeout')
    }
    throw new OllamaOfflineError(
      `Ollama unreachable at ${config.baseUrl}: ${errMsg}`,
      'unreachable'
    )
  }
}

// ─── Task Extraction ────────────────────────────────────────────────────────

export async function extractTasksFromChat(conversation: string) {
  const systemPrompt = `You extract actionable business tasks from a private chef's conversations.
Return ONLY valid JSON — an array of task objects. No markdown, no explanation.
Each task: { "title": "string", "description": "string", "priority": "low|medium|high", "category": "prep|admin|procurement|delivery", "dueDate": "ISO date string" }`

  const text = await generateText(systemPrompt, `Extract tasks from:\n\n"${conversation}"`, 0.3)
  try {
    return JSON.parse(text)
  } catch {
    console.error('[ace-ollama] Failed to parse task extraction')
    return []
  }
}

// ─── Chef Response Drafting (Simple) ────────────────────────────────────────

export async function draftChefResponse(
  context: string,
  tone: string,
  latestClientMessage: string,
  chefName?: { fullName: string; firstName: string }
) {
  const name = chefName ?? { fullName: 'Chef', firstName: 'Chef' }

  const systemPrompt = `You are ${name.fullName}, a private chef. You draft client-facing messages in your own voice.

VOICE RULES:
- First person singular: I, me, my. Never "we", "our", "the team" or third-person references.
- Tone: calm, direct, grounded, human. Not salesy, corporate, or overly enthusiastic.
- If there's a choice between sounding impressive and sounding comfortable — comfortable wins.
- 2-4 short paragraphs, 1-2 sentences each. Keep it concise.
- No subject lines, no [Client Name] placeholders, no bullets or lists.
- No em dashes, no internal system references, no marketing copy.
- Sign off with "Best, ${name.firstName}" or "Thanks, ${name.firstName}" unless thread is deep, then "-- ${name.firstName}" or nothing.

HARD RESTRICTIONS:
- You draft only. You never send, confirm, modify records, or take action.
- Do not make commitments not supported by the provided context.
- Do not explain how the response was generated.
- Never use: "Thanks for your inquiry", "To move forward", "Based on your request", "Please provide the following".`

  const userPrompt = `Draft a message to a client.

Tone requested: ${tone}
Business context: ${context}
Latest message from client: "${latestClientMessage}"

Write a response in ${name.firstName}'s voice following the system rules.`

  return generateText(systemPrompt, userPrompt, 0.7)
}

// ─── ACE: AI Correspondence Engine ──────────────────────────────────────────

export async function generateACEDraft(params: {
  inquiryData: Record<string, unknown>
  systemRules: string
  validationRules: string
  rateCard: string
  calendarContext: string
  depthInstruction: string
  inquirySummary: string
  threadMessages: string[]
  clientContext: string
  lifecycleState: string
  emailStage: string
  missingBlocking: string[]
  pricingAllowed: boolean
  isRepeatClient: boolean
  chefName?: { fullName: string; firstName: string }
}) {
  const name = params.chefName ?? { fullName: 'Chef', firstName: 'Chef' }
  const temperature = params.emailStage === 'discovery' ? 0.7 : 0.5

  const systemPrompt = `You are a drafting assistant for ${name.fullName}, a private chef.
You generate editable draft responses for ${name.firstName} to review, modify, and send to clients.
You do NOT send messages, confirm events, modify records, or take any autonomous action.
The chef always reviews and approves before anything goes to the client.

${params.systemRules}

${params.depthInstruction}

${params.rateCard ? `=== RATE CARD (reference only — never calculate, only format) ===\n${params.rateCard}` : '=== PRICING: NOT ALLOWED at current stage. Do not include any dollar amounts, ranges, or pricing language. ==='}

=== SAFETY RULES ===
- If the inquiry is outside scope (restaurant recs, catering drop-off, bulk meal prep not fitting service model), politely redirect in one sentence.
- If the request contains something sensitive, unusual, or ambiguous that requires the chef's judgment, output [STATUS: ESCALATED] at the start and stop.
- If cannabis is mentioned, note it but don't make it the focus. Mark as specialty/custom.
- If you cannot determine what the client is asking for, write a short, friendly clarification and nothing more.
- All arithmetic must be deterministic. NEVER calculate totals, apply percentages, or estimate premiums. Only reference rate card values directly.

=== OUTPUT FORMAT ===
Produce ONLY the email draft. Nothing else.
Format:
Subject: [one line]

[2-4 short paragraphs, 1-2 sentences each]

[Sign-off]

No meta commentary, no explanations, no notes to the chef, no section headers, no bullet points (unless mirroring client's list in later-stage status summary).

=== REWRITE MANDATE ===
Write the email from scratch. Do not copy, paste, summarize, or compress from the context provided. The context is reference material only.`

  const threadSection =
    params.threadMessages.length > 0
      ? `CONVERSATION THREAD (most recent messages):\n${params.threadMessages.join('\n')}`
      : 'No prior messages in thread. This is the first response.'

  const repeatClientNote = params.isRepeatClient
    ? 'NOTE: This is a REPEAT CLIENT. Do not reset to formal first-contact tone. Reference past context naturally. Skip discovery questions for data already on file.'
    : ''

  const pricingDirective = params.pricingAllowed
    ? 'PRICING: Allowed at this stage. Use rate card values. Present in paragraph form, conversational. Include grocery model and deposit info.'
    : 'PRICING: FORBIDDEN at this stage. Do not include any dollar amounts, cost references, or pricing language.'

  const missingDataDirective =
    params.missingBlocking.length > 0
      ? `MISSING DATA (blocking): ${params.missingBlocking.join(', ')}. You should collect the single most important missing piece in this response. Ask naturally, not like a form.`
      : 'All blocking data is present.'

  const userPrompt = `INQUIRY ANALYSIS:
${params.inquirySummary}

CLIENT CONTEXT:
${params.clientContext}
${repeatClientNote}

CALENDAR:
${params.calendarContext}

${threadSection}

${pricingDirective}
${missingDataDirective}

Draft a response email for this ${params.emailStage} stage inquiry. Follow all system rules exactly.`

  return generateText(systemPrompt, userPrompt, temperature)
}
