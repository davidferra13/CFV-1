// Content Asset Capture Sheet Generator
// Static shot list + platform cheat sheet + brand consistency reminders
// Used to capture marketing content at every event — bring alongside the other printed sheets
// Unlike operational documents, the shot list is entirely static — same content every event.
// Only dynamic fields: event name, date, and client name in the header.
// MUST fit on ONE page — no exceptions.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout, CONTENT_WIDTH, MARGIN_X } from './pdf-layout'
import { format, parseISO } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContentShotListData = {
  eventName: string
  eventDate: string
  clientName: string
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

export async function fetchContentShotListData(
  eventId: string
): Promise<ContentShotListData | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select(
      `
      occasion, event_date,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const clientData = event.client as unknown as { full_name: string } | null

  return {
    eventName: event.occasion || 'Dinner Event',
    eventDate: event.event_date,
    clientName: clientData?.full_name ?? 'Client',
  }
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function renderContentShotList(pdf: PDFLayout, data: ContentShotListData) {
  const { eventName, eventDate, clientName } = data

  // ─── Header ─────────────────────────────────────────────────────────────────

  pdf.title('CONTENT ASSET CAPTURE SHEET', 13)

  const dateStr = format(parseISO(eventDate), 'EEE, MMM d, yyyy')
  pdf.headerBar([
    ['Event', eventName],
    ['Date', dateStr],
    ['Client', clientName],
    ['Target', '20+ assets'],
  ])

  pdf.space(1.5)

  // ─── Never-Miss Five (amber highlight box drawn directly) ───────────────────

  const boxStartY = pdf.y
  const boxHeight = 16

  pdf.doc.setFillColor(255, 251, 220)
  pdf.doc.setDrawColor(195, 148, 0)
  pdf.doc.setLineWidth(0.6)
  pdf.doc.rect(MARGIN_X, boxStartY - 1, CONTENT_WIDTH, boxHeight, 'FD')

  pdf.doc.setFontSize(8)
  pdf.doc.setFont('helvetica', 'bold')
  pdf.doc.setTextColor(125, 88, 0)
  pdf.doc.text(
    '★  NEVER-MISS FIVE — if time is short, get at least these:',
    MARGIN_X + 3,
    boxStartY + 3.5
  )

  pdf.doc.setFont('helvetica', 'normal')
  pdf.doc.setFontSize(7.5)
  pdf.doc.text(
    '1. Knife work video — overhead mount, 10 sec      2. Pan sizzle — side angle, 8 sec, keep the sound      3. Hero plate — overhead flat lay',
    MARGIN_X + 3,
    boxStartY + 7.5
  )
  pdf.doc.text(
    '4. Hands placing final garnish — 3–5 sec slow-mo      5. Ingredient flat lay — shot at the grocery store or at home before you leave',
    MARGIN_X + 3,
    boxStartY + 11.5
  )

  pdf.doc.setTextColor(0, 0, 0)
  pdf.y = boxStartY + boxHeight + 1.5

  // ─── PRE-EVENT ──────────────────────────────────────────────────────────────

  pdf.sectionHeader('PRE-EVENT — GROCERY & PREP', 10)
  pdf.checkbox('Grocery haul flat lay — overhead, all ingredients spread out, vertical 9:16', 9)
  pdf.checkbox(
    'Hero ingredient close-up — primary protein, specialty produce, or imported item',
    9,
    'macro'
  )
  pdf.checkbox('Knife roll / tools laid out — overhead or 45° before cooking begins', 9)
  pdf.checkbox('Mise en place spread — everything prepped, portioned, and arranged', 9, 'overhead')

  pdf.space(0.5)

  // ─── ACTIVE COOKING ─────────────────────────────────────────────────────────

  pdf.sectionHeader('ACTIVE COOKING', 10)
  pdf.checkbox(
    'Knife work — overhead phone mount, clean board, 10–15 sec  ·  pre-mount before service starts',
    9
  )
  pdf.checkbox(
    'Pan sizzle / sear — side angle at counter height, 8–10 sec  ·  do not narrate, let the sound carry',
    9
  )
  pdf.checkbox('Sauce or reduction — overhead close-up, glossy spoon, 5–8 sec', 9)
  pdf.checkbox('Hands seasoning or finishing touch — pinch of salt, torn herb, 3–5 sec slow-mo', 9)
  pdf.checkbox(
    'Raw → finished time-lapse — fixed mount, 10+ frames, strong caramelization or sear',
    9
  )

  pdf.space(0.5)

  // ─── PLATING ────────────────────────────────────────────────────────────────

  pdf.sectionHeader(
    'PLATING  ·  Plate one dish for camera before service plates leave the pass',
    10
  )
  pdf.checkbox(
    'Hero plate — overhead flat lay  ·  shoot vertical 9:16 then crop to 1:1 square for feed',
    9
  )
  pdf.checkbox(
    'Hero plate — low 30° restaurant angle  ·  shows height, sauce work, and garnish depth',
    9
  )
  pdf.checkbox(
    'Hands placing final garnish — the last touch, 3–5 sec  ·  slow-mo if phone supports',
    9
  )
  pdf.checkbox(
    'Full table at service — all courses set, candlelight if present, wide horizontal',
    9
  )
  pdf.checkbox('Texture detail / close-up cross-section — demonstrates technique at macro level', 9)

  pdf.space(0.5)

  // ─── SERVICE & WRAP ─────────────────────────────────────────────────────────

  pdf.sectionHeader('SERVICE & WRAP', 10)
  pdf.checkbox('Empty plate after course — overhead, social proof without showing client faces', 9)
  pdf.checkbox(
    'Client reaction — candid only, faces optional  ·  GET PERMISSION before posting',
    9,
    '3–5 sec'
  )
  pdf.checkbox(
    'Chef self-capture at the pass — builds face recognition and brand identity',
    9,
    'optional'
  )
  pdf.checkbox('Clean kitchen at wrap — wide shot, proves you left it better than you found it', 9)

  pdf.space(1)

  // ─── Platform Specs ─────────────────────────────────────────────────────────

  pdf.sectionHeader(
    'PLATFORM SPECS  ·  shoot everything vertical 9:16 first — crop down from there',
    10
  )
  pdf.text(
    'TikTok + Instagram Reels: 9:16 vertical (1080×1920) | 15–60 sec | Hook in first 3 sec | Let sizzle audio play — no narration needed',
    8
  )
  pdf.text(
    'Instagram Feed: 4:5 portrait (1080×1350) or 1:1 square | Bright clean plates | Same edit preset on every post for brand cohesion',
    8
  )
  pdf.text(
    'Instagram Stories: 9:16 vertical | Keep text out of top and bottom 14% | Add a poll or sticker to drive engagement',
    8
  )
  pdf.text(
    'Facebook: 1:1 square or 4:5 portrait | Photos and behind-the-scenes video | Same Instagram content performs well here',
    8
  )

  pdf.space(1)

  // ─── Brand Consistency ──────────────────────────────────────────────────────

  pdf.sectionHeader('BRAND CONSISTENCY — repeat the same decisions at every event', 10)
  pdf.checkbox(
    'Same plate angle every event — choose ONE: overhead OR low 30° — commit to it forever',
    8
  )
  pdf.checkbox(
    'Same 2–3 surface props in every photo: cutting board, linen napkin, slate tile — bring them',
    8
  )
  pdf.checkbox(
    'Same editing preset applied to every photo before posting — one preset = one visual identity',
    8
  )
  pdf.checkbox(
    'Same opening shot type to start every Reel/TikTok — your audience will learn to recognize it',
    8
  )

  pdf.space(0.5)

  // ─── Solo Setup ─────────────────────────────────────────────────────────────

  pdf.sectionHeader('SOLO SETUP — mount phone before service starts, never during it', 10)
  pdf.text(
    '3 positions: (1) Overhead arm above cutting board  (2) Side mount beside stove  (3) Tabletop stand for plating — rotate between these',
    8
  )
  pdf.text(
    'Gear to bring: overhead boom arm + flexible Gorilla Pod + bluetooth remote shutter (~$50 total) — film first, review after guests leave',
    8
  )

  // ─── Footer ─────────────────────────────────────────────────────────────────

  pdf.footer(
    `${dateStr} · ${clientName} · Everything vertical 9:16 · Target: 20+ assets · Minimum: knife work + hero plate + garnish hands`
  )
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function generateContentShotList(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchContentShotListData(eventId)
  if (!data) throw new Error('Cannot generate content shot list: event not found')

  const pdf = new PDFLayout()
  renderContentShotList(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Content Shot List')
  return pdf.toBuffer()
}
