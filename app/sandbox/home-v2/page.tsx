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
  'One quiet moment.',
  'One clear promise.',
  'Enough space for the work to feel considered.',
] as const

export default function SandboxHomeV2() {
  return (
    <main className="min-h-screen bg-[#e5ded2] text-[#171615]">
      <section className="relative min-h-[92vh] overflow-hidden">
        <Image
          src="/sandbox/home-v2/editorial-hero.png"
          alt="A chef plating a small dish beside a window in a quiet, neutral room"
          fill
          sizes="100vw"
          priority
          className="object-cover object-left"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(229,222,210,0.04)_0%,rgba(229,222,210,0.12)_34%,rgba(229,222,210,0.72)_66%,rgba(229,222,210,0.94)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(0deg,rgba(229,222,210,1)_0%,rgba(229,222,210,0)_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[92vh] w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-14">
          <header className="flex items-center justify-between text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#3f4548]/70">
            <span>ChefFlow</span>
            <span>Sandbox study</span>
          </header>

          <div className="ml-auto flex flex-1 items-center py-24 md:w-[54%] lg:w-[48%]">
            <div className="max-w-[38rem]">
              <p className="mb-8 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#5d6a70]">
                Ops for Artists
              </p>
              <h1 className="font-display text-[4.25rem] font-bold leading-[0.92] tracking-normal text-[#171615] sm:text-[5.8rem] lg:text-[7.4rem]">
                Private chef work, made quieter.
              </h1>
              <p className="mt-10 max-w-md text-lg leading-8 text-[#3c3a35]">
                A restrained operating surface for inquiries, events, payments, and the
                details that keep service moving.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-28 pt-16 sm:px-10 sm:pb-36 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="ml-auto max-w-2xl">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#5d6a70]">
              Direction
            </p>
            <h2 className="mt-8 font-display text-5xl font-bold leading-[1.02] tracking-normal text-[#171615] sm:text-6xl">
              Built around the pause before service begins.
            </h2>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#48453e]">
              The homepage should feel less like software asking for attention and more like a
              room where the chef has already started. Copy stays sparse. Navigation stays
              absent. The image does the first impression.
            </p>
          </div>
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
