// Autopilot Draft Generator
// Uses local Ollama (Gemma 4) to draft status update emails in the chef's voice.
// All PII stays local. Chef always reviews before anything is sent.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { isOllamaEnabled, getOllamaConfig, getOllamaModel } from '@/lib/ai/providers'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { Ollama, type ChatResponse } from 'ollama'
import type { AutopilotDraft } from './types'
import { fetchForecast } from '@/lib/weather/open-meteo'

const TIMEOUT_MS = 60_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new OllamaOfflineError('Autopilot draft timed out', 'timeout')),
      ms
    )
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

/**
 * Generate a status update email draft for a pending client event.
 * Returns parsed {subject, body} or throws OllamaOfflineError if AI is unavailable.
 */
export async function generateAutopilotDraft(
  eventId: string,
  clientId: string
): Promise<AutopilotDraft> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!isOllamaEnabled()) {
    throw new OllamaOfflineError('Ollama is not configured', 'not_configured')
  }

  // Fetch event, client, chef data in parallel
  const [eventResult, chefResult] = await Promise.all([
    db
      .from('events')
      .select(
        `
        id, event_date, status, occasion, guest_count,
        location_address, location_city, location_state,
        location_lat, location_lng,
        quoted_price_cents, service_style,
        client:clients!events_client_id_fkey(full_name, email),
        quotes(status, total_quoted_cents, valid_until)
      `
      )
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    db
      .from('chefs')
      .select('full_name, display_name, business_name, email')
      .eq('id', user.tenantId!)
      .single(),
  ])

  const event = eventResult.data
  const chef = chefResult.data

  if (!event) throw new Error('Event not found')

  const client = Array.isArray(event.client) ? event.client[0] : event.client
  const clientName = client?.full_name ?? 'there'
  const chefFullName = chef?.display_name ?? chef?.full_name ?? 'Chef'
  const chefFirstName = chefFullName.split(' ')[0] ?? chefFullName
  const businessName = chef?.business_name ?? chefFirstName

  const eventDate = new Date(event.event_date)
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  const timeContext =
    daysUntil > 0
      ? `${daysUntil} days away`
      : daysUntil === 0
        ? 'today'
        : `${Math.abs(daysUntil)} days ago`

  const quotes = Array.isArray(event.quotes) ? event.quotes : []
  const latestQuote = quotes[0]

  // Build what's pending based on event status
  const statusContext: Record<string, string> = {
    draft: 'The event is in early planning. Details still need to be confirmed.',
    proposed: 'A proposal has been sent. Waiting on the client to confirm direction.',
    accepted: 'The event has been accepted. Menu and logistics need to be finalized.',
    paid: 'Payment received. Menu, timeline, and arrival logistics need to be confirmed.',
    confirmed: 'Event is confirmed. Reviewing final details before the date.',
  }
  const pendingContext = statusContext[event.status as string] ?? 'Event is in progress.'

  const locationLine = [event.location_address, event.location_city, event.location_state]
    .filter(Boolean)
    .join(', ')

  const quoteContext = latestQuote
    ? `A ${latestQuote.status} quote of $${Math.round((latestQuote.total_quoted_cents ?? 0) / 100)} is on file.`
    : 'No formal quote has been sent yet.'

  // Fetch weather context for the event (non-blocking, skip on failure)
  let weatherContext = ''
  if (event.location_lat != null && event.location_lng != null && daysUntil >= 0 && daysUntil <= 7) {
    try {
      const eventDateStr = eventDate.toISOString().slice(0, 10)
      const result = await fetchForecast(event.location_lat, event.location_lng)
      const dayMatch = result.forecasts.find((f) => f.date === eventDateStr)
      if (dayMatch) {
        weatherContext = `Weather forecast for event day: ${dayMatch.condition}, ${dayMatch.tempLowF}-${dayMatch.tempHighF}F, ${dayMatch.precipProbability}% chance of rain`
      }
    } catch {
      // Weather fetch failed; proceed without it
    }
  }

  const systemPrompt = `You are drafting a status update email for ${chefFullName}, a private chef.
The email is from ${chefFirstName} to a client. It must sound like ${chefFirstName} wrote it personally.

VOICE RULES:
- First person singular: I, me, my. Never "we", "our", or third-person.
- Warm, direct, grounded. Not corporate, not salesy, not robotic.
- 2-3 short paragraphs, 1-2 sentences each. Keep it brief and human.
- No bullet points. No subject headers. No filler phrases.
- No "I hope this email finds you well", "as per our last conversation", or similar cliches.
- No em dashes.
- Sign off naturally: "Best, ${chefFirstName}" or "Talk soon, ${chefFirstName}" or similar.

OUTPUT FORMAT - produce ONLY this, nothing else:
Subject: [one short subject line, 5-8 words]

[paragraph 1]

[paragraph 2]

[paragraph 3 if needed]

[sign-off]`

  const userPrompt = `Draft a brief check-in from ${chefFirstName} to ${clientName}.

Event: ${event.occasion ?? 'private event'} on ${formattedDate} (${timeContext})
Guests: ${event.guest_count ?? 'TBD'}
${locationLine ? `Location: ${locationLine}` : ''}
Service style: ${event.service_style ?? 'private dining'}
Event status: ${event.status}
${quoteContext}

Current situation: ${pendingContext}
${weatherContext ? `\n${weatherContext}` : ''}
The goal is a warm, professional check-in that moves things forward. What does ${clientName} need to know or do next? Keep it to the point.`

  const config = getOllamaConfig()
  const model = getOllamaModel('standard')
  const ollama = new Ollama({ host: config.baseUrl })

  const response = await withTimeout(
    ollama.chat({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options: { num_predict: 1024, temperature: 0.7 },
      keep_alive: '30m',
    } as any) as unknown as Promise<ChatResponse>,
    TIMEOUT_MS
  )

  const raw = response.message.content?.trim() ?? ''
  return parseDraftOutput(raw, clientName, chefFirstName, formattedDate)
}

/**
 * Parse "Subject: ...\n\nbody..." format from Ollama output.
 */
function parseDraftOutput(
  raw: string,
  clientName: string,
  chefFirstName: string,
  eventDate: string
): AutopilotDraft {
  const lines = raw.split('\n')
  let subject = ''
  let bodyLines: string[] = []
  let pastSubject = false

  for (const line of lines) {
    if (!pastSubject && line.toLowerCase().startsWith('subject:')) {
      subject = line.replace(/^subject:\s*/i, '').trim()
      pastSubject = true
      continue
    }
    if (pastSubject) {
      bodyLines.push(line)
    }
  }

  // Fallback subject if not found
  if (!subject) {
    subject = `Quick update on your upcoming event`
    bodyLines = raw.split('\n')
  }

  const body = bodyLines.join('\n').trim()

  return {
    subject: subject || `Update on your event`,
    body:
      body ||
      `Hi ${clientName},\n\nJust checking in on your upcoming event on ${eventDate}. Let me know if you have any questions.\n\nBest, ${chefFirstName}`,
  }
}
