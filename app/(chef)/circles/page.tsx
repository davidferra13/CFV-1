import { getChefCircles } from '@/lib/hub/chef-circle-actions'
import { getChefSocialFeed } from '@/lib/hub/social-feed-actions'
import { getCirclePipelineStats } from '@/lib/hub/circle-pipeline-stats'
import { CirclesPageTabs } from '@/components/hub/circles-page-tabs'
import { CirclesPipelineHeader } from '@/components/hub/circles-pipeline-header'
import { CirclesCommandBriefing } from '@/components/hub/circles-command-briefing'
import { CirclesWorkloadBar } from '@/components/hub/circles-workload-bar'
import { getCirclesMomentum } from '@/lib/hub/chef-circle-actions'
import { CirclesMomentumStrip } from '@/components/hub/circles-momentum-strip'

export const metadata = { title: 'Circles' }

export default async function CirclesPage() {
  const [circles, feedResult, momentum] = await Promise.all([
    getChefCircles(),
    getChefSocialFeed({ limit: 30 }),
    getCirclesMomentum(),
  ])

  const eventIds = circles.map((c) => c.event_id).filter(Boolean) as string[]
  const pipelineStats = await getCirclePipelineStats(eventIds)

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Circles</h1>
        <p className="mt-1 text-sm text-stone-400">
          Your client pipeline, dinner circles, and community groups
        </p>
      </div>

      <CirclesCommandBriefing circles={circles} />

      <CirclesPipelineHeader circles={circles} financials={pipelineStats.financials} />
      <CirclesMomentumStrip data={momentum} />
      <CirclesWorkloadBar workload={pipelineStats.workload} />

      <CirclesPageTabs
        circles={circles}
        feedItems={feedResult.items}
        feedCursor={feedResult.nextCursor}
      />
    </div>
  )
}
