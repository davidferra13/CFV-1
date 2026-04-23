import type {
  AiExecutionLocation,
  AiRuntimeEndpoint,
  AiRuntimePolicy,
  DispatchModelTier,
} from './types'

const DEFAULT_LOCAL_BASE_URL = 'http://localhost:11434'
const DEFAULT_MODEL = 'gemma4'

function normalizeUrl(url?: string | null): string | null {
  const value = url?.trim()
  return value ? value.replace(/\/+$/, '') : null
}

export function isLocalOllamaUrl(url?: string | null): boolean {
  const value = normalizeUrl(url)
  if (!value) return false

  return (
    value.includes('localhost') || value.includes('127.0.0.1') || value.includes('0.0.0.0')
  )
}

function getRawEndpointUrls(): { localUrl: string | null; cloudUrl: string | null } {
  const sharedUrl = normalizeUrl(process.env.OLLAMA_BASE_URL)
  const explicitLocal = normalizeUrl(process.env.OLLAMA_LOCAL_BASE_URL)
  const explicitCloud = normalizeUrl(process.env.OLLAMA_CLOUD_BASE_URL)

  const localUrl = explicitLocal ?? (isLocalOllamaUrl(sharedUrl) ? sharedUrl : null)
  const cloudUrl = explicitCloud ?? (sharedUrl && !isLocalOllamaUrl(sharedUrl) ? sharedUrl : null)

  return { localUrl, cloudUrl }
}

function getModelFromEnv(location: AiExecutionLocation, tier: DispatchModelTier): string {
  const prefix = location === 'local' ? 'OLLAMA_LOCAL' : 'OLLAMA_CLOUD'
  const tierKey = tier.toUpperCase()

  return (
    process.env[`${prefix}_MODEL_${tierKey}`] ||
    process.env[`${prefix}_MODEL`] ||
    process.env[`OLLAMA_MODEL_${tierKey}`] ||
    process.env.OLLAMA_MODEL ||
    DEFAULT_MODEL
  )
}

function buildEndpoint(
  location: AiExecutionLocation,
  baseUrl: string,
  enabled: boolean,
  priority: number
): AiRuntimeEndpoint {
  return {
    name: location,
    location,
    baseUrl,
    enabled,
    priority,
    model: getModelFromEnv(location, 'standard'),
  }
}

export function resolveOllamaModel(
  tier: DispatchModelTier = 'standard',
  location: AiExecutionLocation = 'local'
): string {
  return getModelFromEnv(location, tier)
}

export function getAiRuntimePolicy(): AiRuntimePolicy {
  const { localUrl, cloudUrl } = getRawEndpointUrls()

  const localEnabled = Boolean(localUrl)
  const cloudEnabled = Boolean(cloudUrl)

  const endpoints: AiRuntimeEndpoint[] = [
    buildEndpoint('local', localUrl ?? DEFAULT_LOCAL_BASE_URL, localEnabled, 0),
    buildEndpoint('cloud', cloudUrl ?? DEFAULT_LOCAL_BASE_URL, cloudEnabled, 1),
  ]

  const mode =
    localEnabled && cloudEnabled ? 'hybrid' : localEnabled ? 'local' : cloudEnabled ? 'cloud' : 'local'

  const defaultLocation: AiExecutionLocation = localEnabled ? 'local' : 'cloud'

  return {
    mode,
    endpoints,
    defaultLocation,
    onDevicePreferred: true,
    cloudFallbackAllowed: cloudEnabled,
    retainDataLocally: true,
  }
}
