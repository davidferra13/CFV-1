// Smart Import Hub
// Chef-only page for importing clients, recipes, receipts, documents, and files via AI parsing

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Smart Import - ChefFlow' }
import { isAIConfigured } from '@/lib/ai/parse'
import { createServerClient } from '@/lib/supabase/server'
import { SmartImportHub, type ImportMode } from '@/components/import/smart-import-hub'
import { getClientsForHistoricalImport } from '@/lib/events/historical-import-actions'
import { Alert } from '@/components/ui/alert'
import { getTakeAChefIntegrationSettings } from '@/lib/integrations/take-a-chef-settings'

const IMPORT_MODES: ImportMode[] = [
  'brain-dump',
  'csv',
  'past-events',
  'take-a-chef',
  'inquiries',
  'clients',
  'recipe',
  'receipt',
  'document',
  'file-upload',
]

function getInitialMode(mode?: string): ImportMode {
  if (!mode) return 'brain-dump'
  return IMPORT_MODES.includes(mode as ImportMode) ? (mode as ImportMode) : 'brain-dump'
}

async function getEventsForDropdown() {
  const supabase: any = createServerClient()
  const { data } = await supabase
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .order('event_date', { ascending: false })
    .limit(50)

  return data || []
}

export default async function ImportPage({ searchParams }: { searchParams: { mode?: string } }) {
  await requireChef()
  const initialMode = getInitialMode(searchParams.mode)
  const [aiConfigured, events, existingClients, tacSettings] = await Promise.all([
    isAIConfigured(),
    getEventsForDropdown(),
    getClientsForHistoricalImport(),
    getTakeAChefIntegrationSettings(),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Smart Import</h1>
        <p className="text-stone-400 mt-1">
          Paste text, upload photos, or drop files - we&apos;ll pull out the details and let you
          review everything before it saves.
        </p>
      </div>

      {!aiConfigured && (
        <Alert variant="warning" title="Smart Import Not Configured">
          Set the{' '}
          <code className="font-mono text-sm bg-yellow-900 px-1 rounded">GEMINI_API_KEY</code>{' '}
          environment variable to enable parsing. Get a free key at{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener"
            className="underline"
          >
            Google Studio
          </a>
          .
        </Alert>
      )}

      <SmartImportHub
        aiConfigured={aiConfigured}
        events={events}
        existingClients={existingClients}
        initialMode={initialMode}
        defaultTakeAChefCommissionPercent={tacSettings.defaultCommissionPercent}
      />
    </div>
  )
}
