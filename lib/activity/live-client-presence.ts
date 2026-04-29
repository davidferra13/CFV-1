export type ClientPresenceSession = {
  sessionId: string
  clientId: string | null
  clientName: string
  page: string
  joinedAt: string | null
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

export function getClientPresenceSessions(
  presenceState: Record<string, unknown>
): ClientPresenceSession[] {
  return Object.entries(presenceState)
    .map(([sessionId, raw]) => {
      const data =
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : {}

      const clientId = stringValue(data.clientId, stringValue(data.userId, '')) || null
      const clientName =
        stringValue(data.clientName) ||
        stringValue(data.email) ||
        (clientId ? `Client ${clientId.slice(0, 8)}` : 'Client')

      return {
        sessionId,
        clientId,
        clientName,
        page: stringValue(data.page, '/'),
        joinedAt: stringValue(data.joinedAt) || null,
      }
    })
    .sort((a, b) => {
      const aTime = a.joinedAt ? new Date(a.joinedAt).getTime() : 0
      const bTime = b.joinedAt ? new Date(b.joinedAt).getTime() : 0
      return bTime - aTime
    })
}

export function getConnectedClientIds(sessions: ClientPresenceSession[]): Set<string> {
  return new Set(sessions.map((session) => session.clientId).filter(Boolean) as string[])
}
