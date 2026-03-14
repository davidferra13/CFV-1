'use client'

import {
  Search,
  Plus,
  Pencil,
  ArrowRight,
  Mail,
  ShieldX,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface CapabilityCategory {
  icon: React.ReactNode
  title: string
  subtitle: string
  color: string
  items: string[]
}

const CAPABILITIES: CapabilityCategory[] = [
  {
    icon: <Search className="h-4 w-4" />,
    title: 'Look Up & Search',
    subtitle: 'Instant — no approval needed',
    color: 'text-emerald-600 bg-emerald-950 dark:bg-emerald-950/50',
    items: [
      'Search for clients by name',
      'List upcoming events or filter by status',
      'Check calendar availability & find open dates',
      'Search recipes and list menus',
      'View financial summaries & monthly snapshots',
      'Search documents and list folders',
      'Search emails, view inbox, read threads',
      'Get client, inquiry, or event details',
      'Client lifetime value & break-even analysis',
      'Dietary/allergy checks & cross-contamination risks',
      'Packing lists, portion calculator, prep timelines',
      'Web search for food trends, suppliers, ideas',
    ],
  },
  {
    icon: <Plus className="h-4 w-4" />,
    title: 'Create & Build',
    subtitle: 'Shows preview — needs your approval',
    color: 'text-blue-600 bg-blue-950 dark:bg-blue-950/50',
    items: [
      'Create clients from a description',
      'Create events from natural language',
      'Create recipes with ingredients',
      'Create menus and link to events',
      'Create quotes with pricing',
      'Log inquiries from any channel',
      'Schedule calls with clients',
      'Create document folders',
      'Log expenses',
      'Create todos and tasks',
    ],
  },
  {
    icon: <Pencil className="h-4 w-4" />,
    title: 'Update & Change',
    subtitle: 'Shows before/after — needs your approval',
    color: 'text-amber-600 bg-amber-950 dark:bg-amber-950/50',
    items: [
      'Update client profiles (dietary, contact, status)',
      'Update event details (date, guests, location)',
      'Update recipes and ingredients',
      'Update menus',
      'Update quotes',
      'Send client invitations',
    ],
  },
  {
    icon: <ArrowRight className="h-4 w-4" />,
    title: 'Move Forward',
    subtitle: 'Shows warnings — needs your approval',
    color: 'text-purple-600 bg-purple-950 dark:bg-purple-950/50',
    items: [
      'Transition events (draft → proposed → accepted → ...)',
      'Transition inquiries (new → quoted → confirmed → ...)',
      'Transition quotes (draft → sent → accepted)',
      'Convert confirmed inquiries into events',
    ],
  },
  {
    icon: <Mail className="h-4 w-4" />,
    title: 'Draft Communications',
    subtitle: 'Draft only — you copy & send manually',
    color: 'text-sky-600 bg-sky-950 dark:bg-sky-950/50',
    items: [
      'Follow-up emails & thank-you notes',
      'Referral & testimonial requests',
      'Quote cover letters & payment reminders',
      'Decline & cancellation responses',
      'Re-engagement emails & milestone recognition',
      'General email drafts & email replies',
    ],
  },
  {
    icon: <ShieldX className="h-4 w-4" />,
    title: 'Off Limits',
    subtitle: 'Remy will explain why & show you how',
    color: 'text-red-600 bg-red-950 dark:bg-red-950/50',
    items: [
      'Financial ledger entries (payments, refunds)',
      'User roles and permissions',
      'Permanent data deletion',
      'Sending emails directly',
    ],
  },
]

interface RemyCapabilitiesPanelProps {
  onClose: () => void
}

export function RemyCapabilitiesPanel({ onClose }: RemyCapabilitiesPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 dark:border-stone-700">
        <div>
          <h3 className="font-semibold text-stone-100 dark:text-stone-100 text-sm">
            What Can Remy Do?
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Everything Remy can help you with
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-stone-500">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {CAPABILITIES.map((cat, i) => {
          const isExpanded = expandedIndex === i
          return (
            <div
              key={i}
              className="rounded-lg border border-stone-700 dark:border-stone-700 overflow-hidden"
            >
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-stone-800 dark:hover:bg-stone-800/50 transition-colors"
              >
                <div className={`rounded-md p-1.5 ${cat.color}`}>{cat.icon}</div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-stone-100 dark:text-stone-100">
                    {cat.title}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">{cat.subtitle}</div>
                </div>
                <span className="text-xs text-stone-400 mr-1">{cat.items.length}</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-stone-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-stone-400" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-stone-800 dark:border-stone-700/50">
                  <ul className="mt-2 space-y-1.5">
                    {cat.items.map((item, j) => (
                      <li
                        key={j}
                        className="text-xs text-stone-400 dark:text-stone-300 flex items-start gap-2"
                      >
                        <span className="text-stone-400 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}

        {/* Tip */}
        <div className="rounded-lg bg-brand-950 dark:bg-brand-950/30 border border-brand-700 dark:border-brand-800 p-3 mt-3">
          <p className="text-xs text-brand-300 dark:text-brand-200">
            <strong>Tip:</strong> Just tell Remy what you need in plain language. "Add a client
            named Sarah" or "Create an event for 12 guests on March 20" — Remy will figure out the
            rest and ask you to confirm before doing anything.
          </p>
        </div>
      </div>

      {/* Back button */}
      <div className="px-4 py-3 border-t border-stone-700 dark:border-stone-700">
        <Button variant="secondary" size="sm" onClick={onClose} className="w-full text-xs">
          Back to Chat
        </Button>
      </div>
    </div>
  )
}
