import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LoyaltyProgramSimulator } from '@/components/loyalty/loyalty-program-simulator'
import { getPublicLoyaltyProgramByChefId } from '@/lib/loyalty/public'

interface Props {
  params: { chefId: string }
  searchParams: { accent?: string; theme?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = await getPublicLoyaltyProgramByChefId(params.chefId)

  return {
    title: program ? `${program.chefName} Loyalty Simulator - ChefFlow` : 'Loyalty Simulator',
    robots: { index: false, follow: false },
  }
}

export default async function EmbedLoyaltyPage({ params, searchParams }: Props) {
  const program = await getPublicLoyaltyProgramByChefId(params.chefId)

  if (!program) {
    notFound()
  }

  const theme = searchParams.theme === 'light' ? 'light' : 'dark'
  const accentColor = searchParams.accent || program.primaryColor || '#e88f47'

  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{
        backgroundColor: theme === 'light' ? program.backgroundColor || '#f5f5f4' : '#09090b',
      }}
    >
      <div className="mx-auto max-w-6xl">
        <LoyaltyProgramSimulator
          title="See exactly how dinners turn into rewards"
          subtitle="Use the live sliders to model party size, repeat dinners, and reward unlocks using this chef's actual loyalty rules."
          config={program.config}
          rewards={program.rewards}
          accentColor={accentColor}
          theme={theme}
          brandName={program.chefName}
          logoUrl={program.logoUrl}
          initialGuestsPerEvent={2}
          initialPlannedEvents={5}
          showPoweredBy={program.showPoweredBy}
        />
      </div>
    </div>
  )
}
