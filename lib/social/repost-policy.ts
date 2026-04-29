export type RepostVisibility = 'public' | 'followers' | 'connections' | 'private'

const PUBLIC_REPOST_BLOCKED_REASON =
  'Only public community posts can be reposted. Use direct contact for private or connection-only posts.'

export function isRepostableVisibility(visibility: RepostVisibility): boolean {
  return visibility === 'public'
}

export function getRepostBlockedReason(visibility: RepostVisibility): string | null {
  return isRepostableVisibility(visibility) ? null : PUBLIC_REPOST_BLOCKED_REASON
}

export function assertCanRepostVisibility(visibility: RepostVisibility): void {
  const reason = getRepostBlockedReason(visibility)
  if (reason) throw new Error(reason)
}
