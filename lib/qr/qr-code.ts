// QR Code Generation
// Two modes: URL-based (for <img> tags) and local (for PDF embedding).
// Local generation uses the `qrcode` npm package (zero network calls).
// URL-based uses goqr.me API (free, no key required).

import * as QRCode from 'qrcode'

// ─── App Base URL ──────────────────────────────────────────────────────────────

function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.cheflowhq.com'
}

// ─── URL-based (for <img> tags in the browser) ────────────────────────────────

export function getQrCodeUrl(
  data: string,
  size = 300,
  format: 'png' | 'svg' | 'jpg' | 'eps' = 'png'
): string {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data,
    format,
  })
  return `https://api.qrserver.com/v1/create-qr-code/?${params}`
}

// ─── Local generation (for PDF embedding, no network) ─────────────────────────

/**
 * Generate a QR code as a PNG Buffer. Use this for embedding in PDFKit documents.
 * Zero network calls, runs entirely locally.
 */
export async function generateQrBuffer(url: string, size = 200): Promise<Buffer | null> {
  try {
    return await QRCode.toBuffer(url, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1a1a1a', light: '#ffffff' },
    })
  } catch {
    return null
  }
}

/**
 * Generate a QR code as a base64 data URL. Use this for embedding in jsPDF documents.
 * Zero network calls, runs entirely locally.
 */
export async function generateQrDataUrl(url: string, size = 200): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1a1a1a', light: '#ffffff' },
    })
  } catch {
    return null
  }
}

// ─── Document-specific URL builders ───────────────────────────────────────────

/** URL for a client's invoice/payment page */
export function getInvoicePageUrl(eventId: string): string {
  return `${getAppBaseUrl()}/my-events/${eventId}/invoice`
}

/** URL for a client's event portal page */
export function getClientPortalUrl(eventId: string): string {
  return `${getAppBaseUrl()}/my-events/${eventId}`
}

/** URL for a contract signing/viewing page */
export function getContractPageUrl(eventId: string): string {
  return `${getAppBaseUrl()}/my-events/${eventId}/contract`
}

/** URL for an event detail page (chef view) */
export function getEventPageUrl(eventId: string): string {
  return `${getAppBaseUrl()}/events/${eventId}`
}

/** URL for a chef's public inquiry/booking form */
export function getInquiryFormUrl(chefId: string): string {
  return `${getAppBaseUrl()}/embed/inquiry/${chefId}`
}

/** URL for a public event share page */
export function getEventShareUrl(token: string): string {
  return `${getAppBaseUrl()}/share/${token}`
}

/** URL for a guest's secure RSVP portal */
export function getGuestPortalUrl(eventId: string, secureToken: string): string {
  return `${getAppBaseUrl()}/event/${eventId}/guest/${secureToken}`
}

/** URL for a dinner circle page */
export function getHubGroupUrl(groupToken: string): string {
  return `${getAppBaseUrl()}/hub/g/${groupToken}`
}

/** URL for a guest feedback page */
export function getGuestFeedbackUrl(token: string): string {
  return `${getAppBaseUrl()}/guest-feedback/${token}`
}

/** URL for a public rebook page */
export function getRebookUrl(token: string): string {
  return `${getAppBaseUrl()}/rebook/${token}`
}

/** URL for a dedicated guest photo upload page */
export function getPhotoUploadUrl(token: string): string {
  return `${getAppBaseUrl()}/photos/${token}`
}

/** URL for a chef's public profile */
export function getChefProfileUrl(slug: string): string {
  return `${getAppBaseUrl()}/chef/${slug}`
}

/** URL for a referral landing page */
export function getReferralUrl(chefSlug: string, referralCode: string): string {
  return `${getAppBaseUrl()}/refer/${chefSlug}?ref=${encodeURIComponent(referralCode)}`
}

/** URL for a chef-to-chef connect page */
export function getChefConnectUrl(chefId: string): string {
  return `${getAppBaseUrl()}/network/connect/${chefId}`
}

/** URL for a chef's public gift-card store */
export function getGiftCardStoreUrl(slug: string): string {
  return `${getAppBaseUrl()}/chef/${slug}/gift-cards`
}

// ─── Legacy helpers (keep for backward compat) ────────────────────────────────

export function getEventQrUrl(eventId: string, baseUrl: string, size = 300): string {
  return getQrCodeUrl(`${baseUrl}/events/${eventId}`, size)
}

export function getMenuQrUrl(eventId: string, baseUrl: string, size = 300): string {
  return getQrCodeUrl(`${baseUrl}/events/${eventId}/menu`, size)
}

export function getInvoiceQrUrl(invoiceUrl: string, size = 300): string {
  return getQrCodeUrl(invoiceUrl, size)
}

export function getInquiryQrUrl(chefSlug: string, baseUrl: string, size = 300): string {
  return getQrCodeUrl(`${baseUrl}/chef/${chefSlug}`, size)
}

/**
 * Download a QR code from the external API as a buffer.
 * Prefer generateQrBuffer() for PDF generation (no network dependency).
 */
export async function downloadQrCode(
  data: string,
  size = 300,
  format: 'png' | 'svg' = 'png'
): Promise<Buffer | null> {
  try {
    const url = getQrCodeUrl(data, size, format)
    const res = await fetch(url)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}
