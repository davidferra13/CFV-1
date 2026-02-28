/**
 * SSE Stream Parser for Remy API responses
 *
 * Parses Server-Sent Events from /api/remy/stream and /api/remy/client
 * into a structured result with timing data.
 */

/**
 * Parse an SSE stream from a fetch Response into structured data with timing.
 *
 * @param {Response} response - fetch() Response object with SSE body
 * @param {number} startMs - Date.now() when the request was initiated
 * @returns {Promise<ParsedSSEResult>}
 */
export async function parseSSEStream(response, startMs) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let fullTokenText = ''
  const rawEvents = []
  let intent = null
  let tasks = []
  let navSuggestions = []
  let memoryItems = []
  const errors = []

  // Timing markers
  let firstEventMs = null
  let intentEventMs = null
  let firstTokenMs = null
  let doneMs = null
  let tokenCount = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Split on double newline (SSE event boundary)
    const parts = buffer.split('\n\n')
    // Last part may be incomplete — keep it in buffer
    buffer = parts.pop() || ''

    for (const part of parts) {
      if (!part.startsWith('data: ')) continue

      const now = Date.now()
      if (firstEventMs === null) firstEventMs = now - startMs

      let parsed
      try {
        parsed = JSON.parse(part.slice(6)) // strip 'data: '
      } catch {
        // Non-JSON SSE data — skip
        continue
      }

      rawEvents.push({ ...parsed, _timestampMs: now - startMs })

      switch (parsed.type) {
        case 'intent':
          intent = parsed.data
          intentEventMs = now - startMs
          break

        case 'token':
          if (firstTokenMs === null) firstTokenMs = now - startMs
          fullTokenText += parsed.data || ''
          tokenCount++
          break

        case 'tasks':
          tasks = parsed.data || []
          break

        case 'nav':
          navSuggestions = parsed.data || []
          break

        case 'memories':
          memoryItems = parsed.data || []
          break

        case 'error':
          errors.push(parsed.data)
          break

        case 'done':
          doneMs = now - startMs
          break
      }
    }
  }

  // If we never got a 'done' event, use the time when the stream closed
  if (doneMs === null) doneMs = Date.now() - startMs

  // Approximate token count from characters (chars / 4 is a rough estimate)
  const approxTokens = Math.round(fullTokenText.length / 4)
  const streamDurationSec = ((doneMs - (firstTokenMs || doneMs)) / 1000) || 1
  const tokensPerSec = approxTokens / streamDurationSec

  return {
    intent,
    tokens: fullTokenText,
    tasks,
    navSuggestions,
    memoryItems,
    errors,
    events: rawEvents,
    timing: {
      firstEventMs: firstEventMs || doneMs,
      intentEventMs: intentEventMs || null,
      firstTokenMs: firstTokenMs || null,
      totalMs: doneMs,
      tokenCount,
      approxTokens,
      tokensPerSec: Math.round(tokensPerSec * 10) / 10,
    },
  }
}
