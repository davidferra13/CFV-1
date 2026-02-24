'use client'

// HelpSearch — Inline search over a static article list.
// Shows dropdown results as user types. No external API calls.

import { useState } from 'react'
import { Search } from 'lucide-react'

const HELP_ARTICLES = [
  {
    title: 'How to create a new event',
    href: '/help/events',
    keywords: ['event', 'create', 'new', 'add'],
  },
  {
    title: 'Setting up your Stripe payments',
    href: '/help/settings',
    keywords: ['stripe', 'payment', 'setup', 'connect'],
  },
  {
    title: 'Adding and managing clients',
    href: '/help/clients',
    keywords: ['client', 'add', 'manage', 'crm'],
  },
  {
    title: 'Using the Day-Of Protocol (DOP)',
    href: '/help/events',
    keywords: ['dop', 'day of', 'service', 'checklist', 'protocol'],
  },
  {
    title: 'Recording expenses',
    href: '/help/finance',
    keywords: ['expense', 'cost', 'record', 'receipt'],
  },
  {
    title: 'Sending a quote to a client',
    href: '/help/events',
    keywords: ['quote', 'proposal', 'send', 'pricing'],
  },
  {
    title: 'Configuring automations',
    href: '/help/settings',
    keywords: ['automation', 'rule', 'trigger', 'auto'],
  },
  {
    title: 'Loyalty program setup',
    href: '/help/clients',
    keywords: ['loyalty', 'points', 'rewards'],
  },
  {
    title: 'Understanding the event lifecycle',
    href: '/help/events',
    keywords: ['lifecycle', 'status', 'state', 'draft', 'confirmed', 'completed'],
  },
  {
    title: 'Importing existing clients',
    href: '/help/clients',
    keywords: ['import', 'csv', 'upload', 'existing'],
  },
  {
    title: 'Generating a Year-End tax summary',
    href: '/help/finance',
    keywords: ['tax', 'year end', 'summary', 'accountant'],
  },
  {
    title: 'Building menus and recipes',
    href: '/help/culinary',
    keywords: ['menu', 'recipe', 'dish', 'costing', 'culinary'],
  },
  {
    title: 'First steps with ChefFlow',
    href: '/help/onboarding',
    keywords: ['start', 'onboarding', 'setup', 'first', 'begin'],
  },
]

export function HelpSearch() {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const results =
    q.length > 1
      ? HELP_ARTICLES.filter(
          (a) => a.title.toLowerCase().includes(q) || a.keywords.some((k) => k.includes(q))
        )
      : []

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help articles..."
          className="w-full pl-10 pr-4 py-3 border border-stone-600 rounded-xl focus:ring-2 focus:ring-stone-500 focus:outline-none text-sm"
        />
      </div>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-stone-700 rounded-xl shadow-lg z-10 overflow-hidden">
          {results.map((r) => (
            <a
              key={r.title}
              href={r.href}
              className="flex items-center gap-3 px-4 py-3 hover:bg-stone-800 border-b border-stone-800 last:border-0 transition-colors"
            >
              <Search className="h-4 w-4 text-stone-400 flex-shrink-0" />
              <span className="text-sm text-stone-200">{r.title}</span>
            </a>
          ))}
        </div>
      )}

      {q.length > 1 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-stone-700 rounded-xl shadow-lg z-10 px-4 py-3">
          <p className="text-sm text-stone-500">No articles found for "{query}"</p>
        </div>
      )}
    </div>
  )
}
