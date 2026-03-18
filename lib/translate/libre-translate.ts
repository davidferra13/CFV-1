// LibreTranslate - free, open-source translation API
// https://libretranslate.com/
// No API key required for the public instance
// Self-hostable for unlimited usage

const LIBRE_TRANSLATE_URL = 'https://libretranslate.com'

export interface TranslateResult {
  translatedText: string
  detectedLanguage?: {
    confidence: number
    language: string
  }
}

export interface SupportedLanguage {
  code: string
  name: string
  targets: string[]
}

/** Common languages for private chef menus */
export const MENU_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
] as const

/**
 * Translate text from one language to another.
 * Auto-detects source language if not specified.
 *
 * @param text - Text to translate
 * @param targetLang - Target language code (e.g. 'es', 'fr')
 * @param sourceLang - Source language code (default 'auto' for auto-detect)
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = 'auto'
): Promise<TranslateResult | null> {
  try {
    const res = await fetch(`${LIBRE_TRANSLATE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: sourceLang === 'auto' ? 'auto' : sourceLang,
        target: targetLang,
        format: 'text',
      }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Translate multiple menu items at once.
 * More efficient than translating one at a time.
 */
export async function translateMenuItems(
  items: string[],
  targetLang: string,
  sourceLang = 'en'
): Promise<(string | null)[]> {
  // Batch by joining with a separator, then split results
  // LibreTranslate handles newlines well
  const joined = items.join('\n---\n')

  const result = await translateText(joined, targetLang, sourceLang)
  if (!result) return items.map(() => null)

  return result.translatedText.split('\n---\n').map((t) => t.trim() || null)
}

/**
 * Detect the language of a text string.
 */
export async function detectLanguage(
  text: string
): Promise<{ language: string; confidence: number } | null> {
  try {
    const res = await fetch(`${LIBRE_TRANSLATE_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    return {
      language: data[0].language,
      confidence: data[0].confidence,
    }
  } catch {
    return null
  }
}

/**
 * Get all supported languages from the API.
 */
export async function getSupportedLanguages(): Promise<SupportedLanguage[]> {
  try {
    const res = await fetch(`${LIBRE_TRANSLATE_URL}/languages`, {
      next: { revalidate: 86400 * 7 }, // cache 7 days
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}
