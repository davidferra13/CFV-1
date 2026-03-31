/**
 * 3-tier OCR pipeline: Tesseract (free, local) -> Ollama Vision (local LLM) -> skip
 * Never sends data to cloud services. All processing stays on-machine.
 */

import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'llava:7b'

/**
 * Extract text from an image file using the OCR pipeline.
 * Tier 1: Tesseract.js (fast, free, local)
 * Tier 2: Ollama vision model (better for handwriting/scans)
 * Returns the best text found, or empty string.
 */
export async function extractTextFromImage(filePath) {
  // Tier 1: Tesseract.js
  const tesseractText = await tryTesseract(filePath)
  if (tesseractText && tesseractText.length > 30) {
    return { text: tesseractText, method: 'tesseract', confidence: 'high' }
  }

  // Tier 2: Ollama Vision (for handwritten, low-quality scans)
  const ollamaText = await tryOllamaVision(filePath)
  if (ollamaText && ollamaText.length > 20) {
    return { text: ollamaText, method: 'ollama-vision', confidence: 'medium' }
  }

  // Nothing readable
  return { text: tesseractText || '', method: 'none', confidence: 'low' }
}

async function tryTesseract(filePath) {
  try {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng')
    const { data } = await worker.recognize(filePath)
    await worker.terminate()
    return data.text.trim()
  } catch (err) {
    console.warn('[ocr] Tesseract failed:', err.message)
    return ''
  }
}

async function tryOllamaVision(filePath) {
  try {
    const imageBuffer = fs.readFileSync(filePath)
    const base64 = imageBuffer.toString('base64')

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION_MODEL,
        prompt: 'Read ALL text visible in this image. Output the text exactly as written, preserving formatting. If this is a receipt, invoice, or document, extract every line.',
        images: [base64],
        stream: false,
        options: { temperature: 0.1, num_predict: 2000 }
      }),
      signal: AbortSignal.timeout(120000)
    })

    if (!res.ok) return ''
    const data = await res.json()
    return (data.response || '').trim()
  } catch (err) {
    console.warn('[ocr] Ollama vision failed:', err.message)
    return ''
  }
}

/**
 * Extract text from a PDF file.
 * Uses pdf-parse if available, falls back to page-by-page image conversion.
 */
export async function extractTextFromPdf(filePath) {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const buffer = fs.readFileSync(filePath)
    const data = await pdfParse(buffer)
    if (data.text && data.text.trim().length > 30) {
      return { text: data.text.trim(), method: 'pdf-parse', confidence: 'high' }
    }
  } catch (err) {
    console.warn('[ocr] pdf-parse failed or not installed:', err.message)
  }

  // For scanned PDFs without text layer, we'd need pdf-to-image conversion
  // This is a known limitation on Pi - flag it rather than fail silently
  return { text: '', method: 'none', confidence: 'low' }
}
