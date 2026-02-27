'use server'

// Server actions for text translation
// Wraps LibreTranslate API for use in client components

import {
  translateText,
  translateMenuItems as translateBatch,
} from '@/lib/translate/libre-translate'

export type TranslationResult = {
  original: string
  translated: string
  targetLang: string
}

/**
 * Translate a single text string to a target language.
 * Non-blocking — returns null on failure.
 */
export async function translateSingleText(
  text: string,
  targetLang: string,
  sourceLang = 'en'
): Promise<TranslationResult | null> {
  try {
    if (!text.trim() || !targetLang) return null

    const result = await translateText(text, targetLang, sourceLang)
    if (!result?.translatedText) return null

    return {
      original: text,
      translated: result.translatedText,
      targetLang,
    }
  } catch (err) {
    console.error('[non-blocking] Translation failed:', err)
    return null
  }
}

export type MenuTranslationResult = {
  items: { original: string; translated: string | null }[]
  targetLang: string
}

/**
 * Translate multiple menu item names/descriptions at once.
 * More efficient than translating one at a time.
 * Non-blocking — items that fail get null.
 */
export async function translateMenuItemsBatch(
  items: string[],
  targetLang: string,
  sourceLang = 'en'
): Promise<MenuTranslationResult | null> {
  try {
    if (!items.length || !targetLang) return null

    const translated = await translateBatch(items, targetLang, sourceLang)

    return {
      items: items.map((original, i) => ({
        original,
        translated: translated[i] ?? null,
      })),
      targetLang,
    }
  } catch (err) {
    console.error('[non-blocking] Menu translation failed:', err)
    return null
  }
}
