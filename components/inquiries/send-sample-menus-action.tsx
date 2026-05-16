// Send Sample Menus Action Button
// One-click action on inquiry detail: filter templates, pick menus, send to client.
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Send, Check } from '@/components/ui/icons'
import { getAvailableSampleMenus, sendSampleMenus } from '@/lib/menus/sample-menu-actions'

interface SampleMenu {
  id: string
  title: string
  description: string | null
  occasion: string | null
  pricePerPersonCents: number | null
}

interface SendSampleMenusActionProps {
  inquiryId: string
  occasion?: string | null
}

export function SendSampleMenusAction({ inquiryId, occasion }: SendSampleMenusActionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menus, setMenus] = useState<SampleMenu[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && menus.length === 0) {
      loadMenus()
    }
  }, [isOpen])

  async function loadMenus() {
    const data = await getAvailableSampleMenus(occasion ? { occasion } : undefined)
    setMenus(data)
  }

  function toggleMenu(id: string) {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else if (next.size < 3) {
      next.add(id)
    }
    setSelected(next)
  }

  async function handleSend() {
    if (selected.size === 0) return
    setIsSending(true)
    setError(null)

    const result = await sendSampleMenus(inquiryId, Array.from(selected))

    if (result.success) {
      setSent(true)
    } else {
      setError(result.error || 'Failed to send')
    }
    setIsSending(false)
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700">
        <Check className="h-4 w-4" />
        Sample menus sent to client
      </div>
    )
  }

  if (!isOpen) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)} className="gap-1.5">
        <Send className="h-3.5 w-3.5" />
        Send Sample Menus
      </Button>
    )
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Pick up to 3 menus</span>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>

        {menus.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No menu templates found. Create templates first.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {menus.map((menu) => (
              <label
                key={menu.id}
                className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                  selected.has(menu.id) ? 'bg-blue-100' : 'hover:bg-muted/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(menu.id)}
                  onChange={() => toggleMenu(menu.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block">{menu.title}</span>
                  {menu.pricePerPersonCents && (
                    <span className="text-xs text-muted-foreground">
                      ${(menu.pricePerPersonCents / 100).toFixed(0)}/person
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button
          size="sm"
          onClick={handleSend}
          disabled={selected.size === 0 || isSending}
          className="w-full"
        >
          {isSending ? 'Sending...' : `Send ${selected.size} Menu${selected.size !== 1 ? 's' : ''}`}
        </Button>
      </CardContent>
    </Card>
  )
}
