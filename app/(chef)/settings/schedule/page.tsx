import { requireChef } from '@/lib/auth/get-user'
import { getScheduleBlocks } from '@/lib/scheduling/schedule-block-actions'
import { ScheduleBlocksManager } from '@/components/settings/schedule-blocks-manager'

export const metadata = { title: 'Schedule Blocks' }

export default async function ScheduleSettingsPage() {
  await requireChef()
  const blocks = await getScheduleBlocks()

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Schedule Blocks</h1>
        <p className="mt-1 text-sm text-stone-400">
          Record your restaurant shifts, personal time, and other commitments so you can see your
          real availability.
        </p>
      </div>

      <ScheduleBlocksManager initialBlocks={blocks} />
    </div>
  )
}
