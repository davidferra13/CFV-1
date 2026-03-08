// Logo utilities for PDF generation.
// Fetches a chef's logo URL and converts it to a base64 data URI
// that jsPDF can embed directly into the document.

/**
 * Fetch a logo URL and return it as a base64 data URI for jsPDF.
 * Returns null if the URL is null, fetch fails, or the image is invalid.
 * Never throws - PDFs should still generate even if the logo can't load.
 */
export async function fetchLogoAsBase64(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null

  try {
    const response = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') || 'image/png'
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return `data:${contentType};base64,${base64}`
  } catch (err) {
    console.error('[fetchLogoAsBase64] Failed to fetch logo:', err)
    return null
  }
}
