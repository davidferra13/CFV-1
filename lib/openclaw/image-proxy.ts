const OPENCLAW_IMAGE_PROXY_PATH = '/api/openclaw/image'

export function toOpenClawImageProxyUrl(src: string | null | undefined): string | null {
  const trimmed = src?.trim()
  if (!trimmed) return null

  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith('data:') ||
    lower.startsWith('blob:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith(OPENCLAW_IMAGE_PROXY_PATH) ||
    trimmed.includes(`${OPENCLAW_IMAGE_PROXY_PATH}?url=`)
  ) {
    return trimmed
  }

  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return `${OPENCLAW_IMAGE_PROXY_PATH}?url=${encodeURIComponent(trimmed)}`
  }

  return trimmed
}
