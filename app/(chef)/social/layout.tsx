import type { Metadata } from 'next'
import { SocialLayoutTabs } from '@/components/social/social-layout-tabs'

export const metadata: Metadata = {
  title: 'Content Planner',
}

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-0">
      <div className="border-b border-stone-700 bg-stone-900 px-4 py-0 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end gap-1 pt-4 pb-0">
            <div className="flex-1 pb-3">
              <h1 className="text-2xl font-bold text-stone-100">Content Planner</h1>
              <p className="text-sm text-stone-500 mt-0.5">
                Build your year of content once | ChefFlow posts it automatically on every platform.
              </p>
            </div>
          </div>
          <SocialLayoutTabs />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
    </div>
  )
}
