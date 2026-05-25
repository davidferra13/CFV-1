import { getTodosForEvent, getTodosForClient } from '@/lib/todos/actions'
import { LinkedTodosPanel } from './linked-todos-panel'

type Props = { eventId?: string; clientId?: string }

export async function LinkedTodosServer({ eventId, clientId }: Props) {
  const todos = eventId
    ? await getTodosForEvent(eventId)
    : clientId
      ? await getTodosForClient(clientId)
      : []

  return <LinkedTodosPanel todos={todos} eventId={eventId} clientId={clientId} />
}
