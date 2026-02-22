import { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { CommandCenterClient } from '@/components/ai/command-center-client'
import { listConversations } from '@/lib/ai/remy-conversation-actions'
import { listRemyArtifacts } from '@/lib/ai/remy-artifact-actions'
import { listRemyMemories } from '@/lib/ai/remy-memory-actions'
import { RemyHubDashboard } from '@/components/ai/remy-hub-dashboard'

export const metadata: Metadata = {
  title: 'Ask Remy — ChefFlow',
  description:
    'Your AI assistant. Commands, conversations, history, memory, and privacy — all in one place.',
}

export default async function CommandsPage() {
  await requireChef()

  // Fetch Remy stats in parallel
  const [convResult, artifactResult, memories] = await Promise.all([
    listConversations({ limit: 5 }).catch(() => ({ conversations: [], total: 0 })),
    listRemyArtifacts({ limit: 1 }).catch(() => ({ artifacts: [], total: 0 })),
    listRemyMemories({ limit: 200 }).catch(() => []),
  ])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hub Dashboard — stats, quick links, recent conversations */}
        <RemyHubDashboard
          recentConversations={convResult.conversations.map((c) => ({
            id: c.id,
            title: c.title,
            lastMessage: c.lastMessage,
            updatedAt: c.updatedAt,
          }))}
          totalConversations={convResult.total}
          totalArtifacts={artifactResult.total}
          totalMemories={memories.length > 0 ? memories.length : 0}
        />

        {/* Command Center */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Command Center</h2>
          <p className="text-sm text-gray-400 mb-4">
            Tell Remy what you need. Multi-step commands run in parallel — drafts always need your
            approval before anything goes out.
          </p>
          <CommandCenterClient />
        </div>
      </div>
    </div>
  )
}
