'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from '@/components/ui/icons'

const STORAGE_KEY = 'cf:dash-section-business'
const COOKIE_NAME = 'cf-dash-bh-loaded'

export function LazyBusinessHealthTrigger() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleExpand() {
    try {
      localStorage.setItem(STORAGE_KEY, 'false')
    } catch {}
    document.cookie = `${COOKIE_NAME}=1; path=/; max-age=86400; SameSite=Lax`
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <section className="dashboard-section-group">
      <button
        type="button"
        onClick={handleExpand}
        disabled={isPending}
        className="group flex w-full items-center gap-3 mb-4 text-left"
      >
        <div className="section-label flex-1 mb-0 pb-0 border-l-0 cursor-pointer group-hover:text-stone-300 transition-colors">
          <span>Business Health, Pricing, and Intelligence</span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-stone-500 transition-transform duration-200 shrink-0 -rotate-90" />
      </button>
      {isPending && (
        <div className="space-y-4 animate-pulse">
          <div className="h-20 bg-stone-900/30 rounded-xl" />
          <div className="h-16 bg-stone-900/30 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 bg-stone-900/30 rounded-xl" />
            <div className="h-14 bg-stone-900/30 rounded-xl" />
          </div>
        </div>
      )}
    </section>
  )
}
