'use client'

import type { CircleDetail } from '@/lib/hub/circle-detail-actions'
import type { ChannelKey } from './channel-types'
import { findChannelDef } from './channel-types'
import HomeDashboard from './channels/home-dashboard'
import { WhosComingChannel } from './channels/whos-coming'
import { MenuChannel } from './channels/menu-channel'
import { WhatToBringChannel } from './channels/what-to-bring'
import { GettingThereChannel } from './channels/getting-there'
import { GroupDecisionsChannel } from './channels/group-decisions'
import { ThemeVibeChannel } from './channels/theme-vibe'
import { ChatChannel } from './channels/chat-channel'
import { ChefMoneyChannel } from './channels/chef-money'
import { AgreementChannel } from './channels/agreement-channel'

type Props = {
  activeChannel: ChannelKey
  circle: CircleDetail
}

export function ChannelContent({ activeChannel, circle }: Props) {
  const channelDef = findChannelDef(activeChannel)

  if (!channelDef) {
    return <ChannelPlaceholder icon="?" label="Unknown Channel" circleName={circle.name} />
  }

  switch (activeChannel) {
    case 'home':
      return <HomeDashboard circle={circle} />
    case 'whos-coming':
      return <WhosComingChannel circle={circle} />
    case 'menu':
      return <MenuChannel circle={circle} />
    case 'what-to-bring':
      return <WhatToBringChannel circle={circle} />
    case 'getting-there':
      return <GettingThereChannel circle={circle} />
    case 'group-decisions':
      return <GroupDecisionsChannel circle={circle} />
    case 'theme-vibe':
      return <ThemeVibeChannel circle={circle} />
    case 'chat':
      return <ChatChannel circle={circle} />
    case 'chef-money':
      return <ChefMoneyChannel circle={circle} />
    case 'agreement':
      return <AgreementChannel circle={circle} />
    default:
      return (
        <ChannelPlaceholder
          icon={channelDef.icon}
          label={channelDef.label}
          circleName={circle.name}
        />
      )
  }
}

function ChannelPlaceholder({
  icon,
  label,
  circleName,
  subtitle,
}: {
  icon: string
  label: string
  circleName: string
  subtitle?: string
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-stone-700/50 bg-[#313338] px-12 py-10 text-center shadow-lg">
        <span className="text-5xl">{icon}</span>
        <h2 className="text-2xl font-bold text-stone-100">{label}</h2>
        <p className="text-sm text-stone-500">Coming soon to {circleName}</p>
        {subtitle && <p className="text-xs text-stone-600">{subtitle}</p>}
      </div>
    </div>
  )
}
