// Smart Import Hub
// Chef-only page for importing clients, recipes, receipts, documents, and files via AI parsing

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Smart Import - ChefFlow' }
import { isAIConfigured } from '@/lib/ai/parse'
import { createServerClient } from '@/lib/supabase/server'
import { SmartImportHub, type ImportMode } from '@/components/import/smart-import-hub'
import { getArchiveInboxStateForTenant } from '@/lib/document-intelligence/service'
import { getClientsForHistoricalImport } from '@/lib/events/historical-import-actions'
import { Alert } from '@/components/ui/alert'
import { getTakeAChefIntegrationSettings } from '@/lib/integrations/take-a-chef-settings'

const IMPORT_MODES: ImportMode[] = [
  'archive',
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
  if (mode === 'file-upload') return 'archive'
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
  const user = await requireChef()
  const initialMode = getInitialMode(searchParams.mode)
  const supabase: any = createServerClient()
  const [aiConfigured, events, existingClients, tacSettings, archiveState] = await Promise.all([
    isAIConfigured(),
    getEventsForDropdown(),
    getClientsForHistoricalImport(),
    getTakeAChefIntegrationSettings(),
    getArchiveInboxStateForTenant({
      supabase,
      tenantId: user.tenantId!,
      userId: user.id,
    }).catch((error) => {
      console.error('[import-page] archive inbox unavailable', error)
      return null
    }),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Smart Import</h1>
        <p className="text-stone-400 mt-1">
          Paste text, drop archive batches, or upload phone photos. We classify files, route them
          to the right workflow, and let you review before anything saves.
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
        initialArchiveJobId={archiveState?.job.id}
        initialArchiveItems={archiveState?.items ?? []}
        archiveUnavailableReason={
          archiveState
            ? null
            : 'Archive Inbox is unavailable until the document intelligence database migrations are applied.'
        }
        defaultTakeAChefCommissionPercent={tacSettings.defaultCommissionPercent}
      />
    </div>
  )
}
