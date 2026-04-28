import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'ChefFlow Sandbox | Editorial Home V2',
  description:
    'An isolated ChefFlow sandbox homepage study with a calm editorial visual system.',
  robots: {
    index: false,
    follow: false,
  },
}

const principles = [
  'Real chef.',
  'Real service pressure.',
  'Only enough product to explain the work.',
] as const

const pictureDirections = [
  {
    number: '01',
    title: 'The last quiet hour before dinner',
    body:
      'A service moment with plated components, prep rhythm, and enough empty space for the operating layer to sit beside the craft.',
    src: '/sandbox/home-v2/plating-prep-real.jpg',
    alt: 'A chef finishes a plated dish in a working kitchen before service',
    credit: 'Photo: Dave H, Pexels',
  },
  {
    number: '02',
    title: 'Chef-operator at the prep table',
    body:
      'A working chef in the actual room where prep, client notes, checklists, and payments become one day of service.',
    src: '/sandbox/home-v2/chef-workspace-real.jpg',
    alt: 'A chef stands at a kitchen prep station with bowls and work surfaces around him',
    credit: 'Photo: Mikhail Nilov, Pexels',
  },
] as const

export default function SandboxHomeV2() {
  return (
    <main className="min-h-screen bg-[#e5ded2] text-[#171615]">
      <section className="relative min-h-[92vh] overflow-hidden">
        <Image
          src="/sandbox/home-v2/chef-window-real.jpg"
          alt="A chef prepares food behind a restaurant window with motion passing across the frame"
          fill
          sizes="100vw"
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(229,222,210,0.08)_0%,rgba(229,222,210,0.20)_42%,rgba(229,222,210,0.78)_72%,rgba(229,222,210,0.96)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-52 bg-[linear-gradient(0deg,rgba(229,222,210,1)_0%,rgba(229,222,210,0)_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[92vh] w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-14">
          <header className="flex items-center justify-between text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#3f4548]/70">
            <span>ChefFlow</span>
            <span>Real photo study</span>
          </header>

          <div className="ml-auto flex flex-1 items-center py-24 md:w-[52%] lg:w-[46%]">
            <div className="max-w-[36rem]">
              <p className="mb-8 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#5d6a70]">
                Ops for Artists
              </p>
              <h1 className="font-display text-[4.25rem] font-bold leading-[0.92] tracking-normal text-[#171615] sm:text-[5.8rem] lg:text-[7.4rem]">
                The work before the room fills.
              </h1>
              <p className="mt-10 max-w-md text-lg leading-8 text-[#3c3a35]">
                ChefFlow should feel like the calm layer under service: inquiries, events,
                prep, money, and memory handled without stealing attention from the chef.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-16 sm:px-10 sm:pb-32 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="ml-auto max-w-2xl">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#5d6a70]">
              Picture rule
            </p>
            <h2 className="mt-8 font-display text-5xl font-bold leading-[1.02] tracking-normal text-[#171615] sm:text-6xl">
              More photography, but still one idea at a time.
            </h2>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#48453e]">
              Keep the set small. One primary hero, then two supporting frames that make the
              operator reality specific: the hour before service and the table where decisions
              become work.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 sm:px-10 sm:pb-32 lg:px-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-24">
          {pictureDirections.map((direction) => (
            <article
              key={direction.number}
              className="grid gap-10 lg:grid-cols-[minmax(0,0.62fr)_minmax(18rem,0.38fr)] lg:items-end"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#d4cabc]">
                <Image
                  src={direction.src}
                  alt={direction.alt}
                  fill
                  sizes="(min-width: 1024px) 62vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="max-w-md lg:pb-8">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#5d6a70]">
                  {direction.number}
                </p>
                <h3 className="mt-6 font-display text-4xl font-bold leading-[1.02] tracking-normal text-[#171615] sm:text-5xl">
                  {direction.title}
                </h3>
                <p className="mt-6 text-base leading-7 text-[#48453e]">{direction.body}</p>
                <p className="mt-8 text-xs uppercase tracking-[0.16em] text-[#70685e]">
                  {direction.credit}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#c9c0b2] px-6 py-24 sm:px-10 sm:py-32 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-xl">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#5d6a70]">
              System
            </p>
            <div className="mt-10 space-y-7">
              {principles.map((principle) => (
                <p
                  key={principle}
                  className="font-display text-4xl font-bold leading-[1.04] tracking-normal text-[#24211d] sm:text-5xl"
                >
                  {principle}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
