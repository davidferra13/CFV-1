import { getClientNotes, addClientNote } from '@/lib/notes/actions'
import { getUnifiedClientTimeline } from '@/lib/clients/unified-timeline'

export type ClientHistoryEntry = {
  id: string
  timestamp: string
  source: 'timeline' | 'note'
  title: string
  description: string
  href: string | null
}

export async function getClientHistory(
  clientId: string,
  limit = 100
): Promise<ClientHistoryEntry[]> {
  const [timelineItems, notes] = await Promise.all([
    getUnifiedClientTimeline(clientId).catch(() => []),
    getClientNotes(clientId).catch(() => []),
  ])

  const timelineEntries: ClientHistoryEntry[] = (timelineItems as Array<any>).map((item) => ({
    id: `timeline:${item.id || `${item.type}-${item.timestamp}`}`,
    timestamp: item.timestamp || item.createdAt || new Date(0).toISOString(),
    source: 'timeline',
    title: item.title || item.label || 'Client update',
    description: item.description || item.summary || '',
    href: item.href || null,
  }))

  const noteEntries: ClientHistoryEntry[] = (notes as Array<any>).map((note) => ({
    id: `note:${note.id}`,
    timestamp: note.created_at,
    source: 'note',
    title: `Note (${note.category || 'general'})`,
    description: note.note_text || '',
    href: null,
  }))

  return [...timelineEntries, ...noteEntries]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, Math.max(limit, 1))
}

export async function addClientHistoryEntry(input: {
  clientId: string
  note: string
  category?: 'general' | 'dietary' | 'preference' | 'logistics' | 'relationship'
}) {
  const result = await addClientNote({
    client_id: input.clientId,
    note_text: input.note,
    category: input.category || 'general',
  })

  return {
    success: result.success,
    note: result.note,
  }
}
