const DEFAULT_PI_HOST = 'raspberrypi.local'

export function getOpenClawPiHost() {
  return process.env.OPENCLAW_PI_HOST?.trim() || DEFAULT_PI_HOST
}

export function getOpenClawServiceUrl(port, envVar, path = '') {
  const explicit = envVar ? process.env[envVar]?.trim() : null
  const base = explicit || `http://${getOpenClawPiHost()}:${port}`
  const normalizedBase = base.replace(/\/$/, '')
  if (!path) return normalizedBase
  return `${normalizedBase}/${String(path).replace(/^\//, '')}`
}

export function getOpenClawApiUrl() {
  const legacy = process.env.OPENCLAW_API?.trim()
  return legacy || getOpenClawServiceUrl(8081, 'OPENCLAW_API_URL')
}

export function getPiSshTarget() {
  return process.env.PI_HOST?.trim() || process.env.OPENCLAW_PI_SSH?.trim() || 'pi'
}
