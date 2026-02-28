import { notFound } from 'next/navigation'
import { getGroupByToken, getGroupMemberCount } from '@/lib/hub/group-actions'
import { JoinGroupForm } from './join-form'

interface Props {
  params: Promise<{ groupToken: string }>
}

export default async function JoinGroupPage({ params }: Props) {
  const { groupToken } = await params
  const group = await getGroupByToken(groupToken)

  if (!group || !group.is_active) {
    notFound()
  }

  const memberCount = await getGroupMemberCount(group.id)

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background:
          group.theme?.background_gradient ?? 'linear-gradient(to bottom, #1c1917, #0c0a09)',
      }}
    >
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-stone-800 bg-stone-900/90 p-8 shadow-2xl backdrop-blur">
          {/* Group preview */}
          <div className="mb-6 text-center">
            {group.emoji && <div className="mb-3 text-5xl">{group.emoji}</div>}
            <h1 className="text-xl font-bold text-stone-100">{group.name}</h1>
            {group.description && (
              <p className="mt-1 text-sm text-stone-400">{group.description}</p>
            )}
            <p className="mt-2 text-xs text-stone-500">
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </p>
          </div>

          <JoinGroupForm groupToken={groupToken} />
        </div>

        <p className="mt-4 text-center text-xs text-stone-600">
          Powered by{' '}
          <span className="font-medium" style={{ color: group.theme?.primary_color ?? '#e88f47' }}>
            ChefFlow
          </span>
        </p>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
