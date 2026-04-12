/**
 * Voice Helpers - Shared TwiML utilities for AI calling system
 *
 * All TwiML is built here. Every call role uses these builders.
 *
 * Voice: Polly.Matthew-Neural (neural voice - dramatically more human than standard Polly)
 * SSML: All speech uses <speak> wrapper with <break> and <emphasis> for natural cadence
 * speechTimeout="auto": Twilio detects end-of-speech automatically (far better than fixed timeout)
 */

import { NextResponse } from 'next/server'

// Default voice used across all roles. Neural voices are far more human-sounding.
export const DEFAULT_VOICE = 'Polly.Matthew-Neural'

// ---------------------------------------------------------------------------
// Raw TwiML response builder
// ---------------------------------------------------------------------------

export function twimlResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

// ---------------------------------------------------------------------------
// SSML builder - wraps text in <speak> with optional breaks and emphasis
// Use this for all Say content to get natural neural voice cadence.
// ---------------------------------------------------------------------------

export function speak(parts: SpeakPart[]): string {
  // Note: Do NOT wrap in <speak>. Twilio adds that automatically for Polly voices.
  // Double-wrapping causes TwiML parse errors and the caller hears "Application Error".
  return parts
    .map((p) => {
      if (typeof p === 'string') return escapeXml(p)
      if (p.type === 'break') return `<break time="${p.ms}ms"/>`
      if (p.type === 'emphasis')
        return `<emphasis level="${p.level ?? 'moderate'}">${escapeXml(p.text)}</emphasis>`
      if (p.type === 'pause') return `<break strength="${p.strength ?? 'medium'}"/>`
      return ''
    })
    .join('')
}

export type SpeakPart =
  | string
  | { type: 'break'; ms: number }
  | { type: 'emphasis'; text: string; level?: 'strong' | 'moderate' | 'reduced' }
  | { type: 'pause'; strength?: 'none' | 'x-weak' | 'weak' | 'medium' | 'strong' | 'x-strong' }

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ---------------------------------------------------------------------------
// Say element builder
// ---------------------------------------------------------------------------

export function sayElement(content: string | SpeakPart[], voice = DEFAULT_VOICE): string {
  const inner = typeof content === 'string' ? escapeXml(content) : speak(content as SpeakPart[])
  return `<Say voice="${voice}">${inner}</Say>`
}

// ---------------------------------------------------------------------------
// Closing TwiML - say a goodbye and hang up
// ---------------------------------------------------------------------------

export function closingTwiml(message: string | SpeakPart[], voice = DEFAULT_VOICE): NextResponse {
  return twimlResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${sayElement(message, voice)}<Hangup/></Response>`
  )
}

// ---------------------------------------------------------------------------
// Vendor availability call TwiML (Role: vendor_availability)
//
// Step 1: Ask yes/no availability.
// Step 2: If yes, ask price and quantity.
// ---------------------------------------------------------------------------

export function buildVendorAvailabilityTwiml(
  businessName: string,
  ingredientName: string,
  gatherActionUrl: string,
  voice = DEFAULT_VOICE
): string {
  gatherActionUrl = gatherActionUrl.replace(/&/g, '&amp;')
  const greeting = speak([
    'Hey there, ',
    { type: 'break', ms: 200 },
    "hope I'm not catching you at a bad time. ",
    { type: 'break', ms: 400 },
    "I'm calling on behalf of ",
    { type: 'emphasis', text: businessName },
    '. ',
    { type: 'break', ms: 300 },
    'Quick question for you. ',
    { type: 'break', ms: 500 },
    'Do you happen to have ',
    { type: 'emphasis', text: ingredientName },
    ' in stock right now?',
  ])

  const prompt = speak([
    'Just a quick yes or no, ',
    { type: 'break', ms: 200 },
    'or press 1 for yes and 2 for no.',
  ])

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${voice}">${greeting}</Say>
  <Gather input="speech dtmf" timeout="10" speechTimeout="auto" numDigits="1" action="${gatherActionUrl}" method="POST" hints="yes, yeah, we do, absolutely, we have it, we got it, in stock, no, nope, sorry, out of stock, not right now, we're out, we don't have it" enhanced="true">
    <Say voice="${voice}">${prompt}</Say>
  </Gather>
  <Say voice="${voice}">${escapeXml('No worries at all. Thanks for picking up, have a good one!')}</Say>
  <Hangup/>
</Response>`
}

export function buildAvailabilityStep2Twiml(
  gatherActionUrl: string,
  voice = DEFAULT_VOICE
): string {
  gatherActionUrl = gatherActionUrl.replace(/&/g, '&amp;')
  const question = speak([
    'Great, appreciate it. ',
    { type: 'break', ms: 400 },
    "One more thing if you don't mind. ",
    { type: 'break', ms: 300 },
    "What's the price on that, and roughly how much do you have on hand?",
  ])

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="12" speechTimeout="auto" action="${gatherActionUrl}" method="POST">
    <Say voice="${voice}">${question}</Say>
  </Gather>
  <Say voice="${voice}">${escapeXml("Got it, I'll just note it's in stock. Thanks a lot, have a great day!")}</Say>
  <Hangup/>
</Response>`
}

// ---------------------------------------------------------------------------
// Vendor delivery coordination TwiML (Role: vendor_delivery)
//
// Step 1: Confirm delivery date and arrival window.
// Step 2: Capture contact name and any special handling notes.
// ---------------------------------------------------------------------------

export function buildVendorDeliveryTwiml(
  businessName: string,
  itemDescription: string,
  deliveryDate: string,
  gatherActionUrl: string,
  voice = DEFAULT_VOICE
): string {
  gatherActionUrl = gatherActionUrl.replace(/&/g, '&amp;')
  const greeting = speak([
    'Hi there, ',
    { type: 'break', ms: 200 },
    "hope you're having a good day. ",
    { type: 'break', ms: 400 },
    "I'm coordinating a delivery for ",
    { type: 'emphasis', text: businessName },
    '. ',
    { type: 'break', ms: 400 },
    "We've got an order for ",
    { type: 'emphasis', text: itemDescription },
    ' scheduled for ',
    { type: 'emphasis', text: deliveryDate },
    '. ',
    { type: 'break', ms: 500 },
    'Can you confirm that delivery is still on for that date, and give us a rough time window?',
  ])

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${voice}">${greeting}</Say>
  <Gather input="speech" timeout="12" speechTimeout="auto" action="${gatherActionUrl}" method="POST" hints="yes, confirmed, morning, afternoon, between, around, AM, PM, early, late" enhanced="true">
    <Say voice="${voice}">${escapeXml('Just the date confirmation and a delivery window when you have a moment.')}</Say>
  </Gather>
  <Say voice="${voice}">${escapeXml("No worries, we'll follow up directly. Thanks for your time!")}</Say>
  <Hangup/>
</Response>`
}

export function buildDeliveryStep2Twiml(gatherActionUrl: string, voice = DEFAULT_VOICE): string {
  gatherActionUrl = gatherActionUrl.replace(/&/g, '&amp;')
  const question = speak([
    'Perfect, got that noted. ',
    { type: 'break', ms: 400 },
    "And who's the best contact at your end for the delivery? ",
    { type: 'break', ms: 300 },
    'Also, any special handling instructions we should know about?',
  ])

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="12" speechTimeout="auto" action="${gatherActionUrl}" method="POST">
    <Say voice="${voice}">${question}</Say>
  </Gather>
  <Say voice="${voice}">${escapeXml("Got it. Thanks so much, everything's confirmed on our end!")}</Say>
  <Hangup/>
</Response>`
}

// ---------------------------------------------------------------------------
// Venue confirmation TwiML (Role: venue_confirmation)
//
// Step 1: Confirm access time and parking.
// Step 2: Capture any restrictions or special notes.
// ---------------------------------------------------------------------------

export function buildVenueConfirmationTwiml(
  businessName: string,
  venueName: string,
  eventDate: string,
  gatherActionUrl: string,
  voice = DEFAULT_VOICE
): string {
  gatherActionUrl = gatherActionUrl.replace(/&/g, '&amp;')
  const greeting = speak([
    'Hi, ',
    { type: 'break', ms: 200 },
    "I'm reaching out on behalf of ",
    { type: 'emphasis', text: businessName },
    '. ',
    { type: 'break', ms: 400 },
    'We have a private event at ',
    { type: 'emphasis', text: venueName },
    ' on ',
    { type: 'emphasis', text: eventDate },
    '. ',
    { type: 'break', ms: 500 },
    'Can you confirm our kitchen access time and let us know about parking?',
  ])

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${voice}">${greeting}</Say>
  <Gather input="speech" timeout="12" speechTimeout="auto" action="${gatherActionUrl}" method="POST" hints="yes, access, kitchen, parking, morning, afternoon, AM, PM, around, lot, street, loading" enhanced="true">
    <Say voice="${voice}">${escapeXml("Whenever you're ready, just the access time and parking situation.")}</Say>
  </Gather>
  <Say voice="${voice}">${escapeXml("No problem, we'll reach out directly to coordinate. Thanks for your time!")}</Say>
  <Hangup/>
</Response>`
}

export function buildVenueStep2Twiml(gatherActionUrl: string, voice = DEFAULT_VOICE): string {
  gatherActionUrl = gatherActionUrl.replace(/&/g, '&amp;')
  const question = speak([
    'Got it, thank you. ',
    { type: 'break', ms: 400 },
    'Last thing. ',
    { type: 'break', ms: 300 },
    "Any restrictions on the kitchen, equipment we should know won't be available, ",
    'or anything else that would be helpful before we arrive?',
  ])

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="15" speechTimeout="auto" action="${gatherActionUrl}" method="POST">
    <Say voice="${voice}">${question}</Say>
  </Gather>
  <Say voice="${voice}">${escapeXml("Perfect, we're all set then. See you on the day. Thanks!")}</Say>
  <Hangup/>
</Response>`
}

// ---------------------------------------------------------------------------
// Inbound voicemail TwiML (Role: inbound_voicemail)
// Used when a call comes in outside active hours or is unrecognized.
// ---------------------------------------------------------------------------

export function buildVoicemailTwiml(
  businessName: string,
  voicemailCallbackUrl: string,
  voicemailDoneUrl: string,
  voice = DEFAULT_VOICE
): string {
  voicemailCallbackUrl = voicemailCallbackUrl.replace(/&/g, '&amp;')
  voicemailDoneUrl = voicemailDoneUrl.replace(/&/g, '&amp;')
  const greeting = speak([
    "Hi, you've reached the voicemail for ",
    { type: 'emphasis', text: businessName },
    '. ',
    { type: 'break', ms: 400 },
    "We're not available right now, but please leave your name, ",
    'number, and reason for calling after the tone ',
    "and we'll get back to you shortly. ",
    { type: 'break', ms: 300 },
    'Thank you for calling.',
  ])

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${greeting}</Say>
  <Record maxLength="120" transcribe="true" transcribeCallback="${voicemailCallbackUrl}" action="${voicemailDoneUrl}" playBeep="true"/>
</Response>`
}

// ---------------------------------------------------------------------------
// Inbound vendor callback TwiML (Role: inbound_vendor_callback)
// When a vendor calls back after missing an outbound call.
// ---------------------------------------------------------------------------

export function buildVendorCallbackTwiml(
  businessName: string,
  gatherActionUrl: string,
  voice = DEFAULT_VOICE
): string {
  gatherActionUrl = gatherActionUrl.replace(/&/g, '&amp;')
  const greeting = speak([
    'Hi, thanks for calling back. ',
    { type: 'break', ms: 300 },
    "I'm the AI assistant for ",
    { type: 'emphasis', text: businessName },
    '. ',
    { type: 'break', ms: 400 },
    'I think we reached out earlier about ingredient availability. ',
    { type: 'break', ms: 400 },
    'Are you calling in response to that?',
  ])

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${voice}">${greeting}</Say>
  <Gather input="speech dtmf" timeout="10" speechTimeout="auto" numDigits="1" action="${gatherActionUrl}" method="POST" hints="yes, yeah, calling back, returning your call, no, wrong number" enhanced="true">
    <Say voice="${voice}">${escapeXml('Just say yes or no, or press 1 for yes.')}</Say>
  </Gather>
  <Say voice="${voice}">${escapeXml('No worries, sorry to bother you. Have a great day!')}</Say>
  <Hangup/>
</Response>`
}

// ---------------------------------------------------------------------------
// Unknown inbound caller TwiML
// ---------------------------------------------------------------------------

export function buildUnknownCallerTwiml(
  businessName: string,
  gatherActionUrl: string,
  voice = DEFAULT_VOICE
): string {
  const greeting = speak([
    'Thanks for calling ',
    { type: 'emphasis', text: businessName },
    '. ',
    { type: 'break', ms: 400 },
    "I'm an AI assistant and the team isn't available right now. ",
    { type: 'break', ms: 300 },
    'Can I get your name and the reason for your call? ',
    "We'll make sure the right person gets back to you.",
  ])

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${voice}">${greeting}</Say>
  <Gather input="speech" timeout="20" speechTimeout="auto" action="${gatherActionUrl}" method="POST" enhanced="true">
    <Say voice="${voice}">${escapeXml("Go ahead whenever you're ready.")}</Say>
  </Gather>
  <Say voice="${voice}">${escapeXml('Sorry we missed that. Please try calling back or send a text. Thanks!')}</Say>
  <Hangup/>
</Response>`
}
