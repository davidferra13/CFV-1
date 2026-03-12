'use client'

// Chef Switcher - Dropdown for marketplace clients to switch active chef context.
// Sets a cookie that the server reads to scope client data to a specific chef tenant.

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChefHat, Check } from '@/components/ui/icons'

export type ChefSwitcherOption = {
  tenantId: string
  displayName: string
  profileImageUrl: string | null
}

type Props = {
  chefs: ChefSwitcherOption[]
  activeTenantId: string | null
}

export function ChefSwitcher({ chefs, activeTenantId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activeChef = chefs.find((c) => c.tenantId === activeTenantId) ?? chefs[0] ?? null

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  if (chefs.length <= 1) {
    // Single chef or no chefs: show label only, no dropdown
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-stone-300">
        <ChefHat className="w-4 h-4 text-stone-500" />
        <span className="truncate">{activeChef?.displayName ?? 'No chef selected'}</span>
      </div>
    )
  }

  function handleSelect(tenantId: string) {
    // Set cookie (30 day expiry, path=/)
    document.cookie = `chefflow-active-tenant=${tenantId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
    setOpen(false)
    router.refresh()
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-stone-200 hover:bg-stone-800 rounded-md transition-colors"
      >
        <ChefHat className="w-4 h-4 text-stone-500 shrink-0" />
        <span className="truncate flex-1 text-left">
          {activeChef?.displayName ?? 'Select a chef'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-stone-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-stone-900 border border-stone-700 rounded-md shadow-lg overflow-hidden">
          {chefs.map((chef) => (
            <button
              key={chef.tenantId}
              type="button"
              onClick={() => handleSelect(chef.tenantId)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-stone-200 hover:bg-stone-800 transition-colors text-left"
            >
              <span className="truncate flex-1">{chef.displayName}</span>
              {chef.tenantId === activeTenantId && (
                <Check className="w-4 h-4 text-brand-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
