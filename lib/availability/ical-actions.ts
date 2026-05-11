// iCal Subscription URL Generation
// Deterministic HMAC token derived from chef_id + NEXTAUTH_SECRET.
// No DB storage needed; token format: {chefId}.{hmac32}

'use server'

import crypto from 'crypto'
import { requireChef } from '@/lib/auth/get-user'
import { headers } from 'next/headers'

function generateHmacToken(chefId: string): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET not configured')
  return crypto.createHmac('sha256', secret).update(chefId).digest('hex').slice(0, 32)
}

export async function getIcalSubscriptionUrl(): Promise<string> {
  const user = await requireChef()
  const chefId = user.tenantId!
  const hmac = generateHmacToken(chefId)
  const token = `${chefId}.${hmac}`

  // Build absolute URL from request headers
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') || 'http'

  return `${proto}://${host}/api/availability/ical?token=${token}`
}
