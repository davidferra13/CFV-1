import dynamic from 'next/dynamic'
import Link from 'next/link'
import { AppLogo } from '@/components/branding/app-logo'
import { LAUNCH_MODE } from '@/lib/marketing/launch-mode'
import {
  PLATFORM_AUDIENCE_LABEL,
  PLATFORM_SHORT_DESCRIPTION,
} from '@/lib/marketing/platform-positioning'
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
    <footer className="border-t border-stone-800/30 bg-stone-950/50 backdrop-blur-sm">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 sm:grid-cols-2 lg:grid-cols-6 lg:px-8 lg:py-16">
        {/* Brand */}
        <div className="sm:col-span-2 lg:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <AppLogo />
            <span className="text-base font-display tracking-[-0.04em] text-stone-100">
              ChefFlow
            </span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 tracking-[-0.01em] text-stone-500">
            {PLATFORM_SHORT_DESCRIPTION} ChefFlow also powers the operator back office.
          </p>
        </div>

        {/* Discover */}
        <div>
          <p className="text-sm font-semibold tracking-[-0.01em] text-stone-200">
            {FOOTER_SECTIONS.discover.heading}
          </p>
          <ul className="mt-4 space-y-2">
            {FOOTER_SECTIONS.discover.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm tracking-[-0.01em] text-stone-500 transition-colors hover:text-stone-200"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* For Operators */}
        <div>
          <p className="text-sm font-semibold tracking-[-0.01em] text-stone-200">
            {FOOTER_SECTIONS.forOperators.heading}
          </p>
          <ul className="mt-4 space-y-2">
            {FOOTER_SECTIONS.forOperators.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm tracking-[-0.01em] text-stone-500 transition-colors hover:text-stone-200"
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
                className="text-sm text-brand-400 transition-colors hover:text-brand-300"
              >
                {isBeta ? 'Request operator access' : 'Operator sign up'}
              </Link>
            </li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <p className="text-sm font-semibold tracking-[-0.01em] text-stone-200">
            {FOOTER_SECTIONS.resources.heading}
          </p>
          <ul className="mt-4 space-y-2">
            {FOOTER_SECTIONS.resources.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm tracking-[-0.01em] text-stone-500 transition-colors hover:text-stone-200"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <p className="text-sm font-semibold tracking-[-0.01em] text-stone-200">
            {FOOTER_SECTIONS.company.heading}
          </p>
          <ul className="mt-4 space-y-2">
            {FOOTER_SECTIONS.company.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm tracking-[-0.01em] text-stone-500 transition-colors hover:text-stone-200"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm font-semibold text-stone-100">
            {FOOTER_SECTIONS.legal.heading}
          </p>
          <ul className="mt-3 space-y-2">
            {FOOTER_SECTIONS.legal.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm tracking-[-0.01em] text-stone-500 transition-colors hover:text-stone-200"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter */}
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="text-sm font-semibold tracking-[-0.01em] text-stone-200">Stay Updated</p>
          <p className="mb-3 mt-4 text-sm text-stone-400">
            Short guides for modern food-business operations.
          </p>
          <NewsletterSignup />
        </div>
      </div>
      <div className="border-t border-stone-800/30 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs tracking-[-0.01em] text-stone-600">
            &copy; {year} ChefFlow. All rights reserved.
          </p>
          <p className="text-xs tracking-[-0.01em] text-stone-700">{PLATFORM_SHORT_DESCRIPTION}</p>
        </div>
      </div>
    </footer>
  )
}
