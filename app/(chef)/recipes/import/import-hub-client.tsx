'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RecipeImportDialog } from '@/components/recipes/recipe-import-dialog'
import { RecipeBatchImport } from '@/components/recipes/recipe-batch-import'
import { RecipePhotoBatchImport } from '@/components/recipes/recipe-photo-batch-import'

type Props = {
  aiConfigured: boolean
  visionConfigured: boolean
}

type ImportMethod = {
  id: string
  title: string
  description: string
  icon: string
  badge?: string
  badgeVariant?: 'default' | 'success' | 'warning' | 'info'
  available: boolean
  unavailableReason?: string
}

export function RecipeImportHubClient({ aiConfigured, visionConfigured }: Props) {
  const [photoImportOpen, setPhotoImportOpen] = useState(false)
  const [urlImportOpen, setUrlImportOpen] = useState(false)
  const [batchUrlImportOpen, setBatchUrlImportOpen] = useState(false)

  const methods: ImportMethod[] = [
    {
      id: 'photo-batch',
      title: 'Photo Import',
      description:
        'Drop photos of recipe cards, cookbook pages, handwritten notes, or screenshots. Vision AI extracts everything: name, ingredients, method, times, dietary tags.',
      icon: '\uD83D\uDCF7',
      badge: 'Batch',
      badgeVariant: 'info',
      available: visionConfigured,
      unavailableReason: 'Requires Gemini API key for vision processing',
    },
    {
      id: 'url-batch',
      title: 'Import from URL',
      description:
        'Paste recipe URLs from AllRecipes, Food Network, Epicurious, Bon Appetit, and any site with structured recipe data. Extracts ingredients, method, times automatically. No AI needed.',
      icon: '\uD83C\uDF10',
      badge: 'Batch',
      badgeVariant: 'info',
      available: true,
    },
    {
      id: 'url-single',
      title: 'Quick URL Import',
      description: 'Import a single recipe from a URL. Preview before saving.',
      icon: '\uD83D\uDD17',
      available: true,
    },
    {
      id: 'smart-import',
      title: 'Smart Import (Text)',
      description:
        'Paste or type a recipe. AI parses it into structured data with ingredients, method, times, dietary tags. Edit before saving.',
      icon: '\uD83E\uDDE0',
      available: aiConfigured,
      unavailableReason: 'Requires AI to be configured for text parsing',
    },
    {
      id: 'brain-dump',
      title: 'Brain Dump',
      description:
        'Type everything you know about a recipe in your own words. "It is a diane sauce, you sear the steak, deglaze with cognac..." AI turns it into a structured recipe.',
      icon: '\uD83D\uDCA1',
      available: aiConfigured,
      unavailableReason: 'Requires AI to be configured for text parsing',
    },
    {
      id: 'sprint',
      title: 'Recipe Sprint',
      description:
        'Queue-based rapid capture. Works through your past dishes that have no recipe recorded. Paste text for each one, AI parses, save, next.',
      icon: '\u26A1',
      available: aiConfigured,
      unavailableReason: 'Requires AI to be configured',
    },
  ]

  const handleMethodClick = (id: string) => {
    switch (id) {
      case 'photo-batch':
        setPhotoImportOpen(true)
        break
      case 'url-batch':
        setBatchUrlImportOpen(true)
        break
      case 'url-single':
        setUrlImportOpen(true)
        break
      case 'smart-import':
        window.location.href = '/recipes/new'
        break
      case 'brain-dump':
        window.location.href = '/recipes/dump'
        break
      case 'sprint':
        window.location.href = '/recipes/sprint'
        break
    }
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Import Recipes</h1>
            <p className="text-stone-400 mt-1">
              Get years of recipes into your book. Photos, URLs, text, or brain dumps.
            </p>
          </div>
          <Link href="/recipes">
            <Button variant="ghost">Back to Recipes</Button>
          </Link>
        </div>

        {/* Bulk import highlight */}
        <Card className="border-amber-800/50 bg-gradient-to-r from-amber-950/30 to-stone-900">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl shrink-0">{'\uD83D\uDCE6'}</div>
              <div>
                <h2 className="text-lg font-semibold text-stone-100 mb-1">
                  Bulk Import for Years of Recipes
                </h2>
                <p className="text-sm text-stone-400 mb-3">
                  Have stacks of recipe cards? Bookmarks to recipe sites? Years of menus saved as
                  PDFs? Use Photo Import for physical recipes and URL Import for online recipes.
                  Both support batch processing: drop 50 photos or paste 50 URLs at once.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setPhotoImportOpen(true)}
                    disabled={!visionConfigured}
                  >
                    Photo Import
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setBatchUrlImportOpen(true)}>
                    URL Import
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Method grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {methods.map((method) => (
            <button
              key={method.id}
              onClick={() => method.available && handleMethodClick(method.id)}
              disabled={!method.available}
              className={`text-left p-4 rounded-xl border transition-all ${
                method.available
                  ? 'border-stone-700 hover:border-stone-500 bg-stone-900/50 hover:bg-stone-800/50 cursor-pointer'
                  : 'border-stone-800 bg-stone-900/20 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl shrink-0 mt-0.5">{method.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-stone-200">{method.title}</h3>
                    {method.badge && (
                      <Badge variant={method.badgeVariant || 'default'} className="text-[10px]">
                        {method.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {method.available ? method.description : method.unavailableReason}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Menu import callout */}
        <Card className="border-stone-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="text-xl shrink-0">{'\uD83D\uDCC4'}</div>
              <div className="flex-1">
                <p className="text-sm text-stone-300">
                  <strong>Looking to import menus?</strong> Menu import (PDFs, images, DOCX, text)
                  lives in the Menus section. Drop files there and the system extracts dishes,
                  courses, and dietary tags automatically.
                </p>
              </div>
              <Link href="/menus">
                <Button size="sm" variant="secondary">
                  Go to Menus
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <RecipePhotoBatchImport open={photoImportOpen} onClose={() => setPhotoImportOpen(false)} />
      <RecipeImportDialog open={urlImportOpen} onClose={() => setUrlImportOpen(false)} />
      <RecipeBatchImport open={batchUrlImportOpen} onClose={() => setBatchUrlImportOpen(false)} />
    </>
  )
}
