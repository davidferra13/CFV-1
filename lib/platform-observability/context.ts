import { readFileSync } from 'fs'
import { join } from 'path'
import { PATHNAME_HEADER } from '@/lib/auth/request-auth-context'

type HeaderReader = {
  get(name: string): string | null
}

export type PlatformRuntimeMetadata = {
  environment: string
  app_url: string | null
  build_surface: string | null
  build_id: string | null
  release: string | null
}

let cachedBuildId: string | null | undefined

function readBuildId(): string | null {
  if (cachedBuildId !== undefined) return cachedBuildId
  try {
    cachedBuildId = readFileSync(join(process.cwd(), '.next', 'BUILD_ID'), 'utf-8').trim()
  } catch {
    cachedBuildId = null
  }
  return cachedBuildId
}

function firstNonEmpty(...values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return null
}

function maskIp(ip: string | null): string | null {
  if (!ip) return null
  if (ip.includes('.')) {
    const parts = ip.split('.')
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.x`
  }
  if (ip.includes(':')) {
    const parts = ip.split(':')
    return `${parts.slice(0, 3).join(':')}:x`
  }
  return ip
}

export function getPlatformRuntimeMetadata(): PlatformRuntimeMetadata {
  return {
    environment: process.env.NODE_ENV ?? 'development',
    app_url: firstNonEmpty(process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_SITE_URL),
    build_surface: firstNonEmpty(process.env.NEXT_BUILD_SURFACE),
    build_id: readBuildId(),
    release: firstNonEmpty(process.env.SENTRY_RELEASE, process.env.GIT_COMMIT_SHA),
  }
}

export function extractRequestMetadata(headersLike?: HeaderReader | null): Record<string, unknown> {
  if (!headersLike) return {}

  const ip = headersLike.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  return {
    request_id: headersLike.get('x-request-id'),
    traceparent: headersLike.get('traceparent'),
    request_path: headersLike.get(PATHNAME_HEADER),
    request_host: headersLike.get('x-forwarded-host') ?? headersLike.get('host'),
    request_proto: headersLike.get('x-forwarded-proto'),
    request_ip_hint: maskIp(ip),
    user_agent: headersLike.get('user-agent'),
  }
}

export function buildPlatformObservabilityMetadata(
  extra?: Record<string, unknown>,
  headersLike?: HeaderReader | null
): Record<string, unknown> {
  return {
    ...getPlatformRuntimeMetadata(),
    ...extractRequestMetadata(headersLike),
    ...(extra ?? {}),
  }
}
