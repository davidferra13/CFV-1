// Menu Selection Cards for Client Portal
// Displays sample menus sent by chef with "Select This Menu" action.
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ExternalLink } from '@/components/ui/icons'

export interface MenuCardData {
  id: string
  title: string
  description: string
  pricePerPerson: string | null
  viewUrl: string
  selectUrl: string
}

interface MenuSelectionCardsProps {
  menus: MenuCardData[]
  inquiryId: string
  clientToken: string
  onSelect?: (menuId: string) => void
}

export function MenuSelectionCards({
  menus,
  inquiryId,
  clientToken,
  onSelect,
}: MenuSelectionCardsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)

  if (!menus || menus.length === 0) return null

  async function handleSelect(menuId: string) {
    setIsSelecting(true)
    setSelectedId(menuId)

    try {
      const res = await fetch('/api/client/select-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId, menuId, clientToken }),
      })

      if (res.ok) {
        onSelect?.(menuId)
      }
    } catch {
      setSelectedId(null)
    } finally {
      setIsSelecting(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Your Chef Sent Menu Options</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {menus.map((menu) => (
          <Card
            key={menu.id}
            className={`relative overflow-hidden transition-all ${
              selectedId === menu.id ? 'ring-2 ring-green-500 bg-green-50' : 'hover:shadow-md'
            }`}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <h4 className="font-medium text-sm leading-tight">{menu.title}</h4>
                {selectedId === menu.id && (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                )}
              </div>

              {menu.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{menu.description}</p>
              )}

              {menu.pricePerPerson && (
                <p className="text-sm font-semibold text-foreground">{menu.pricePerPerson}</p>
              )}

              <div className="flex gap-2 pt-1">
                <a
                  href={menu.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  View Full Menu <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {!selectedId && (
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => handleSelect(menu.id)}
                  disabled={isSelecting}
                >
                  {isSelecting ? 'Selecting...' : 'Select This Menu'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedId && (
        <p className="text-sm text-green-700 font-medium">
          Menu selected. Your chef will prepare a quote based on this menu.
        </p>
      )}
    </div>
  )
}
