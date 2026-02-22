import { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { CommandCenterClient } from '@/components/ai/command-center-client'

export const metadata: Metadata = {
  title: 'Ask Remy — ChefFlow',
  description: 'Tell ChefFlow what to do. Multi-step commands, parallel execution, draft-first.',
}

export default async function CommandsPage() {
  await requireChef()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">Ask Remy</h1>
          <p className="mt-1 text-sm text-gray-400">
            Tell me what you need. I&apos;ll handle the research instantly — and form drafts for
            anything outward-facing so you review before anything goes out.
          </p>
        </div>
        <CommandCenterClient />
      </div>
    </div>
  )
}
