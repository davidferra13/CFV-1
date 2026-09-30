const DEFAULT_PI_HOST = 'raspberrypi.local'

function getOpenClawPiHost() {
  return process.env.OPENCLAW_PI_HOST?.trim() || DEFAULT_PI_HOST
}

function getOpenClawServiceUrl(port, envVar, path = '') {
  const explicit = envVar ? process.env[envVar]?.trim() : null
  const base = explicit || `http://${getOpenClawPiHost()}:${port}`
  const normalizedBase = base.replace(/\/$/, '')
  if (!path) return normalizedBase
  return `${normalizedBase}/${String(path).replace(/^\//, '')}`
}

function getOpenClawApiUrl() {
  return process.env.OPENCLAW_API?.trim() || getOpenClawServiceUrl(8081, 'OPENCLAW_API_URL')
}

function getPiSshTarget() {
  return process.env.PI_HOST?.trim() || process.env.OPENCLAW_PI_SSH?.trim() || 'pi'
}

module.exports = { getOpenClawPiHost, getOpenClawServiceUrl, getOpenClawApiUrl, getPiSshTarget }
