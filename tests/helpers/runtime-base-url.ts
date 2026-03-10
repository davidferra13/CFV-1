const DEFAULT_REMOTE_BASE_URL = 'https://beta.cheflowhq.com'
const LOCAL_BASE_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

export function resolveTestBaseUrl(envVar = 'PLAYWRIGHT_BASE_URL'): string {
  const baseUrl = process.env[envVar] || DEFAULT_REMOTE_BASE_URL
  const allowLocal = envFlag(process.env.PLAYWRIGHT_ALLOW_LOCAL, false)

  if (LOCAL_BASE_URL_PATTERN.test(baseUrl) && !allowLocal) {
    throw new Error(
      `Local test targets are disabled by default. Set ${envVar} to ${DEFAULT_REMOTE_BASE_URL} or opt into localhost with PLAYWRIGHT_ALLOW_LOCAL=true.`
    )
  }

  return baseUrl
}

export const TEST_BASE_URL = resolveTestBaseUrl()
export const TEST_API_BASE_URL = TEST_BASE_URL
