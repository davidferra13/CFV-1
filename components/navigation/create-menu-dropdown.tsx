'use client'

import Link from 'next/link'
import { Plus } from '@/components/ui/icons'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { createDropdownItems } from './nav-config'

const GROUP_LABELS: Record<string, string> = {
  creative: 'Creative',
  pipeline: 'Pipeline',
  operational: 'Operational',
  upload: 'Upload',
}

type CreateMenuDropdownProps = {
  /** Render as a compact icon-only button (rail mode) */
  compact?: boolean
  /** Side for dropdown positioning */
  side?: 'bottom' | 'right'
  /** Align for dropdown positioning */
  align?: 'start' | 'center' | 'end'
}

export function CreateMenuDropdown({
  compact = false,
  side = 'bottom',
  align = 'start',
}: CreateMenuDropdownProps) {
  let lastGroup: string | null = null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button
            className="flex h-10 w-10 items-center justify-center rounded-md text-stone-400 hover:bg-stone-800 hover:text-stone-300 transition-colors"
            title="Create"
            aria-label="Create"
          >
            <Plus className="h-[18px] w-[18px]" weight="bold" />
          </button>
        ) : (
          <button
            className="flex w-full items-center gap-2 rounded-md border border-brand-600/30 bg-brand-950/40 px-3 py-2 text-sm font-medium text-brand-400 hover:bg-brand-950/60 hover:text-brand-300 transition-colors"
            aria-label="Create"
          >
            <Plus className="h-4 w-4" weight="bold" />
            <span>Create</span>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={align}
        sideOffset={8}
        className="z-50 max-h-[80vh] min-w-[240px] overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 p-1 shadow-xl"
      >
        {createDropdownItems.map((item) => {
          const showSeparator = lastGroup !== null && lastGroup !== item.group
          const showGroupLabel = lastGroup !== item.group
          lastGroup = item.group
          const Icon = item.icon
          return (
            <div key={item.href}>
              {showSeparator && <DropdownMenuSeparator className="my-1 h-px bg-stone-700/60" />}
              {showGroupLabel && (
                <p className="px-2.5 pb-1 pt-2 text-xxs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {GROUP_LABELS[item.group] ?? item.group}
                </p>
              )}
              <DropdownMenuItem asChild>
                <Link
                  href={item.href}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-stone-300 outline-none hover:bg-stone-800 hover:text-stone-100 focus:bg-stone-800 focus:text-stone-100 cursor-pointer data-[highlighted]:bg-stone-800 data-[highlighted]:text-stone-100"
                >
                  <Icon className="h-4 w-4 shrink-0 text-stone-500" />
                  <span>{item.label}</span>
                </Link>
              </DropdownMenuItem>
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
