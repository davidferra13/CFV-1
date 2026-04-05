'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

interface OverflowAction {
  label: string
  href: string
}

export function EventActionsOverflow({ actions }: { actions: OverflowAction[] }) {
  if (actions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="shrink-0">
          More
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-1"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[160px] rounded-lg border border-stone-700 bg-stone-900 p-1 shadow-lg"
      >
        {actions.map((action) => (
          <DropdownMenuItem key={action.href} asChild>
            <Link
              href={action.href}
              className="block w-full rounded-md px-3 py-2 text-sm text-stone-200 hover:bg-stone-800 hover:text-stone-100 cursor-pointer"
            >
              {action.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
