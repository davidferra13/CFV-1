import { z, type ZodTypeAny } from 'zod'
import { NextResponse } from 'next/server'
import {
  requireAuth,
  requireChef,
  requireChefAdmin,
  requireClient,
  requirePartner,
  requireStaff,
  type AuthUser,
  type PartnerAuthUser,
  type StaffAuthUser,
} from '@/lib/auth/get-user'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { checkRateLimit } from '@/lib/rateLimit'

type GuardAuthMode = 'none' | 'auth' | 'chef' | 'client' | 'staff' | 'partner' | 'chef_admin'

type GuardUser = AuthUser | StaffAuthUser | PartnerAuthUser | null

type GuardContext<
  TUser extends GuardUser,
  TQuery,
  TBody,
  TParams extends Record<string, string> = Record<string, string>,
> = {
  request: Request
  user: TUser
  query: TQuery
  body: TBody
  params: TParams
}

type RateLimitOptions<
  TUser extends GuardUser,
  TQuery,
  TBody,
  TParams extends Record<string, string> = Record<string, string>,
> = {
  key: (ctx: GuardContext<TUser, TQuery, TBody, TParams>) => string
  max?: number
  windowMs?: number
}

type GuardOptions<
  TUser extends GuardUser,
  TQuery,
  TBody,
  TParams extends Record<string, string> = Record<string, string>,
> = {
  auth?: GuardAuthMode
  cronAuth?: boolean
  querySchema?: ZodTypeAny
  bodySchema?: ZodTypeAny
  rateLimit?: RateLimitOptions<TUser, TQuery, TBody, TParams>
  handler: (
    ctx: GuardContext<TUser, TQuery, TBody, TParams>
  ) => Promise<NextResponse> | NextResponse
}

type RouteContext<TParams extends Record<string, string> = Record<string, string>> = {
  params?: TParams
}

async function resolveUser(auth: GuardAuthMode): Promise<GuardUser> {
  switch (auth) {
    case 'none':
      return null
    case 'auth':
      return requireAuth()
    case 'chef':
      return requireChef()
    case 'client':
      return requireClient()
    case 'staff':
      return requireStaff()
    case 'partner':
      return requirePartner()
    case 'chef_admin':
      return requireChefAdmin()
    default:
      return null
  }
}

function validateSchema(schema: ZodTypeAny, value: unknown, type: 'query' | 'body') {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Invalid ${type} payload`,
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 }
    )
  }
  return parsed.data
}

function toPlainQuery(url: URL): Record<string, string | string[]> {
  const entries = new Map<string, string[]>()
  url.searchParams.forEach((value, key) => {
    const existing = entries.get(key)
    if (existing) {
      existing.push(value)
      return
    }
    entries.set(key, [value])
  })
  const query: Record<string, string | string[]> = {}
  entries.forEach((values, key) => {
    query[key] = values.length === 1 ? values[0] : values
  })
  return query
}

export function withApiGuard<
  TUser extends GuardUser,
  TQuery = Record<string, string | string[]>,
  TBody = undefined,
  TParams extends Record<string, string> = Record<string, string>,
>(options: GuardOptions<TUser, TQuery, TBody, TParams>) {
  return async (request: Request, routeContext?: RouteContext<TParams>) => {
    try {
      if (options.cronAuth) {
        const authError = verifyCronAuth(request.headers.get('authorization'))
        if (authError) return authError
      }

      const authMode = options.auth ?? 'none'
      const user = (await resolveUser(authMode)) as TUser
      const params = (routeContext?.params ?? ({} as TParams)) as TParams
      const url = new URL(request.url)

      const rawQuery = toPlainQuery(url)
      let query = rawQuery as unknown as TQuery
      if (options.querySchema) {
        const parsed = validateSchema(options.querySchema, rawQuery, 'query')
        if (parsed instanceof NextResponse) return parsed
        query = parsed as TQuery
      }

      let body = undefined as TBody
      if (options.bodySchema) {
        // Non-JSON requests (form submissions, empty bodies) will fail JSON parse - this is expected
        const rawBody = await request.json().catch(() => undefined)
        const parsed = validateSchema(options.bodySchema, rawBody, 'body')
        if (parsed instanceof NextResponse) return parsed
        body = parsed as TBody
      }

      const ctx: GuardContext<TUser, TQuery, TBody, TParams> = {
        request,
        user,
        query,
        body,
        params,
      }

      if (options.rateLimit) {
        const max = options.rateLimit.max ?? 60
        const windowMs = options.rateLimit.windowMs ?? 60_000
        await checkRateLimit(options.rateLimit.key(ctx), max, windowMs)
      }

      return options.handler(ctx)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected API error'

      if (message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (message.toLowerCase().includes('too many attempts')) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      }

      console.error('[api-guard] Unhandled error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

export const ISO_DATE_SCHEMA = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date format YYYY-MM-DD')
