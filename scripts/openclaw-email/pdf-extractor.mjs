/**
 * PDF Price Extractor
 * Extracts structured price data from PDF attachments.
 * Uses pdf-parse for text-based PDFs.
 * Falls back to Ollama vision for scanned/image PDFs.
 */

import pdf from 'pdf-parse'
import { readFileSync } from 'fs'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

/**
 * Extract prices from a PDF buffer or file path.
 * Returns array of { product, price, unit, case_size }
 */
export async function extractPricesFromPdf(input) {
  const buffer = typeof input === 'string' ? readFileSync(input) : input

  // Try text extraction first (faster, works for digital PDFs)
  const textResult = await tryTextExtraction(buffer)
  if (textResult.length > 0) return textResult

  // Fall back to Ollama vision for scanned/image PDFs
  return tryOllamaVision(buffer)
}

async function tryTextExtraction(buffer) {
  try {
    const data = await pdf(buffer)
    const text = data.text

    if (!text || text.trim().length < 50) return []

    return parseTextForPrices(text)
  } catch (err) {
    console.warn('[pdf-extractor] Text extraction failed:', err.message)
    return []
  }
}

/**
 * Parse raw text for price patterns.
 * Looks for lines with product names followed by dollar amounts.
 */
function parseTextForPrices(text) {
  const results = []
  const lines = text.split('\n').filter(l => l.trim())

  // Common price patterns:
  // "Chicken Breast Boneless  $4.29/lb"
  // "Ground Beef 80/20    $3.99 per lb"
  // "Salmon Fillet    12.99    lb"
  // "Whole Chicken    $1.89/lb    case 8ct"
  const pricePattern = /^(.+?)\s+\$?([\d,]+\.?\d{0,2})\s*(?:\/|\s*per\s*)?\s*(lb|oz|each|case|ct|gal|qt|pt|dozen|dz|ea|kg|g|liter|l)?/i

  for (const line of lines) {
    const match = line.match(pricePattern)
    if (!match) continue

    const product = match[1].trim()
    const price = parseFloat(match[2].replace(',', ''))
    const unit = (match[3] || 'each').toLowerCase()

    // Skip headers, totals, non-food items
    if (product.length < 3 || product.length > 100) continue
    if (/^(total|subtotal|tax|delivery|shipping|page|date|invoice)/i.test(product)) continue
    if (isNaN(price) || price <= 0 || price > 500) continue

    // Check for case size mentions in the rest of the line
    const caseMatch = line.match(/(\d+x\d+\s*(?:lb|oz)|(?:\d+\s*(?:lb|oz)\s*case)|(?:\d+\s*ct))/i)
    const caseSize = caseMatch ? caseMatch[1] : null

    results.push({
      product,
      price: price.toFixed(2),
      unit: normalizeUnit(unit),
      case_size: caseSize
    })
  }

  return results
}

function normalizeUnit(unit) {
  const map = {
    'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
    'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
    'each': 'each', 'ea': 'each', 'ct': 'each',
    'case': 'case',
    'gal': 'gal', 'gallon': 'gal',
    'qt': 'qt', 'quart': 'qt',
    'pt': 'pt', 'pint': 'pt',
    'dozen': 'dozen', 'dz': 'dozen',
    'kg': 'kg', 'g': 'g',
    'liter': 'liter', 'l': 'liter'
  }
  return map[unit.toLowerCase()] || unit.toLowerCase()
}

async function tryOllamaVision(buffer) {
  try {
    // Check if Ollama has a vision model
    const modelsRes = await fetch(`${OLLAMA_URL}/api/tags`)
    if (!modelsRes.ok) {
      console.warn('[pdf-extractor] Ollama not reachable, skipping vision extraction')
      return []
    }
    const models = await modelsRes.json()
    const visionModel = models.models?.find(m =>
      /llava|moondream|bakllava/i.test(m.name)
    )

    if (!visionModel) {
      console.warn('[pdf-extractor] No vision model available, skipping OCR')
      return []
    }

    // Convert first page to base64 for vision model
    const base64 = buffer.toString('base64')

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: visionModel.name,
        prompt: `Extract all food product prices from this price list document. Return ONLY a JSON array with objects like: [{"product": "name", "price": "X.XX", "unit": "lb/case/each", "case_size": "if applicable"}]. Only include food items. Skip headers, footers, and non-food items.`,
        images: [base64],
        stream: false,
        options: { temperature: 0.1 }
      })
    })

    if (!res.ok) return []
    const data = await res.json()

    // Try to parse JSON from the response
    const jsonMatch = data.response?.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    return JSON.parse(jsonMatch[0])
  } catch (err) {
    console.warn('[pdf-extractor] Ollama vision failed:', err.message)
    return []
  }
}
