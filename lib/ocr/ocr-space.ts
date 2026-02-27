// OCR.space Receipt Scanner — API Utility
// Free OCR API (500 req/day, no card required)
// Returns raw extracted text from receipt images.
//
// Env var: OCR_SPACE_API_KEY (free tier key from https://ocr.space)
// If not set, functions return null (graceful degradation).

/**
 * Scan a receipt image via URL using OCR.space API.
 * Returns the raw extracted text, or null if the API key is not configured.
 */
export async function scanReceipt(imageUrl: string): Promise<string | null> {
  const apiKey = process.env.OCR_SPACE_API_KEY
  if (!apiKey) {
    return null
  }

  const formData = new URLSearchParams()
  formData.append('url', imageUrl)
  formData.append('apikey', apiKey)
  formData.append('language', 'eng')
  formData.append('isOverlayRequired', 'false')
  formData.append('detectOrientation', 'true')
  formData.append('scale', 'true')
  formData.append('OCREngine', '2') // Engine 2 is better for receipts

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  })

  if (!response.ok) {
    console.error('[OCR.space] HTTP error:', response.status, response.statusText)
    return null
  }

  const result = await response.json()

  if (result.IsErroredOnProcessing) {
    console.error('[OCR.space] Processing error:', result.ErrorMessage?.[0] || 'Unknown error')
    return null
  }

  const parsedResults = result.ParsedResults
  if (!parsedResults || parsedResults.length === 0) {
    console.error('[OCR.space] No parsed results returned')
    return null
  }

  // Concatenate text from all parsed pages
  const text = parsedResults
    .map((r: { ParsedText: string }) => r.ParsedText)
    .join('\n')
    .trim()

  return text || null
}

/**
 * Scan a receipt from a raw image buffer using OCR.space API.
 * Sends the image as a base64-encoded file.
 * Returns the raw extracted text, or null if the API key is not configured.
 */
export async function scanReceiptFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<string | null> {
  const apiKey = process.env.OCR_SPACE_API_KEY
  if (!apiKey) {
    return null
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

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  })

  if (!response.ok) {
    console.error('[OCR.space] HTTP error:', response.status, response.statusText)
    return null
  }

  const result = await response.json()

  if (result.IsErroredOnProcessing) {
    console.error('[OCR.space] Processing error:', result.ErrorMessage?.[0] || 'Unknown error')
    return null
  }

  const parsedResults = result.ParsedResults
  if (!parsedResults || parsedResults.length === 0) {
    console.error('[OCR.space] No parsed results returned')
    return null
  }

  // Concatenate text from all parsed pages
  const text = parsedResults
    .map((r: { ParsedText: string }) => r.ParsedText)
    .join('\n')
    .trim()

  return text || null
}
