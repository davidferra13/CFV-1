import Link from 'next/link'
import type { ProductSurfaceMode } from '@/lib/interface/surface-governance'

type ReleasePortalShellProps = {
  portalLabel: string
  portal: 'chef' | 'client'
  primaryHref: string
  primaryLabel: string
  surfaceMode: ProductSurfaceMode
  children: React.ReactNode
}

export function ReleasePortalShell({
  portalLabel,
  portal,
  primaryHref,
  primaryLabel,
  surfaceMode,
  children,
}: ReleasePortalShellProps) {
  return (
    <div
      className="min-h-screen bg-stone-950 text-stone-100"
      data-cf-portal={portal}
      data-cf-surface={surfaceMode}
    >
      <header className="border-b border-stone-800 bg-stone-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-300"
            >
              ChefFlow Beta
            </Link>
            <p className="mt-1 text-sm text-stone-400">{portalLabel}</p>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href={primaryHref}
              className="rounded-full border border-brand-700 px-4 py-2 text-brand-200 hover:bg-brand-950/60"
            >
              {primaryLabel}
            </Link>
            <Link href="/beta" className="text-stone-400 hover:text-stone-100">
              Request Access
            </Link>
          </nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  )
}
