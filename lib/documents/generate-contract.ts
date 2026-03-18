// Contract PDF Generator
// Renders a signed (or unsigned) service agreement as a formal PDF.
// Both chef and client can access - ownership is verified by the caller.
// Multi-page allowed: contracts can be long.

import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout, MARGIN_X, CONTENT_WIDTH } from './pdf-layout'
import { format } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

type ContractDocumentData = {
  contractRef: string
  bodySnapshot: string
  status: string
  signedAt: string | null
  signerIpPartial: string | null
  chef: {
    businessName: string
    email: string
    phone: string | null
  }
  client: {
    fullName: string
    email: string | null
  }
  event: {
    eventDate: string | null
    occasion: string | null
    guestCount: number | null
  }
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchContractData(
  contractId: string,
  owner: { chefId: string | null; clientEntityId: string | null }
): Promise<ContractDocumentData | null> {
  const supabase: any = createServerClient()
  const db = supabase as any

  let query = db
    .from('event_contracts')
    .select(
      `
      id, body_snapshot, status, signed_at, created_at, signer_ip_address, chef_id, client_id,
      events (event_date, occasion, guest_count),
      clients (full_name, email)
    `
    )
    .eq('id', contractId)

  if (owner.chefId) {
    query = query.eq('chef_id', owner.chefId)
  } else if (owner.clientEntityId) {
    query = query.eq('client_id', owner.clientEntityId)
  } else {
    return null
  }

  const { data: contract } = await query.single()
  if (!contract) return null

  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, email, phone')
    .eq('id', contract.chef_id)
    .single()

  if (!chef) return null

  const event = contract.events as any
  const client = contract.clients as any

  // Partial IP - hide first octet for privacy
  let signerIpPartial: string | null = null
  if (contract.signer_ip_address) {
    const parts = String(contract.signer_ip_address).split('.')
    if (parts.length === 4) {
      signerIpPartial = `***.${parts.slice(1).join('.')}`
    } else {
      signerIpPartial = '*** (logged)'
    }
  }

  const year = new Date(contract.created_at).getFullYear()
  const shortId = contractId.replace(/-/g, '').slice(0, 4).toUpperCase()
  const contractRef = `CONTRACT-${year}-${shortId}`

  return {
    contractRef,
    bodySnapshot: contract.body_snapshot ?? '',
    status: contract.status ?? 'draft',
    signedAt: contract.signed_at ?? null,
    signerIpPartial,
    chef: {
      businessName: chef.business_name,
      email: chef.email,
      phone: chef.phone,
    },
    client: {
      fullName: client?.full_name ?? 'Client',
      email: client?.email ?? null,
    },
    event: {
      eventDate: event?.event_date ?? null,
      occasion: event?.occasion ?? null,
      guestCount: event?.guest_count ?? null,
    },
  }
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
// The body_snapshot is stored as markdown. We render it to PDF without
// any external library - basic parsing only.

function renderMarkdownBody(pdf: PDFLayout, markdown: string) {
  const lines = markdown.split('\n')
  const LINE_HEIGHT_NORMAL = 9 * 0.38
  const LINE_HEIGHT_H1 = 11 * 0.38 + 1
  const LINE_HEIGHT_H2 = 10 * 0.38 + 0.5

  for (const raw of lines) {
    const line = raw.trimEnd()

    // Heading 1: # Title
    if (line.startsWith('# ')) {
      const text = line.slice(2).trim()
      if (pdf.wouldOverflow(LINE_HEIGHT_H1 + 4)) pdf.newPage()
      pdf.space(2)
      pdf.sectionHeader(text, 11, true)
      continue
    }

    // Heading 2: ## Subtitle
    if (line.startsWith('## ')) {
      const text = line.slice(3).trim()
      if (pdf.wouldOverflow(LINE_HEIGHT_H2 + 3)) pdf.newPage()
      pdf.space(1)
      pdf.courseHeader(text, 10)
      continue
    }

    // Heading 3: ### Sub-subtitle (treat as bold text)
    if (line.startsWith('### ')) {
      const text = stripInlineMarkdown(line.slice(4).trim())
      if (pdf.wouldOverflow(LINE_HEIGHT_NORMAL + 2)) pdf.newPage()
      pdf.space(1)
      pdf.text(text, 9, 'bold')
      continue
    }

    // Bullet: - item or * item
    if (/^[-*]\s/.test(line)) {
      const text = stripInlineMarkdown(line.slice(2).trim())
      const estimatedHeight = Math.ceil(text.length / 80) * LINE_HEIGHT_NORMAL + 1
      if (pdf.wouldOverflow(estimatedHeight)) pdf.newPage()
      pdf.bullet(text, 9)
      continue
    }

    // Empty line → small space
    if (line.trim() === '') {
      if (!pdf.wouldOverflow(2)) pdf.space(2)
      continue
    }

    // Horizontal rule: ---
    if (/^-{3,}$/.test(line.trim())) {
      if (!pdf.wouldOverflow(4)) pdf.hr()
      continue
    }

    // Bold-only line (e.g. **Client Signature:** ______)
    const boldOnlyMatch = line.match(/^\*\*(.+?)\*\*(.*)$/)
    if (boldOnlyMatch) {
      const boldPart = boldOnlyMatch[1].trim()
      const rest = boldOnlyMatch[2].trim()
      const combined = rest ? `${boldPart}  ${rest}` : boldPart
      const estimatedHeight = Math.ceil(combined.length / 80) * LINE_HEIGHT_NORMAL
      if (pdf.wouldOverflow(estimatedHeight + 1)) pdf.newPage()
      if (rest) {
        pdf.keyValue(boldPart, rest, 9)
      } else {
        pdf.text(boldPart, 9, 'bold')
      }
      continue
    }

    // Regular text
    const text = stripInlineMarkdown(line)
    const estimatedHeight = Math.ceil(text.length / 80) * LINE_HEIGHT_NORMAL
    if (pdf.wouldOverflow(estimatedHeight + 1)) pdf.newPage()
    pdf.text(text, 9, 'normal')
  }
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold** → bold
    .replace(/__(.+?)__/g, '$1') // __bold__ → bold
    .replace(/\*(.+?)\*/g, '$1') // *italic* → italic
    .replace(/_(.+?)_/g, '$1') // _italic_ → italic
    .replace(/`(.+?)`/g, '$1') // `code` → code
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderContract(pdf: PDFLayout, data: ContractDocumentData) {
  const { contractRef, bodySnapshot, status, signedAt, signerIpPartial, chef, client, event } = data

  // ── HEADER ────────────────────────────────────────────────────────────────
  pdf.title(chef.businessName, 13)
  pdf.title('SERVICE AGREEMENT', 11)
  pdf.space(1)

  // Contract metadata bar
  pdf.headerBar([
    ['Ref', contractRef],
    ['Prepared for', client.fullName],
  ])

  if (event.eventDate) {
    pdf.headerBar([
      ['Event Date', format(new Date(event.eventDate), 'MMMM d, yyyy')],
      ...(event.occasion ? [['Occasion', event.occasion] as [string, string]] : []),
      ...(event.guestCount ? [['Guests', String(event.guestCount)] as [string, string]] : []),
    ])
  }

  if (status === 'signed' && signedAt) {
    pdf.space(1)
    pdf.text(`Electronically signed on ${format(new Date(signedAt), 'MMMM d, yyyy')}`, 8, 'italic')
  }

  pdf.space(3)

  // ── PARTIES ───────────────────────────────────────────────────────────────
  pdf.sectionHeader('PARTIES', 10, true)

  // Two-column: Chef (left) | Client (right)
  const halfWidth = CONTENT_WIDTH / 2 - 4
  const doc = pdf.doc

  // Chef column
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('CHEF / SERVICE PROVIDER', MARGIN_X, pdf.y)
  doc.setFont('helvetica', 'normal')
  doc.text(chef.businessName, MARGIN_X, pdf.y + 4)
  doc.text(chef.email, MARGIN_X, pdf.y + 8)
  if (chef.phone) doc.text(chef.phone, MARGIN_X, pdf.y + 12)

  // Client column
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENT', MARGIN_X + halfWidth + 4, pdf.y)
  doc.setFont('helvetica', 'normal')
  doc.text(client.fullName, MARGIN_X + halfWidth + 4, pdf.y + 4)
  if (client.email) doc.text(client.email, MARGIN_X + halfWidth + 4, pdf.y + 8)

  pdf.y += chef.phone ? 16 : 14
  pdf.space(3)

  // ── CONTRACT BODY ─────────────────────────────────────────────────────────
  renderMarkdownBody(pdf, bodySnapshot)

  // ── SIGNATURE BLOCK ───────────────────────────────────────────────────────
  // Always render on a new page if near the bottom to keep it clean
  if (pdf.wouldOverflow(40)) pdf.newPage()

  pdf.space(4)
  pdf.sectionHeader('ELECTRONIC SIGNATURE', 10, true)

  if (status === 'signed' && signedAt) {
    pdf.keyValue('Status', 'SIGNED', 9)
    pdf.keyValue('Signed by', client.fullName, 9)
    pdf.keyValue('Date', format(new Date(signedAt), "MMMM d, yyyy 'at' h:mm a"), 9)
    if (signerIpPartial) {
      pdf.keyValue('IP (partial)', signerIpPartial, 9)
    }
    pdf.space(2)
    pdf.text('This document was electronically signed via ChefFlow.', 8, 'italic')
  } else {
    pdf.keyValue('Status', status.toUpperCase(), 9)
    pdf.space(2)
    pdf.text('Awaiting electronic signature via ChefFlow.', 8, 'italic')
  }

  // Footer
  pdf.footer(`${contractRef}  ·  ${chef.businessName}  ·  ${chef.email}`)
}

// ─── Generate ─────────────────────────────────────────────────────────────────

export async function generateContract(
  contractId: string,
  owner: { chefId: string | null; clientEntityId: string | null }
): Promise<Buffer> {
  const data = await fetchContractData(contractId, owner)
  if (!data) throw new Error('Contract not found or access denied')

  const pdf = new PDFLayout()
  renderContract(pdf, data)
  return pdf.toBuffer()
}
