'use client'

import { useEffect, useState, useTransition } from 'react'
import { getAllUserWords } from '@/lib/culinary-words/actions'
import type { AdminWordView } from '@/lib/culinary-words/actions'
import { CATEGORY_LABELS } from '@/lib/culinary-words/constants'

export function AdminWordList() {
  const [words, setWords] = useState<AdminWordView[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getAllUserWords()
        setWords(data)
      } catch {
        // Not admin — silently ignore
      } finally {
        setLoading(false)
      }
    })
  }, [])

  if (loading || isPending) {
    return <div className="text-sm text-stone-500 py-4">Loading user submissions...</div>
  }

  if (words.length === 0) {
    return (
      <div className="text-sm text-stone-500 py-4 text-center">
        No user-submitted words yet. When chefs add their own words, they will appear here.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-stone-500 mb-3">
        {words.length} word{words.length !== 1 ? 's' : ''} submitted by users
      </p>
      <div className="border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="text-left px-4 py-2 font-medium text-stone-700">Word</th>
              <th className="text-left px-4 py-2 font-medium text-stone-700">Category</th>
              <th className="text-left px-4 py-2 font-medium text-stone-700">Tier</th>
              <th className="text-left px-4 py-2 font-medium text-stone-700">Added</th>
            </tr>
          </thead>
          <tbody>
            {words.map((w) => (
              <tr key={w.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-2 font-medium text-stone-900">{w.word}</td>
                <td className="px-4 py-2 text-stone-600">{CATEGORY_LABELS[w.category]}</td>
                <td className="px-4 py-2 text-stone-600">T{w.tier}</td>
                <td className="px-4 py-2 text-stone-500">
                  {new Date(w.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
