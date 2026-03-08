import type { PageEntityContext } from '@/lib/ai/remy-types'

export function getFirstMentionedClientName(
  entities: PageEntityContext[] | undefined
): string | undefined {
  const client = entities?.find((entity) => entity.type === 'client')
  if (!client?.summary) return undefined

  const match = client.summary.match(/^CLIENT:\s+(.+)$/m)
  return match?.[1]?.trim() || undefined
}
