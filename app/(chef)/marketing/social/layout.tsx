import type { Metadata } from 'next'
import { SocialLayoutTabs } from '@/components/social/social-layout-tabs'

export const metadata: Metadata = {
  title: 'Content Planner',
}

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="border-b border-stone-800/70 pb-4">
          <div className="flex items-end gap-1">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-stone-100">Content Planner</h1>
              <p className="mt-0.5 text-sm text-stone-500">
                Build your content calendar. ChefFlow publishes to connected platforms based on what
                each one supports.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <SocialLayoutTabs />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 pb-6">{children}</div>
    </div>
  )
}
