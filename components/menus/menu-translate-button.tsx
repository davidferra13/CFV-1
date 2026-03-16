'use client'

// Translates menu dish names and descriptions into a selected language.
// Uses LibreTranslate (free, no key). Non-blocking - fails gracefully.

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { translateMenuItemsBatch } from '@/lib/translate/translate-actions'
import { MENU_LANGUAGES } from '@/lib/translate/libre-translate'

type Dish = {
  id: string
  course_name: string
  description: string | null
}

type TranslatedDish = {
  id: string
  courseName: string | null
  description: string | null
}

type Props = {
  dishes: Dish[]
}

export function MenuTranslateButton({ dishes }: Props) {
  const [targetLang, setTargetLang] = useState('')
  const [translations, setTranslations] = useState<TranslatedDish[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)

  const handleTranslate = async () => {
    if (!targetLang || dishes.length === 0) return

    setLoading(true)
    setError(null)
    setTranslations([])

    try {
      // Build a flat list of texts: course_name, then description for each dish
      const texts: string[] = []
      for (const dish of dishes) {
        texts.push(dish.course_name)
        texts.push(dish.description || '')
      }

      const result = await translateMenuItemsBatch(texts, targetLang, 'en')
      if (!result) {
        setError('Translation service unavailable. Try again later.')
        return
      }

      // Pair translated texts back with dishes
      const translated: TranslatedDish[] = []
      for (let i = 0; i < dishes.length; i++) {
        const nameIdx = i * 2
        const descIdx = i * 2 + 1
        translated.push({
          id: dishes[i].id,
          courseName: result.items[nameIdx]?.translated ?? null,
          description: result.items[descIdx]?.translated ?? null,
        })
      }
      setTranslations(translated)
    } catch {
      setError('Translation failed. The service may be temporarily unavailable.')
      toast.error('Translation failed')
    } finally {
      setLoading(false)
    }
  }

  const languageName = MENU_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang

  return (
    <div>
      <Button type="button" variant="secondary" size="sm" onClick={() => setShowPanel(!showPanel)}>
        {showPanel ? 'Hide Translation' : 'Translate Menu'}
      </Button>

      {showPanel && (
        <div className="mt-3 rounded-lg border border-stone-700 bg-stone-800 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={targetLang}
              onChange={(e) => {
                setTargetLang(e.target.value)
                setTranslations([])
              }}
              className="text-sm border border-stone-600 rounded px-2 py-1 bg-stone-900 text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              title="Target language"
            >
              <option value="">Select language...</option>
              {MENU_LANGUAGES.filter((l) => l.code !== 'en').map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleTranslate}
              disabled={loading || !targetLang}
            >
              {loading ? 'Translating...' : 'Translate'}
            </Button>
          </div>

          {error && (
            <p className="text-xs text-amber-600 bg-amber-950 border border-amber-800 rounded px-2 py-1">
              {error}
            </p>
          )}

          {translations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                {languageName} Translation
              </p>
              {translations.map((t) => (
                <div key={t.id} className="rounded border border-stone-700 p-2">
                  {t.courseName && (
                    <p className="text-sm font-medium text-stone-200">{t.courseName}</p>
                  )}
                  {t.description && (
                    <p className="text-xs text-stone-400 mt-0.5">{t.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
