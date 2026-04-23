export function sanitizeReturnTo(returnTo?: string | null): string | null {
  if (!returnTo) return null
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return null

  try {
    const url = new URL(returnTo, 'https://cheflowhq.com')
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}
