import { randomBytes } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import {
  buildGoogleConnectAuthorizeUrl,
  GOOGLE_OAUTH_CSRF_COOKIE,
  resolveGoogleConnectOrigin,
  resolveGoogleConnectRequestOrigin,
} from '@/lib/google/connect-server'
import {
  buildGoogleConnectResultPath,
  sanitizeGoogleConnectReturnTo,
} from '@/lib/google/connect-shared'

export async function GET(request: NextRequest) {
  const returnTo = sanitizeGoogleConnectReturnTo(request.nextUrl.searchParams.get('returnTo'))
  const requestOrigin = resolveGoogleConnectRequestOrigin({
    requestOrigin: request.nextUrl.origin,
    forwardedProto: request.headers.get('x-forwarded-proto'),
    forwardedHost: request.headers.get('x-forwarded-host'),
    host: request.headers.get('host'),
  })
  const redirectBase = resolveGoogleConnectOrigin({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    requestOrigin,
    nodeEnv: process.env.NODE_ENV,
  })

  try {
    const user = await requireChef()
    const clientId = process.env.GOOGLE_CLIENT_ID

    if (!clientId) {
      return NextResponse.redirect(
        new URL(
          buildGoogleConnectResultPath({
            returnTo,
            key: 'error',
            value: 'Google integration is not configured',
          }),
          redirectBase
        )
      )
    }

    const scopes = request.nextUrl.searchParams.getAll('scope').filter(Boolean)
    if (scopes.length === 0) {
      return NextResponse.redirect(
        new URL(
          buildGoogleConnectResultPath({
            returnTo,
            key: 'error',
            value: 'No Google permissions were requested',
          }),
          redirectBase
        )
      )
    }

    const csrfToken = randomBytes(32).toString('hex')
    const callbackOrigin = resolveGoogleConnectOrigin({
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      requestOrigin,
      nodeEnv: process.env.NODE_ENV,
    })

    const authorizeUrl = buildGoogleConnectAuthorizeUrl({
      callbackOrigin,
      chefId: user.entityId,
      clientId,
      csrfToken,
      returnTo,
      scopes,
    })

    const response = NextResponse.redirect(authorizeUrl)
    response.cookies.set(GOOGLE_OAUTH_CSRF_COOKIE, csrfToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600,
    })
    return response
  } catch (err) {
    console.error('[Google OAuth] Connect initiation failed:', err)
    return NextResponse.redirect(
      new URL(
        buildGoogleConnectResultPath({
          returnTo,
          key: 'error',
          value: err instanceof Error ? err.message : 'Failed to start Google connection',
        }),
        redirectBase
      )
    )
  }
}
