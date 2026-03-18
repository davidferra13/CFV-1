// QR Code API - goqr.me, completely free, no key required
// https://goqr.me/api/
// Generate QR codes as image URLs - no signup, no limits

/**
 * Generate a QR code image URL.
 * Returns a URL that renders a PNG QR code - use directly in <img> tags.
 *
 * @param data - The content to encode (URL, text, etc.)
 * @param size - Image dimensions in pixels (default 300x300)
 * @param format - Image format: png, svg, jpg, eps (default png)
 */
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

/**
 * Generate a QR code for an event detail page.
 * Client scans → opens event details / menu / confirmation.
 */
export function getEventQrUrl(eventId: string, baseUrl: string, size = 300): string {
  return getQrCodeUrl(`${baseUrl}/events/${eventId}`, size)
}

/**
 * Generate a QR code for a menu.
 * Client scans → sees the proposed menu.
 */
export function getMenuQrUrl(eventId: string, baseUrl: string, size = 300): string {
  return getQrCodeUrl(`${baseUrl}/events/${eventId}/menu`, size)
}

/**
 * Generate a QR code for an invoice / payment link.
 */
export function getInvoiceQrUrl(invoiceUrl: string, size = 300): string {
  return getQrCodeUrl(invoiceUrl, size)
}

/**
 * Generate a QR code for the chef's public inquiry page.
 * Put this on business cards, table tents, etc.
 */
export function getInquiryQrUrl(chefSlug: string, baseUrl: string, size = 300): string {
  return getQrCodeUrl(`${baseUrl}/chef/${chefSlug}`, size)
}

/**
 * Download a QR code as a buffer (for PDF generation, email attachments, etc.)
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
