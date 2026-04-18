// Commerce Engine V1 - Receipt Actions
// Build receipt data, generate PDFs, and deliver receipts by email/SMS.

'use server'

import { createElement } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import {
  generateCommerceReceiptPdf,
  type CommerceReceiptData,
} from '@/lib/documents/generate-commerce-receipt'
import { sendEmail } from '@/lib/email/send'
import { CommerceSaleReceiptEmail } from '@/lib/email/templates/commerce-sale-receipt'
import { sendSms } from '@/lib/sms/send'
import { formatCurrency } from '@/lib/utils/currency'
import { SALE_CHANNEL_LABELS } from './constants'
import type { SaleChannel } from './constants'
import { appendPosAuditLog } from './pos-audit-log'

type SaleContactSnapshot = {
  saleId: string
  saleNumber: string
  totalCents: number
  saleDate: string
  clientId: string | null
  clientName: string | null
  clientEmail: string | null
  clientPhone: string | null
}

type ReceiptPaymentLine = {
  method: string
  amountCents: number
  status: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d\s\-().]{7,20}$/

function normalizeEmail(value: string | undefined | null): string | null {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  if (!normalized) return null
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new Error('Invalid email address')
  }
  return normalized
}

function normalizePhone(value: string | undefined | null): string | null {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  if (!PHONE_PATTERN.test(normalized)) {
    throw new Error('Invalid phone number format')
  }
  return normalized
}

function formatReceiptDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildPaymentSummary(payments: ReceiptPaymentLine[]): string {
  if (payments.length === 0) return 'N/A'
  return payments
    .map((payment) => `${payment.method.toUpperCase()} ${formatCurrency(payment.amountCents)}`)
    .join(', ')
}

async function getSaleContactSnapshot(
  db: any,
  tenantId: string,
  saleId: string
): Promise<SaleContactSnapshot> {
  const { data: sale, error: saleErr } = await (db
    .from('sales')
    .select('id, sale_number, total_cents, created_at, client_id')
    .eq('id', saleId)
    .eq('tenant_id', tenantId)
    .single() as any)

  if (saleErr || !sale) throw new Error('Sale not found')

  let clientName: string | null = null
  let clientEmail: string | null = null
  let clientPhone: string | null = null

  const clientId = (sale as any).client_id ? String((sale as any).client_id) : null
  if (clientId) {
    const { data: client } = await (db
      .from('clients')
      .select('full_name, email, phone')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .maybeSingle() as any)

    clientName = client?.full_name ? String(client.full_name) : null
    clientEmail = client?.email ? String(client.email) : null
    clientPhone = client?.phone ? String(client.phone) : null
  }

  return {
    saleId: String((sale as any).id),
    saleNumber: String((sale as any).sale_number ?? saleId),
    totalCents: Number((sale as any).total_cents ?? 0),
    saleDate: String((sale as any).created_at ?? new Date().toISOString()),
    clientId,
    clientName,
    clientEmail,
    clientPhone,
  }
}

// Assemble all data needed for a receipt from a sale ID.
export async function buildReceiptData(saleId: string): Promise<CommerceReceiptData> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: sale, error: saleErr } = await db
    .from('sales')
    .select('*')
    .eq('id', saleId)
    .eq('tenant_id', tenantId)
    .single()

  if (saleErr || !sale) throw new Error('Sale not found')
  const s = sale as any

  const { data: items } = await db
    .from('sale_items')
    .select('name, quantity, unit_price_cents, line_total_cents')
    .eq('sale_id', saleId)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  const { data: payments } = await db
    .from('commerce_payments')
    .select('payment_method, amount_cents, status')
    .eq('sale_id', saleId)
    .eq('tenant_id', tenantId)
    .in('status', ['captured', 'settled'])

  const { data: chef } = await db
    .from('chefs')
    .select('business_name, display_name, email, phone, address_line1, city, state, zip')
    .eq('id', tenantId)
    .single()

  const chefData = chef as any
  const businessName = chefData?.business_name || chefData?.display_name || 'ChefFlow'
  const addressParts = [
    chefData?.address_line1,
    chefData?.city,
    chefData?.state,
    chefData?.zip,
  ].filter(Boolean)
  const businessAddress = addressParts.length > 0 ? addressParts.join(', ') : undefined

  let customerName: string | undefined
  if (s.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', s.client_id)
      .single()
    customerName = (client as any)?.full_name ?? undefined
  }

  return {
    saleNumber: s.sale_number,
    saleDate: s.created_at,
    channel: SALE_CHANNEL_LABELS[s.channel as SaleChannel] ?? s.channel,
    businessName,
    businessAddress,
    businessPhone: chefData?.phone ?? undefined,
    businessEmail: chefData?.email ?? undefined,
    items: (items ?? []).map((i: any) => ({
      name: i.name,
      quantity: i.quantity,
      unitPriceCents: i.unit_price_cents ?? 0,
      lineTotalCents: i.line_total_cents ?? 0,
    })),
    subtotalCents: s.subtotal_cents ?? 0,
    taxCents: s.tax_cents ?? 0,
    discountCents: s.discount_cents ?? 0,
    tipCents: s.tip_cents ?? 0,
    totalCents: s.total_cents ?? 0,
    payments: (payments ?? []).map((p: any) => ({
      method: p.payment_method,
      amountCents: p.amount_cents ?? 0,
      status: p.status,
    })),
    customerName,
    taxZipCode: s.tax_zip_code ?? undefined,
  }
}

// Generate a receipt PDF for a sale. Returns base64-encoded PDF data.
export async function generateReceipt(saleId: string): Promise<{ pdf: string; filename: string }> {
  const data = await buildReceiptData(saleId)
  const buffer = await generateCommerceReceiptPdf(data)
  const pdf = buffer.toString('base64')
  const filename = `receipt-${data.saleNumber ?? saleId}.pdf`
  return { pdf, filename }
}

export type ReceiptDeliveryTargets = {
  saleId: string
  saleNumber: string
  totalCents: number
  customerName: string | null
  suggestedEmail: string | null
  suggestedPhone: string | null
}

export async function getReceiptDeliveryTargets(saleId: string): Promise<ReceiptDeliveryTargets> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const snapshot = await getSaleContactSnapshot(db, user.tenantId!, saleId)

  return {
    saleId: snapshot.saleId,
    saleNumber: snapshot.saleNumber,
    totalCents: snapshot.totalCents,
    customerName: snapshot.clientName,
    suggestedEmail: snapshot.clientEmail,
    suggestedPhone: snapshot.clientPhone,
  }
}

export async function sendReceiptByEmail(input: {
  saleId: string
  toEmail?: string
}): Promise<{ sent: true; toEmail: string }> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const snapshot = await getSaleContactSnapshot(db, user.tenantId!, input.saleId)
  const toEmail = normalizeEmail(input.toEmail) ?? normalizeEmail(snapshot.clientEmail)
  if (!toEmail) {
    throw new Error('No email address is available for this receipt')
  }

  const data = await buildReceiptData(input.saleId)
  const attachmentBuffer = await generateCommerceReceiptPdf(data)
  const filename = `receipt-${data.saleNumber ?? input.saleId}.pdf`
  const paymentSummary = buildPaymentSummary(data.payments as ReceiptPaymentLine[])
  const sent = await sendEmail({
    to: toEmail,
    subject: `Receipt ${data.saleNumber ?? snapshot.saleNumber} from ${data.businessName}`,
    react: createElement(CommerceSaleReceiptEmail, {
      customerName: data.customerName ?? 'there',
      businessName: data.businessName,
      saleNumber: data.saleNumber ?? snapshot.saleNumber,
      saleDate: formatReceiptDate(data.saleDate),
      totalFormatted: formatCurrency(data.totalCents),
      paymentSummary,
    }),
    attachments: [
      {
        filename,
        content: attachmentBuffer,
        contentType: 'application/pdf',
      },
    ],
    isTransactional: true,
  })

  if (!sent) {
    throw new Error('Failed to send email receipt')
  }

  try {
    await appendPosAuditLog({
      tenantId: user.tenantId!,
      action: 'receipt_emailed',
      tableName: 'sales',
      recordId: input.saleId,
      changedBy: user.id,
      summary: `Receipt emailed for sale ${snapshot.saleNumber}`,
      afterValues: { to_email: toEmail, sale_number: snapshot.saleNumber },
    })
  } catch (err) {
    console.error('[non-blocking] Receipt audit log failed:', err)
  }

  return { sent: true, toEmail }
}

export async function sendReceiptBySms(input: {
  saleId: string
  toPhone?: string
}): Promise<{ status: 'sent' | 'failed' | 'not_configured'; toPhone: string }> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const snapshot = await getSaleContactSnapshot(db, user.tenantId!, input.saleId)
  const toPhone = normalizePhone(input.toPhone) ?? normalizePhone(snapshot.clientPhone)
  if (!toPhone) {
    throw new Error('No phone number is available for this receipt')
  }

  const data = await buildReceiptData(input.saleId)
  const message = [
    `${data.businessName} receipt`,
    `${data.saleNumber ?? snapshot.saleNumber}: ${formatCurrency(data.totalCents)}`,
    formatReceiptDate(data.saleDate),
  ].join(' - ')

  const status = await sendSms(toPhone, message.slice(0, 320))

  try {
    await appendPosAuditLog({
      tenantId: user.tenantId!,
      action: 'receipt_sms_sent',
      tableName: 'sales',
      recordId: input.saleId,
      changedBy: user.id,
      summary: `Receipt SMS ${status} for sale ${snapshot.saleNumber}`,
      afterValues: { to_phone: toPhone, sms_status: status, sale_number: snapshot.saleNumber },
    })
  } catch (err) {
    console.error('[non-blocking] Receipt SMS audit log failed:', err)
  }

  return { status, toPhone }
}
