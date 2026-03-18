'use client'

import NextImage from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Image as ImageIcon } from '@/components/ui/icons'

type Template = {
  id: string
  name: string
  coverPhotoUrl: string | null
  description: string | null
  basePriceCents: number
  includedServices: string[]
}

type Props = {
  templates: Template[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

export function PackagePicker({ templates, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-stone-300">Choose a Package</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => {
          const isSelected = selectedId === t.id
          return (
            <Card
              key={t.id}
              className={`overflow-hidden cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-brand-500 border-brand-600' : 'hover:border-stone-600'
              }`}
              onClick={() => onSelect(t.id)}
            >
              {t.coverPhotoUrl ? (
                <div className="h-28 bg-stone-800 overflow-hidden relative">
                  <NextImage
                    src={t.coverPhotoUrl}
                    alt={t.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-28 bg-stone-800 flex items-center justify-center relative">
                  <ImageIcon className="h-8 w-8 text-stone-300" />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              )}
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-semibold text-stone-100">{t.name}</h4>
                  <span className="text-sm font-bold text-brand-600">
                    {formatCents(t.basePriceCents)}
                  </span>
                </div>
                {t.description && (
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">{t.description}</p>
                )}
                {t.includedServices.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.includedServices.slice(0, 3).map((s, i) => (
                      <Badge key={i} variant="default">
                        {s}
                      </Badge>
                    ))}
                    {t.includedServices.length > 3 && (
                      <Badge variant="default">+{t.includedServices.length - 3}</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
