import { broadcast } from './sse-server'

// Broadcast after a DB mutation - call from server actions
export function broadcastInsert(table: string, tenantId: string, record: any) {
  broadcast(`${table}:${tenantId}`, 'INSERT', { new: record })
}

export function broadcastUpdate(table: string, tenantId: string, record: any, old?: any) {
  broadcast(`${table}:${tenantId}`, 'UPDATE', { new: record, old })
}

export function broadcastDelete(table: string, tenantId: string, record: any) {
  broadcast(`${table}:${tenantId}`, 'DELETE', { old: record })
}

// Broadcast typing indicator
export function broadcastTyping(channel: string, userId: string, isTyping: boolean) {
  broadcast(`typing:${channel}`, 'typing', { userId, isTyping })
}

// Broadcast to a specific channel (generic)
export { broadcast } from './sse-server'
