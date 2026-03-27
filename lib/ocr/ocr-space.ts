// OCR.space Receipt Scanner - API Utility
// Free OCR API (500 req/day, no card required)
// Returns { text, error } so callers can show "OCR unavailable" instead of "no receipt found."
//
// Env var: OCR_SPACE_API_KEY (free tier key from https://ocr.space)
// If not set, returns { text: null, error: 'not configured' }.

export type OcrResult = {
  text: string | null
  error: string | null
}

/**
 * Scan a receipt image via URL using OCR.space API.
 * Returns { text, error } for honest error reporting.
 */
export async function scanReceipt(imageUrl: string): Promise<OcrResult> {
  const apiKey = process.env.OCR_SPACE_API_KEY
  if (!apiKey) {
    return { text: null, error: 'OCR.space API key not configured' }
  }

  const formData = new URLSearchParams()
  formData.append('url', imageUrl)
  formData.append('apikey', apiKey)
  formData.append('language', 'eng')
  formData.append('isOverlayRequired', 'false')
  formData.append('detectOrientation', 'true')
  formData.append('scale', 'true')
  formData.append('OCREngine', '2') // Engine 2 is better for receipts

  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    if (!response.ok) {
      console.error('[OCR.space] HTTP error:', response.status, response.statusText)
      return { text: null, error: `OCR API returned ${response.status}` }
    }

    const result = await response.json()

    if (result.IsErroredOnProcessing) {
      const msg = result.ErrorMessage?.[0] || 'Unknown error'
      console.error('[OCR.space] Processing error:', msg)
      return { text: null, error: `OCR processing failed: ${msg}` }
    }

    const parsedResults = result.ParsedResults
    if (!parsedResults || parsedResults.length === 0) {
      return { text: null, error: null }
    }

    const text = parsedResults
      .map((r: { ParsedText: string }) => r.ParsedText)
      .join('\n')
      .trim()

    return { text: text || null, error: null }
  } catch (err) {
    console.error('[OCR.space] Network error:', err)
    return { text: null, error: 'OCR service unreachable' }
  }
}

/**
 * Scan a receipt from a raw image buffer using OCR.space API.
 * Sends the image as a base64-encoded file.
 * Returns { text, error } for honest error reporting.
 */
export async function scanReceiptFromBuffer(buffer: Buffer, filename: string): Promise<OcrResult> {
  const apiKey = process.env.OCR_SPACE_API_KEY
  if (!apiKey) {
    return { text: null, error: 'OCR.space API key not configured' }
  }

  // Convert buffer to base64 data URI
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  const base64 = buffer.toString('base64')
  const dataUri = `data:${mimeType};base64,${base64}`

  const formData = new URLSearchParams()
  formData.append('base64Image', dataUri)
  formData.append('apikey', apiKey)
  formData.append('language', 'eng')
  formData.append('isOverlayRequired', 'false')
  formData.append('detectOrientation', 'true')
  formData.append('scale', 'true')
  formData.append('OCREngine', '2') // Engine 2 is better for receipts

  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    if (!response.ok) {
      console.error('[OCR.space] HTTP error:', response.status, response.statusText)
      return { text: null, error: `OCR API returned ${response.status}` }
    }

    const result = await response.json()

    if (result.IsErroredOnProcessing) {
      const msg = result.ErrorMessage?.[0] || 'Unknown error'
      console.error('[OCR.space] Processing error:', msg)
      return { text: null, error: `OCR processing failed: ${msg}` }
    }

    const parsedResults = result.ParsedResults
    if (!parsedResults || parsedResults.length === 0) {
      return { text: null, error: null }
    }

    const text = parsedResults
      .map((r: { ParsedText: string }) => r.ParsedText)
      .join('\n')
      .trim()

    return { text: text || null, error: null }
  } catch (err) {
    console.error('[OCR.space] Network error:', err)
    return { text: null, error: 'OCR service unreachable' }
  }
}
