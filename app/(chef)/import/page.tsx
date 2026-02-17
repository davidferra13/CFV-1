// Smart Import Hub
// Chef-only page for importing clients, recipes, receipts, documents, and files via AI parsing
import { requireChef } from '@/lib/auth/get-user'
import { isAIConfigured } from '@/lib/ai/parse'
import { createServerClient } from '@/lib/supabase/server'
import { SmartImportHub } from '@/components/import/smart-import-hub'
import { Alert } from '@/components/ui/alert'

async function getEventsForDropdown() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .order('event_date', { ascending: false })
    .limit(50)

  return data || []
}

export default async function ImportPage() {
  await requireChef()
  const [aiConfigured, events] = await Promise.all([
    isAIConfigured(),
    getEventsForDropdown(),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Smart Import</h1>
        <p className="text-stone-600 mt-1">
          Paste text, upload photos, or drop files and let AI parse them into structured records.
          Review everything before saving.
        </p>
      </div>

      {!aiConfigured && (
        <Alert variant="warning" title="AI Import Not Configured">
          Set the <code className="font-mono text-sm bg-yellow-100 px-1 rounded">GEMINI_API_KEY</code> environment variable to enable AI-powered parsing. Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="underline">ai.google.dev</a>.
        </Alert>
      )}

      <SmartImportHub aiConfigured={aiConfigured} events={events} />
    </div>
  )
}
