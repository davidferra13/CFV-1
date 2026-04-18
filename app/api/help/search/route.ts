// AI Help Search API
// POST /api/help/search
// Takes a user question, returns AI-matched help article.
// Requires auth (chef dashboard only).

import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { searchFaqWithAI } from '@/lib/ai/faq-search'

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

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const question = typeof body.question === 'string' ? body.question.trim() : ''

    if (!question || question.length < 3 || question.length > 200) {
      return NextResponse.json({ error: 'Question must be 3-200 characters' }, { status: 400 })
    }

    const result = await searchFaqWithAI(question, HELP_ARTICLES)

    if (!result) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({ found: true, ...result })
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
