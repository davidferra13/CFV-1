import Image from 'next/image'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { buildMarketingSourceHref } from '@/lib/marketing/source-links'

const PROOF_SCREENS = [
  {
    src: '/proof/operator-dashboard.png',
    alt: 'ChefFlow operator dashboard with inquiries, events, finance, and command center modules',
    label: 'Workspace live',
    caption: 'Dashboard',
  },
  {
    src: '/proof/operator-inquiries.png',
    alt: 'ChefFlow inquiry view for managing client booking requests',
    label: 'Inquiry received',
    caption: 'Intake',
  },
  {
    src: '/proof/operator-events.png',
    alt: 'ChefFlow events screen for chef-led operator planning',
    label: 'Event confirmed',
    caption: 'Event',
  },
  {
    src: '/proof/operator-payment.png',
    alt: 'ChefFlow payment screen for operator booking proof',
    label: 'Deposit tracked',
    caption: 'Payment',
  },
] as const

export function OperatorProofStack() {
  return (
    <aside className="relative overflow-hidden rounded-[1.75rem] border border-stone-800/50 bg-stone-950/78 p-4 shadow-[0_32px_80px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(237,168,107,0.14),transparent_34%)]" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300/75">
            Real product proof
          </p>
          <h3 className="mt-2 text-xl font-display tracking-[-0.03em] text-stone-100">
            Booking work already moving
          </h3>
        </div>
        <span className="rounded-full border border-stone-800 bg-stone-900/70 px-3 py-1 text-[11px] font-medium text-stone-400">
          Screens
        </span>
      </div>

      <div className="relative mt-5 h-[330px] sm:h-[390px] lg:h-[430px]">
        {PROOF_SCREENS.map((screen, index) => (
          <TrackedLink
            key={screen.src}
            href={buildMarketingSourceHref({
              pathname: '/for-operators',
              sourcePage: 'home',
              sourceCta: `operator_proof_${screen.caption.toLowerCase()}`,
            })}
            analyticsName="home_operator_proof_screen"
            analyticsProps={{ screen: screen.caption }}
            className={[
              'homepage-proof-float group absolute block overflow-hidden rounded-2xl border border-stone-800/70 bg-stone-950 shadow-[0_18px_50px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-700/50',
              index === 0 ? 'left-0 top-0 z-40 w-[86%]' : '',
              index === 1 ? 'right-0 top-[18%] z-30 w-[68%]' : '',
              index === 2 ? 'left-[6%] top-[45%] z-20 w-[64%]' : '',
              index === 3 ? 'right-[4%] top-[63%] z-10 w-[58%]' : '',
            ].join(' ')}
            style={{
              animationDelay: `${index * 1.2}s`,
            }}
          >
            <div className="relative aspect-[16/10] bg-stone-900">
              <Image
                src={screen.src}
                alt={screen.alt}
                fill
                sizes="(min-width: 1024px) 480px, 85vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent px-3 py-2">
                <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-100">
                  {screen.label}
                </span>
                <span className="text-[10px] font-medium text-stone-300">{screen.caption}</span>
              </div>
            </div>
          </TrackedLink>
        ))}
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {[
          ['Inquiry', 'A request enters the workspace with client context.'],
          ['Plan', 'The event, menu, and operational notes stay together.'],
          ['Confirm', 'Payment and status proof sit beside the work.'],
        ].map(([title, detail]) => (
          <div key={title} className="rounded-xl border border-stone-800/60 bg-stone-900/35 p-3.5">
            <p className="text-sm font-semibold tracking-[-0.01em] text-stone-200">{title}</p>
            <p className="mt-1.5 text-xs leading-5 text-stone-500">{detail}</p>
          </div>
        ))}
      </div>
    </aside>
  )
}
