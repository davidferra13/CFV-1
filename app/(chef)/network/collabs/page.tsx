import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getCollabSpaceSummaries } from '@/lib/network/collab-space-actions'
import { getMyConnections } from '@/lib/network/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, MessageSquare, Lock, Plus } from '@/components/ui/icons'
import { CreateSpaceForm } from './create-space-form'

export const metadata: Metadata = { title: 'Private Spaces' }

export default async function CollabSpacesPage() {
  const user = await requireChef()
  const [spaces, connections] = await Promise.all([getCollabSpaceSummaries(50), getMyConnections()])

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Private Spaces</h1>
          <p className="text-sm text-stone-400 mt-1">
            Persistent chef-only spaces for ongoing collaboration. Not a Dinner Circle.
          </p>
        </div>
        <Link href="/network?tab=collab">
          <Button variant="ghost" size="sm">
            Back to Collab
          </Button>
        </Link>
      </div>

      {/* Create Space Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CreateSpaceForm connections={connections} mode="direct" />
        <CreateSpaceForm connections={connections} mode="workspace" />
      </div>

      {/* Existing Spaces */}
      <div>
        <h2 className="text-lg font-semibold text-stone-200 mb-3">Your Spaces</h2>
        {spaces.length === 0 ? (
          <Card className="bg-stone-900 border-stone-700">
            <CardContent className="py-8 text-center">
              <Users className="h-8 w-8 text-stone-500 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">
                No spaces yet. Private Spaces are where recurring chef partnerships live, unlike
                Dinner Circles which are for client coordination.
              </p>
              <p className="text-stone-500 text-xs mt-2">
                Start a direct space with a connected chef, or create a named workspace.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {spaces.map((space) => (
              <Link key={space.id} href={`/network/collabs/${space.id}`} className="block">
                <Card className="bg-stone-900 border-stone-700 hover:border-amber-700/50 transition-colors">
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 h-9 w-9 rounded-full bg-stone-800 flex items-center justify-center">
                        {space.space_type === 'direct' ? (
                          <Users className="h-4 w-4 text-stone-400" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-stone-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-stone-200 truncate">
                            {space.display_name}
                          </span>
                          {space.unread && (
                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-amber-500" />
                          )}
                        </div>
                        {space.last_message_preview && (
                          <p className="text-xs text-stone-500 truncate mt-0.5">
                            {space.last_message_preview}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-500 flex-shrink-0">
                      <span>
                        {space.member_count} member{space.member_count !== 1 ? 's' : ''}
                      </span>
                      <span>{space.thread_count} threads</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
