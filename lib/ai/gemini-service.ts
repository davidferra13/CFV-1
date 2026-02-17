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

// ─── Chef Response Drafting ─────────────────────────────────────────────────

export async function draftChefResponse(
  context: string,
  tone: string,
  latestClientMessage: string,
) {
  const ai = getClient()
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `You are a high-end private chef. Draft a message to your client.

    The Tone: ${tone}
    Business Context: ${context}
    Latest message from client: "${latestClientMessage}"

    Rules:
    - Be professional and reassuring.
    - Do not make commitments that aren't in the context.
    - Keep it concise.
    - Do not include subject lines or greetings like [Client Name].
    - Focus on the "Chef's Voice".`,
    config: { temperature: 0.7 },
  })

  return response.text || ''
}

// ─── ACE: AI Correspondence Engine ──────────────────────────────────────────

export async function generateACEDraft(params: {
  inquiryData: Record<string, unknown>
  manifesto: Record<string, unknown>
  catalog: Record<string, unknown>
  calendarContext: string
  voiceFingerprint: string
  threadSensitivity: number
  clientLedger: string
}) {
  const ai = getClient()
  const temperature = Math.max(0.1, (100 - params.threadSensitivity) / 100)

  const systemInstruction = `
  Role: You are a drafting assistant for a private chef's correspondence.
  Purpose: You generate editable draft responses for the chef to review, modify, and send.
  You do NOT send messages, confirm events, modify records, or take any autonomous action.

  Process:
  1. Analyze the inquiry using the grounding assets in context.
  2. Determine the Relationship Phase (Inquiry, Intent, or Logistics).
  3. Safety Check: If the request matches a "Yellow Light" trigger, output [STATUS: ESCALATED] and STOP.
  4. If safe, synthesize a draft response in the chef's Voice Profile.
  `

  const prompt = `
  GROUNDING STACK:
  1. Manifesto: ${JSON.stringify(params.manifesto)}
  2. Creative Catalog: ${JSON.stringify(params.catalog)}
  3. Voice Profile: "${params.voiceFingerprint}"
  4. Calendar State: ${params.calendarContext}
  5. Client Ledger: ${params.clientLedger}
  6. Thread Context: "${JSON.stringify(params.inquiryData)}"

  Process this inquiry and draft a response.
  `

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
  prepHint?: string,
) {
  const ai = getClient()
  const techniqueNames = techniques.map(t => t.name).join(', ')

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
            enum: ['GAS_PROFESSIONAL', 'GAS_RESIDENTIAL', 'INDUCTION_HIGH', 'INDUCTION_HOME', 'ELECTRIC_COIL', 'ELECTRIC_GLASS', 'MIXED', 'UNKNOWN'],
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
