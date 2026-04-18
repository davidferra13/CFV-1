// Receipt Scanning Server Action - Ollama Vision
// Accepts an image file upload, runs vision model extraction,
// and returns structured data for chef review. Does NOT auto-save.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { parseReceiptImage } from '@/lib/ai/receipt-ocr'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import type { ParsedReceipt } from '@/lib/ocr/receipt-parser'

// 'use server' files can only export async functions - no constants/types exported here.
// Types for the result are co-located at lib/ocr/receipt-parser.ts (ParsedReceipt, ParsedLineItem).

/**
 * Scan and parse a receipt image using Ollama vision model.
 *
 * Accepts a FormData with a single file field named 'receipt'.
 * Returns the parsed receipt data for chef review/confirmation.
 * Does NOT create an expense automatically - the chef reviews and confirms.
 *
 * Returns:
 * - { success: true, data: ParsedReceipt } on success
 * - { success: false, error: string } on failure
 */
export async function scanAndParseReceipt(formData: FormData): Promise<{
  success: boolean
  data?: ParsedReceipt
  rawText?: string
  error?: string
}> {
  await requireChef()

  const file = formData.get('receipt') as File | null
  if (!file) {
    return { success: false, error: 'No file provided' }
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: `Invalid file type: ${file.type}. Accepted: JPEG, PNG, WebP`,
    }
  }

  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      success: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`,
    }
  }

  let imageBase64: string
  try {
    const arrayBuffer = await file.arrayBuffer()
    imageBase64 = Buffer.from(arrayBuffer).toString('base64')
  } catch (err) {
    console.error('[scanAndParseReceipt] File read error:', err)
    return { success: false, error: 'Failed to read uploaded file' }
  }

  try {
    const result = await parseReceiptImage(imageBase64, file.type)

    if (!result.success || result.items.length === 0) {
      return {
        success: false,
        error: result.error || 'Could not extract items from the image. Try a clearer photo.',
      }
    }

    // Map ReceiptParseResult to ParsedReceipt shape
    const parsed: ParsedReceipt = {
      storeName: result.storeName,
      date: result.date,
      totalCents: result.total,
      subtotalCents: result.subtotal,
      taxCents: result.tax,
      items: result.items.map((item) => ({
        name: item.productName,
        priceCents: item.totalPrice,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
      })),
    }

    return { success: true, data: parsed }
  } catch (err) {
    if (err instanceof OllamaOfflineError) {
      return { success: false, error: 'AI service is currently unavailable. Please try again.' }
    }
    console.error('[scanAndParseReceipt] Vision model error:', err)
    return { success: false, error: 'Receipt processing failed. Please try again.' }
  }
}
