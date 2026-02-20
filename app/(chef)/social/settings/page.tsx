import { requireChef } from '@/lib/auth/get-user'
import { getSocialQueueSettings, getSocialPosts } from '@/lib/social/actions'
import { SocialQueueSettingsForm } from '@/components/social/social-queue-settings-form'

export default async function SocialSettingsPage() {
  await requireChef()

  const settings = await getSocialQueueSettings()
  const posts = await getSocialPosts({ targetYear: settings.target_year })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Queue Settings</h2>
        <p className="text-sm text-stone-500 mt-0.5">
          Configure your posting schedule, then generate your annual content calendar.
        </p>
      </div>
      <SocialQueueSettingsForm settings={settings} postCount={posts.length} />
    </div>
  )
}
