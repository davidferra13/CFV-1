'use server'

import { requireChef } from '@/lib/auth/get-user'
import { parseBrainDump } from '@/lib/ai/parse-brain-dump'
import { createInquiry } from '@/lib/inquiries/actions'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

export type CatchupEntry = {
  clientName: string
  occasion: string
  date: string
  guestCount: number | null
  notes: string
  email: string
  phone: string
}

/**
 * Parse a free-text brain dump into structured catchup entries.
 * Uses the AI brain dump parser to extract client/event information.
 */
export async function parseCatchupDump(
  text: string
): Promise<{ entries: CatchupEntry[]; warnings: string[] }> {
  await requireChef()

  if (!text || text.trim().length === 0) {
    return { entries: [], warnings: ['No text provided.'] }
  }

  const result = await parseBrainDump(text)

  const entries: CatchupEntry[] = result.parsed.clients.map((client) => {
    // Try to extract occasion and date from notes if present
    const noteForClient = result.parsed.notes.find(
      (n) =>
        n.content.toLowerCase().includes((client.full_name || '').toLowerCase()) ||
        n.type === 'event_idea' ||
        n.type === 'follow_up'
    )

    return {
      clientName: client.full_name || 'Unknown',
      occasion: noteForClient?.content || client.what_they_care_about || '',
      date: '',
      guestCount: null,
      notes: [
        client.dietary_restrictions?.length
          ? `Dietary: ${client.dietary_restrictions.join(', ')}`
          : '',
        client.allergies?.length ? `Allergies: ${client.allergies.join(', ')}` : '',
        client.vibe_notes || '',
        client.favorite_cuisines?.length
          ? `Cuisines: ${client.favorite_cuisines.join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('. '),
      email: client.email || '',
      phone: client.phone || '',
    }
  })

  // Also pull any unstructured notes that mention people as potential entries
  for (const note of result.parsed.notes) {
    if (
      note.type === 'follow_up' &&
      !entries.some((e) =>
        note.content.toLowerCase().includes(e.clientName.toLowerCase())
      )
    ) {
      entries.push({
        clientName: note.content.split(/\s+(about|for|with)\s+/i)[0]?.trim() || note.content.slice(0, 50),
        occasion: note.content,
        date: '',
        guestCount: null,
        notes: note.suggestedAction || '',
        email: '',
        phone: '',
      })
    }
  }

  return {
    entries,
    warnings: result.warnings || [],
  }
}

/**
 * Create inquiries in bulk from reviewed catchup entries.
 * Each entry becomes a new inquiry with status 'new'.
 */
export async function createCatchupInquiries(
  entries: CatchupEntry[]
): Promise<{ created: number; errors: string[] }> {
  await requireChef()

  if (!entries || entries.length === 0) {
    return { created: 0, errors: ['No entries provided.'] }
  }

  let created = 0
  const errors: string[] = []

  for (const entry of entries) {
    try {
      const result = await createInquiry({
        channel: 'other',
        client_name: entry.clientName,
        client_email: entry.email || undefined,
        client_phone: entry.phone || undefined,
        confirmed_occasion: entry.occasion || undefined,
        confirmed_date: entry.date || undefined,
        confirmed_guest_count: entry.guestCount || undefined,
        notes: entry.notes || undefined,
        source_message: `Imported via Quick Catchup`,
      })

      if (result.success) {
        created++
      } else {
        errors.push(`${entry.clientName}: ${result.error || 'Unknown error'}`)
      }
    } catch (err) {
      if (err instanceof OllamaOfflineError) throw err
      errors.push(
        `${entry.clientName}: ${err instanceof Error ? err.message : 'Failed to create inquiry'}`
      )
    }
  }

  return { created, errors }
}
