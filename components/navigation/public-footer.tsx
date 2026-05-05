import dynamic from 'next/dynamic'
import Link from 'next/link'
import { AppLogo } from '@/components/branding/app-logo'
import { LAUNCH_MODE } from '@/lib/marketing/launch-mode'
import { PLATFORM_SHORT_DESCRIPTION } from '@/lib/marketing/platform-positioning'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'
import { FOOTER_SECTIONS } from './public-nav-config'

const NewsletterSignup = dynamic(
  () => import('@/components/marketing/newsletter-signup').then((m) => m.NewsletterSignup),
  {
    ssr: false,
    loading: () => <div className="h-[74px]" aria-hidden="true" />,
  }
)

export function PublicFooter() {
  const year = new Date().getFullYear()
  const isBeta = LAUNCH_MODE === 'beta'

  return (
    <footer className="relative overflow-hidden">
      {/* Warm top border */}
      <div className="divider-warm" />

      {/* Subtle warm glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,_rgba(142,74,36,0.06),_transparent_70%)]" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr] lg:gap-16">
          {/* Brand column */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <AppLogo />
              <span className="text-base font-extrabold tracking-tight text-stone-100">
                ChefFlow
              </span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-stone-400">
              {PLATFORM_SHORT_DESCRIPTION}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[#8b7355]">
              The workspace for chef-led food businesses.
            </p>
          </div>

          {/* Product links */}
          <div>
            <p className="text-sm font-semibold text-warm-gradient">Product</p>
            <ul className="mt-5 space-y-3">
              {FOOTER_SECTIONS.discover.links.slice(0, 5).map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-400 transition-colors duration-200 hover:text-[#e8a96b]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={buildMarketingSignupHref({
                    sourcePage: 'footer',
                    sourceCta: 'operator_signup',
                  })}
                  className="text-sm text-[#e8a96b] transition-colors duration-200 hover:text-[#f0c090]"
                >
                  {isBeta ? 'Request operator access' : 'Operator sign up'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company links */}
          <div>
            <p className="text-sm font-semibold text-warm-gradient">Company</p>
            <ul className="mt-5 space-y-3">
              {FOOTER_SECTIONS.company.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-400 transition-colors duration-200 hover:text-[#e8a96b]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {FOOTER_SECTIONS.legal.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-400 transition-colors duration-200 hover:text-[#e8a96b]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <p className="text-sm font-semibold text-warm-gradient">Stay in the loop</p>
            <p className="mt-5 text-sm leading-relaxed text-stone-400">
              Short guides for modern food-business operations.
            </p>
            <div className="mt-4">
              <NewsletterSignup />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="divider-warm" />
      <div className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-[#6b5c4a]">&copy; {year} ChefFlow. All rights reserved.</p>
          <p className="text-xs text-[#5a4d3e]">{PLATFORM_SHORT_DESCRIPTION}</p>
        </div>
      </div>
    </footer>
  )
}
