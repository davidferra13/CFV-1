/**
 * Conversation TwiML Generators
 *
 * Generates TwiML XML for multi-turn conversation steps.
 * Works with the conversation state machine in conversation-state.ts.
 *
 * All TwiML is built as raw XML strings (project convention).
 * Voice: Polly.Matthew-Neural (project default).
 *
 * Pure utility: no 'use server', no DB access.
 */

import { DEFAULT_VOICE } from '@/lib/calling/voice-helpers'

// ---------------------------------------------------------------------------
// XML escaping (must be applied to all dynamic text in TwiML)
// ---------------------------------------------------------------------------

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ---------------------------------------------------------------------------
// Conversation step TwiML
// ---------------------------------------------------------------------------

/**
 * Generate TwiML for a conversation step.
 * Uses speech input with auto speech detection.
 * Falls back to a polite goodbye if the vendor does not respond.
 */
export function generateConversationTwiml(params: {
  prompt: string
  gatherUrl: string
  callSid: string
  timeout?: number
  speechTimeout?: string
}): string {
  const { prompt, gatherUrl, callSid, timeout = 5, speechTimeout = 'auto' } = params

  try {
    // Build gather action URL with callSid
    const separator = gatherUrl.includes('?') ? '&' : '?'
    const actionUrl = `${gatherUrl}${separator}callSid=${encodeURIComponent(callSid)}`
    const escapedUrl = actionUrl.replace(/&/g, '&amp;')
    const escapedPrompt = escapeXml(prompt)

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="${timeout}" speechTimeout="${speechTimeout}" action="${escapedUrl}" method="POST" enhanced="true">
    <Say voice="${DEFAULT_VOICE}">${escapedPrompt}</Say>
  </Gather>
  <Say voice="${DEFAULT_VOICE}">I did not hear a response. Thank you for your time. Goodbye.</Say>
  <Hangup/>
</Response>`
  } catch (err) {
    console.error('[conversation-twiml] generateConversationTwiml error:', err)
    // Safe fallback: polite goodbye
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${DEFAULT_VOICE}">Thank you for your time. Goodbye.</Say>
  <Hangup/>
</Response>`
  }
}

// ---------------------------------------------------------------------------
// Wait-and-reprompt TwiML (vendor paused or said "hold on")
// ---------------------------------------------------------------------------

/**
 * Generate TwiML that pauses, then gently re-prompts.
 * Used when the vendor says "let me check" or "hold on".
 */
export function generateWaitAndReprompt(params: {
  originalPrompt: string
  gatherUrl: string
  callSid: string
  pauseSeconds?: number
}): string {
  const { originalPrompt, gatherUrl, callSid, pauseSeconds = 3 } = params

  try {
    const separator = gatherUrl.includes('?') ? '&' : '?'
    const actionUrl = `${gatherUrl}${separator}callSid=${encodeURIComponent(callSid)}`
    const escapedUrl = actionUrl.replace(/&/g, '&amp;')
    const escapedPrompt = escapeXml(originalPrompt)

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${DEFAULT_VOICE}">Sure, take your time.</Say>
  <Pause length="${pauseSeconds}"/>
  <Gather input="speech" timeout="8" speechTimeout="auto" action="${escapedUrl}" method="POST" enhanced="true">
    <Say voice="${DEFAULT_VOICE}">${escapedPrompt}</Say>
  </Gather>
  <Say voice="${DEFAULT_VOICE}">No worries, I will follow up later. Thanks for your time!</Say>
  <Hangup/>
</Response>`
  } catch (err) {
    console.error('[conversation-twiml] generateWaitAndReprompt error:', err)
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${DEFAULT_VOICE}">Thank you for your time. Goodbye.</Say>
  <Hangup/>
</Response>`
  }
}

// ---------------------------------------------------------------------------
// Closing TwiML (end the conversation)
// ---------------------------------------------------------------------------

/**
 * Generate TwiML that says a closing message and hangs up.
 * Used when the conversation is complete (all data collected or max turns hit).
 */
export function generateClosingTwiml(message: string): string {
  try {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${DEFAULT_VOICE}">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`
  } catch (err) {
    console.error('[conversation-twiml] generateClosingTwiml error:', err)
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${DEFAULT_VOICE}">Thank you. Goodbye.</Say>
  <Hangup/>
</Response>`
  }
}
