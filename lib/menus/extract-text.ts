// Text extraction from uploaded menu files
// Supports: PDF, images (OCR via Tesseract.js), DOCX, TXT
// All processing is LOCAL — no data leaves the machine

'use server'

/**
 * Extract text from a PDF buffer using pdf-parse.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default
  const result = await pdfParse(buffer)
  return result.text.trim()
}

/**
 * Extract text from a DOCX buffer using mammoth.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
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
  buffer: Buffer
): Promise<{ text: string; confidence: number }> {
  const Tesseract = await import('tesseract.js')
  const worker = await Tesseract.createWorker('eng')
  try {
    const { data } = await worker.recognize(buffer)
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
    case 'png':
    case 'heic':
    case 'webp':
      return extractTextFromImage(buffer)
    case 'docx':
      return { text: await extractTextFromDocx(buffer) }
    case 'txt':
    case 'rtf':
      return { text: await extractTextFromTxt(buffer) }
    default:
      throw new Error(`Unsupported file format: ${ext}`)
  }
}
