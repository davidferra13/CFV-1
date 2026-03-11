// Text extraction from uploaded menu files
// Supports: PDF, JPG/JPEG, PNG, HEIC/HEIF, WEBP, DOCX, TXT, and RTF
// All processing is LOCAL — no data leaves the machine

'use server'

import {
  buildDeterministicEnhancedDocumentImage,
  canDeterministicallyEnhanceDocumentImage,
} from '@/lib/documents/image-enhancement'

// Max extraction time per file — prevents malicious/malformed files from hanging the server
const EXTRACTION_TIMEOUT_MS = 30_000 // 30 seconds

/**
 * Wrap an async operation with a timeout to prevent DoS via malformed files.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
    promise
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

/**
 * Extract text from a PDF buffer using pdf-parse.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfParse = ((await import('pdf-parse')) as any).default
  const result = await withTimeout<{ text: string }>(
    pdfParse(buffer),
    EXTRACTION_TIMEOUT_MS,
    'PDF extraction'
  )
  return result.text.trim()
}

/**
 * Extract text from a DOCX buffer using mammoth.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await withTimeout(
    mammoth.extractRawText({ buffer }),
    EXTRACTION_TIMEOUT_MS,
    'DOCX extraction'
  )
  return result.value.trim()
}

/**
 * Extract text from a plain text buffer.
 */
export async function extractTextFromTxt(buffer: Buffer): Promise<string> {
  return buffer.toString('utf-8').trim()
}

/**
 * Extract text from an image buffer using Tesseract.js (local OCR).
 * Returns both the text and a confidence score (0-100).
 */
export async function extractTextFromImage(
  buffer: Buffer,
  mimeType: string = 'image/png'
): Promise<{ text: string; confidence: number }> {
  const Tesseract = await import('tesseract.js')
  const worker = await Tesseract.createWorker('eng')
  try {
    const imageBuffer = canDeterministicallyEnhanceDocumentImage(mimeType)
      ? (await buildDeterministicEnhancedDocumentImage(buffer)).buffer
      : buffer
    const { data } = await withTimeout(
      worker.recognize(imageBuffer),
      EXTRACTION_TIMEOUT_MS,
      'OCR extraction'
    )
    return {
      text: data.text.trim(),
      confidence: data.confidence,
    }
  } finally {
    await worker.terminate()
  }
}

/**
 * Route a file buffer to the appropriate text extractor based on file type.
 */
export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string
): Promise<{ text: string; confidence?: number }> {
  const ext = fileName.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'pdf':
      return { text: await extractTextFromPdf(buffer) }
    case 'jpg':
    case 'jpeg':
      return extractTextFromImage(buffer, 'image/jpeg')
    case 'png':
      return extractTextFromImage(buffer, 'image/png')
    case 'heic':
      return extractTextFromImage(buffer, 'image/heic')
    case 'heif':
      return extractTextFromImage(buffer, 'image/heif')
    case 'webp':
      return extractTextFromImage(buffer, 'image/webp')
    case 'docx':
      return { text: await extractTextFromDocx(buffer) }
    case 'txt':
    case 'rtf':
      return { text: await extractTextFromTxt(buffer) }
    default:
      throw new Error(`Unsupported file format: ${ext}`)
  }
}
