const DEFAULT_PI_HOST = 'raspberrypi.local'

export function getOpenClawPiHost(): string {
  return process.env.OPENCLAW_PI_HOST?.trim() || DEFAULT_PI_HOST
}

export function getOpenClawServiceUrl(
  port: number,
  envVar?: string,
  path = '',
): string {
  const explicit = envVar ? process.env[envVar]?.trim() : null
  const base = explicit || `http://${getOpenClawPiHost()}:${port}`
  const normalizedBase = base.replace(/\/$/, '')
  if (!path) return normalizedBase
  return `${normalizedBase}/${path.replace(/^\//, '')}`
}

export function getOpenClawApiUrl(): string {
  const legacy = process.env.OPENCLAW_API?.trim()
  return legacy || getOpenClawServiceUrl(8081, 'OPENCLAW_API_URL')
}
