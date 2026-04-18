import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users,
  MessageCircle,
  Award,
  FileText,
  BarChart3,
  Lightbulb,
  Handshake,
} from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Community | ChefFlow' }

const sections = [
  {
    href: '/community/directory',
    label: 'Chef Directory',
    description: 'Browse and discover chefs in the community',
    icon: Users,
  },
  {
    href: '/community/mentorship',
    label: 'Mentorship',
    description: 'Find mentors or mentor other chefs',
    icon: Award,
  },
  {
    href: '/community/subcontracts',
    label: 'Subcontracts',
    description: 'Manage subcontract agreements and COI tracking',
    icon: Handshake,
  },
  {
    href: '/community/messaging',
    label: 'Peer Messaging',
    description: 'Direct messages with community chefs',
    icon: MessageCircle,
  },
  {
    href: '/community/benchmarks',
    label: 'Benchmarks',
    description: 'Anonymous peer benchmarking and metrics',
    icon: BarChart3,
  },
  {
    href: '/community/templates',
    label: 'Templates',
    description: 'Share and discover community templates',
    icon: FileText,
  },
  {
    href: '/community/roadmap',
    label: 'Feature Board',
    description: 'Submit ideas and vote on features',
    icon: Lightbulb,
  },
]

export default async function CommunityPage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Community</h1>
        <p className="text-sm text-stone-400 mt-1">Connect, learn, and grow with other chefs</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="bg-stone-900 border-stone-700 hover:border-stone-500 transition-colors cursor-pointer h-full">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2 bg-amber-900/30 rounded-lg flex-shrink-0">
                  <section.icon className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-100">{section.label}</h3>
                  <p className="text-sm text-stone-400 mt-0.5">{section.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
