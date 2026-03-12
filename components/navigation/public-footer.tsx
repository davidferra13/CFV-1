import Link from 'next/link'
import { AppLogo } from '@/components/branding/app-logo'
import { NewsletterSignup } from '@/components/marketing/newsletter-signup'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF } from '@/lib/marketing/launch-mode'
import {
  PLATFORM_AUDIENCE_LABEL,
  PLATFORM_SHORT_DESCRIPTION,
  PLATFORM_TAGLINE,
} from '@/lib/marketing/platform-positioning'

const FOOTER_LINKS = {
  overview: [
    { href: '/', label: 'Why ChefFlow' },
    { href: '/about', label: 'About' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/contact', label: 'Contact' },
  ],
  resources: [
    { href: '/faq', label: 'FAQ' },
    { href: '/blog', label: 'Blog' },
    { href: '/trust', label: 'Trust Center' },
  ],
  legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
  ],
}

export function PublicFooter() {
  const year = new Date().getFullYear()
  const isBeta = LAUNCH_MODE === 'beta'
  const primaryActionLabel = isBeta ? 'Request access' : 'Get started'
  const resourcesLinks = [
    ...FOOTER_LINKS.resources,
    { href: PRIMARY_SIGNUP_HREF, label: primaryActionLabel },
  ]

  return (
    <footer className="border-t border-stone-200 bg-stone-50/60 backdrop-blur-sm dark:border-stone-700/50 dark:bg-stone-950/60">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <AppLogo />
            <span className="text-base font-display tracking-tight text-stone-900 dark:text-stone-100">
              ChefFlow
            </span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Built by a working chef for {PLATFORM_AUDIENCE_LABEL} who need calmer inquiries, cleaner
            event handoffs, and better client memory.
          </p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-brand-600 dark:text-brand-500/80">
            {PLATFORM_TAGLINE}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Overview</p>
          <ul className="mt-4 space-y-2">
            {FOOTER_LINKS.overview.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-stone-500 hover:text-stone-900 transition-colors dark:text-stone-400 dark:hover:text-stone-100"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Resources</p>
          <ul className="mt-4 space-y-2">
            {resourcesLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-stone-500 hover:text-stone-900 transition-colors dark:text-stone-400 dark:hover:text-stone-100"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Stay Updated</p>
          <p className="mt-4 mb-3 text-sm text-stone-500 dark:text-stone-400">
            Occasional notes on pricing, client follow-through, and the operational side of doing
            this work well.
          </p>
          <NewsletterSignup />

          <p className="mt-6 text-sm font-semibold text-stone-900 dark:text-stone-100">Legal</p>
          <ul className="mt-3 space-y-2">
            {FOOTER_LINKS.legal.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-stone-500 hover:text-stone-900 transition-colors dark:text-stone-400 dark:hover:text-stone-100"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-200/50 px-4 py-4 dark:border-stone-600/50 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-stone-500">&copy; {year} ChefFlow. All rights reserved.</p>
          <p className="text-xs text-stone-400 dark:text-stone-600">{PLATFORM_SHORT_DESCRIPTION}</p>
        </div>
      </div>
    </footer>
  )
}
