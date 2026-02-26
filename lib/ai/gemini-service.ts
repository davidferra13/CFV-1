'use server'

import { GoogleGenAI, Type } from '@google/genai'

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

// ─── Task Extraction ────────────────────────────────────────────────────────

export async function extractTasksFromChat(conversation: string) {
  const ai = getClient()
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Extract actionable business tasks for a private chef from the following conversation. Return only valid JSON.

    Conversation:
    "${conversation}"`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
            category: { type: Type.STRING, enum: ['prep', 'admin', 'procurement', 'delivery'] },
            dueDate: { type: Type.STRING, description: 'ISO format date string' },
          },
          required: ['title', 'description', 'priority', 'category', 'dueDate'],
        },
      },
    },
  })

  try {
    return JSON.parse(response.text || '[]')
  } catch {
    console.error('[Gemini] Failed to parse task extraction')
    return []
  }
}

// ─── Chef Response Drafting (Simple) ────────────────────────────────────────
// Used by draftSimpleResponse() for quick, non-inquiry drafts

export async function draftChefResponse(
  context: string,
  tone: string,
  latestClientMessage: string,
  chefName?: { fullName: string; firstName: string }
) {
  const ai = getClient()
  const name = chefName ?? { fullName: 'Chef', firstName: 'Chef' }

  const systemInstruction = `You are ${name.fullName}, a private chef. You draft client-facing messages in your own voice.

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

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Draft a message to a client.

Tone requested: ${tone}
Business context: ${context}
Latest message from client: "${latestClientMessage}"

Write a response in ${name.firstName}'s voice following the system rules.`,
    config: { temperature: 0.7, systemInstruction },
  })

  return response.text || ''
}

// ─── ACE: AI Correspondence Engine ──────────────────────────────────────────
// Fully powered by agent-brain rules loaded per lifecycle state

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
  const ai = getClient()
  const name = params.chefName ?? { fullName: 'Chef', firstName: 'Chef' }

  // Temperature: lower for booking/pricing (precision), higher for discovery (warmth)
  const temperature = params.emailStage === 'discovery' ? 0.7 : 0.5

  // ── System Instruction: The full agent-brain ruleset ──────────────────────

  const systemInstruction = `You are a drafting assistant for ${name.fullName}, a private chef.
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

  // ── User Prompt: The specific inquiry context ─────────────────────────────

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

  const prompt = `INQUIRY ANALYSIS:
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

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: { temperature, systemInstruction },
  })

  return response.text || ''
}

// ─── Technique Extraction (Equipment Phase Inference) ───────────────────────

export async function extractTechniques(componentDescription: string) {
  const ai = getClient()
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Analyze this recipe component for cooking techniques and equipment implications:

"${componentDescription}"

Extract specific cooking techniques with confidence scores. Focus on techniques that imply specific equipment needs.
Return only valid JSON.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          techniques: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                category: {
                  type: Type.STRING,
                  enum: ['PREP', 'COOKING', 'FINISHING', 'PLATING'],
                },
              },
              required: ['name', 'confidence', 'keywords', 'category'],
            },
          },
        },
        required: ['techniques'],
      },
    },
  })

  try {
    const result = JSON.parse(response.text || '{"techniques":[]}')
    return result.techniques || []
  } catch {
    console.error('[ACE] Failed to parse technique extraction')
    return []
  }
}

// ─── Equipment Inference ────────────────────────────────────────────────────

export async function inferEquipmentFromTechniques(
  techniques: { name: string; confidence: number }[],
  componentText: string,
  prepHint?: string
) {
  const ai = getClient()
  const techniqueNames = techniques.map((t) => t.name).join(', ')

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `You are a professional chef's equipment specialist. Based on these detected cooking techniques, suggest specific equipment and execution phase.

Detected techniques: ${techniqueNames}
Component description: "${componentText}"
Prep timing hint: ${prepHint || 'Not specified'}

Phase Logic:
- PREP = Long processes, advance preparation. Done at base kitchen.
- SERVICE = Final cooking, plating, garnishing. Done on-site at client location.
- EITHER = Could be done at either location depending on timing.

For each piece of equipment:
1. Be specific ("12-inch Stainless Steel Saute Pan" not "pan")
2. Match equipment to the techniques detected
3. Assign phase based on when/where equipment would be used

Return only valid JSON.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          equipment: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                equipmentName: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                suggestedPhase: { type: Type.STRING, enum: ['PREP', 'SERVICE', 'EITHER'] },
                reasoning: { type: Type.STRING },
                category: { type: Type.STRING },
              },
              required: ['equipmentName', 'confidence', 'suggestedPhase', 'reasoning'],
            },
          },
        },
        required: ['equipment'],
      },
    },
  })

  try {
    const result = JSON.parse(response.text || '{"equipment":[]}')
    return result.equipment || []
  } catch {
    console.error('[ACE] Failed to parse equipment inference')
    return []
  }
}

// ─── Kitchen Spec Extraction ────────────────────────────────────────────────

export async function extractKitchenSpecs(notesText: string) {
  const ai = getClient()
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Extract kitchen equipment specifications from these notes:

"${notesText}"

Identify: stove type, oven count, counter space level, number of burners, power limitations, outdoor cooking space.
Only extract information that is explicitly mentioned or clearly implied.
Return only valid JSON.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          stoveType: {
            type: Type.STRING,
            enum: [
              'GAS_PROFESSIONAL',
              'GAS_RESIDENTIAL',
              'INDUCTION_HIGH',
              'INDUCTION_HOME',
              'ELECTRIC_COIL',
              'ELECTRIC_GLASS',
              'MIXED',
              'UNKNOWN',
            ],
          },
          ovenCount: { type: Type.NUMBER },
          hasConvectionOven: { type: Type.BOOLEAN },
          counterSpace: {
            type: Type.STRING,
            enum: ['CRAMPED', 'LIMITED', 'ADEQUATE', 'ABUNDANT', 'UNKNOWN'],
          },
          maxSimultaneousBurners: { type: Type.NUMBER },
          hasOutdoorSpace: { type: Type.BOOLEAN },
          powerLimitations: { type: Type.ARRAY, items: { type: Type.STRING } },
          confidenceScore: { type: Type.NUMBER },
        },
      },
    },
  })

  try {
    return JSON.parse(response.text || '{}')
  } catch {
    console.error('[ACE] Failed to parse kitchen specs')
    return { confidenceScore: 0.1 }
  }
}
