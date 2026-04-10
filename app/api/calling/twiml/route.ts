/**
 * TwiML Script Endpoint
 *
 * Twilio fetches this URL when the vendor picks up the call.
 * Returns XML that instructs Twilio what to say and how to capture the response.
 *
 * The vendor hears a brief message and presses 1 (yes) or 2 (no).
 * Their keypress is sent to /api/calling/gather.
 *
 * Public route - no auth needed (Twilio calls this, not the browser).
 * Security: callId is a UUID and ingredient is URL-encoded.
 */

import { NextRequest, NextResponse } from 'next/server'

const APP_URL = process.env.NEXTAUTH_URL || 'https://app.cheflowhq.com'

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const callId = searchParams.get('callId') ?? ''
  const ingredient = searchParams.get('ingredient') ?? 'an ingredient'

  const gatherUrl = `${APP_URL}/api/calling/gather?callId=${encodeURIComponent(callId)}`

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${gatherUrl}" method="POST" timeout="10">
    <Say voice="Polly.Joanna">
      Hello. This is an automated call from ChefFlow on behalf of a professional chef.
      We have a quick question about your inventory.
      Do you currently have ${ingredient} available?
      Press 1 for yes. Press 2 for no.
      Press 1 for yes, or 2 for no.
    </Say>
  </Gather>
  <Say voice="Polly.Joanna">
    We did not receive a response. We will try again later. Thank you.
  </Say>
</Response>`

  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
