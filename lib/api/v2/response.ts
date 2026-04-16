// API v2 Response Helpers
// Consistent JSON envelope for all v2 endpoints.

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export interface ApiSuccessResponse<T> {
  data: T
  meta?: {
    page?: number
    per_page?: number
    total?: number
    count?: number
  }
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// ── Success responses ──────────────────────────────────────────────────────

export function apiSuccess<T>(
  data: T,
  meta?: ApiSuccessResponse<T>['meta'],
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = { data }
  if (meta) body.meta = meta
  return NextResponse.json(body, { status })
}

export function apiCreated<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return apiSuccess(data, undefined, 201)
}

export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

// ── Error responses ────────────────────────────────────────────────────────

// Generic messages for 5xx errors to prevent leaking internals (SQL, paths, stack traces)
const SAFE_SERVER_ERROR = 'An internal error occurred. Please try again.'

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  // For 5xx, log the real message server-side but return a generic one to the client
  if (status >= 500) {
    console.error(`[api-v2] ${code}:`, message)
    const body: ApiErrorResponse = { error: { code, message: SAFE_SERVER_ERROR } }
    return NextResponse.json(body, { status })
  }
  const body: ApiErrorResponse = { error: { code, message } }
  if (details !== undefined) body.error.details = details
  return NextResponse.json(body, { status })
}

export function apiUnauthorized(
  message = 'Invalid or missing API key'
): NextResponse<ApiErrorResponse> {
  return apiError('unauthorized', message, 401)
}

export function apiForbidden(message = 'Insufficient permissions'): NextResponse<ApiErrorResponse> {
  return apiError('forbidden', message, 403)
}

export function apiNotFound(resource = 'Resource'): NextResponse<ApiErrorResponse> {
  return apiError('not_found', `${resource} not found`, 404)
}

export function apiValidationError(zodError: ZodError): NextResponse<ApiErrorResponse> {
  const issues = zodError.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }))
  return apiError('validation_error', 'Request validation failed', 422, issues)
}

export function apiRateLimited(resetAt: number): NextResponse<ApiErrorResponse> {
  const res = apiError('rate_limited', 'Rate limit exceeded. Try again later.', 429)
  res.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)))
  return res
}

export function apiServerError(message = 'Internal server error'): NextResponse<ApiErrorResponse> {
  return apiError('internal_error', message, 500)
}
