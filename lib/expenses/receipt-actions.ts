// Receipt Scanning Server Action — OCR.space Integration
// Accepts an image file upload, runs OCR, parses receipt text,
// and returns structured data for chef review. Does NOT auto-save.
//
// Uses Formula > AI principle: regex-based receipt parsing, not LLM.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { scanReceiptFromBuffer } from '@/lib/ocr/ocr-space'
import { parseReceiptText, type ParsedReceipt } from '@/lib/ocr/receipt-parser'

// 'use server' files can only export async functions — no constants/types exported here.
// Types for the result are co-located at lib/ocr/receipt-parser.ts (ParsedReceipt, ParsedLineItem).

/**
 * Scan and parse a receipt image.
 *
 * Accepts a FormData with a single file field named 'receipt'.
 * Returns the parsed receipt data for chef review/confirmation.
 * Does NOT create an expense automatically — the chef reviews and confirms.
 *
 * Returns:
 * - { success: true, data: ParsedReceipt, rawText: string } on success
 * - { success: false, error: string } on failure
 */
export async function scanAndParseReceipt(formData: FormData): Promise<{
  success: boolean
  data?: ParsedReceipt
  rawText?: string
  error?: string
}> {
  // Auth check — tenant ID from session, never from request
  await requireChef()

  const file = formData.get('receipt') as File | null
  if (!file) {
    return { success: false, error: 'No file provided' }
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: `Invalid file type: ${file.type}. Accepted: JPEG, PNG, WebP`,
    }
  }

  // Validate file size (10 MB max)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      success: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`,
    }
  }

  // Check if OCR.space API key is configured
  if (!process.env.OCR_SPACE_API_KEY) {
    return {
      success: false,
      error:
        'OCR.space API key is not configured. Add OCR_SPACE_API_KEY to your environment variables.',
    }
  }

  // Convert File to Buffer for OCR.space
  let buffer: Buffer
  try {
    const arrayBuffer = await file.arrayBuffer()
    buffer = Buffer.from(arrayBuffer)
  } catch (err) {
    console.error('[scanAndParseReceipt] File read error:', err)
    return { success: false, error: 'Failed to read uploaded file' }
  }

  // Send to OCR.space for text extraction
  let rawText: string | null
  try {
    rawText = await scanReceiptFromBuffer(buffer, file.name)
  } catch (err) {
    console.error('[scanAndParseReceipt] OCR.space error:', err)
    return { success: false, error: 'OCR service error. Please try again.' }
  }

  if (!rawText) {
    return {
      success: false,
      error: 'Could not extract text from the image. Try a clearer photo with better lighting.',
    }
  }

  // Parse the raw OCR text using deterministic regex parser (Formula > AI)
  const parsed = parseReceiptText(rawText)

  return {
    success: true,
    data: parsed,
    rawText,
  }
}
