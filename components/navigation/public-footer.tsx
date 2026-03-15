import Link from 'next/link'
import { AppLogo } from '@/components/branding/app-logo'
import { NewsletterSignup } from '@/components/marketing/newsletter-signup'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF } from '@/lib/marketing/launch-mode'
import { PLATFORM_SHORT_DESCRIPTION } from '@/lib/marketing/platform-positioning'

const FOOTER_LINKS = {
  discover: [
    { href: '/', label: 'Home' },
    { href: '/chefs', label: 'Explore' },
    { href: '/blog', label: 'Blog' },
    { href: '/contact', label: 'Contact' },
  ],
  forOperators: [
    { href: '/pricing', label: 'Pricing' },
    { href: '/compare', label: 'Compare Plans' },
    { href: '/partner-signup', label: 'Become a Partner' },
  ],
  resources: [
    { href: '/faq', label: 'FAQ' },
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

  return (
    <footer className="border-t border-stone-700/50 bg-stone-950/60 backdrop-blur-sm">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <AppLogo />
            <span className="text-base font-display tracking-tight text-stone-100">ChefFlow</span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-400">
            Discover private chefs, caterers, restaurants, food trucks, and bakeries near you.
            Connect directly with providers and explore what to eat.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-100">Discover</p>
          <ul className="mt-4 space-y-2">
            {FOOTER_LINKS.discover.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-stone-400 transition-colors hover:text-stone-100"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-100">For Operators</p>
          <ul className="mt-4 space-y-2">
            {FOOTER_LINKS.forOperators.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-stone-400 transition-colors hover:text-stone-100"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={PRIMARY_SIGNUP_HREF}
                className="text-sm text-brand-400 transition-colors hover:text-brand-300"
              >
                {isBeta ? 'Join the Beta' : 'List Your Business'}
              </Link>
            </li>
          </ul>

          <p className="mt-6 text-sm font-semibold text-stone-100">Resources</p>
          <ul className="mt-3 space-y-2">
            {FOOTER_LINKS.resources.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-stone-400 transition-colors hover:text-stone-100"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-100">Stay Updated</p>
          <p className="mb-3 mt-4 text-sm text-stone-400">
            Tips and guides for finding great food experiences.
          </p>
          <NewsletterSignup />

          <p className="mt-6 text-sm font-semibold text-stone-100">Legal</p>
          <ul className="mt-3 space-y-2">
            {FOOTER_LINKS.legal.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-stone-400 transition-colors hover:text-stone-100"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-600/50 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-stone-500">&copy; {year} ChefFlow. All rights reserved.</p>
          <p className="text-xs text-stone-600">{PLATFORM_SHORT_DESCRIPTION}</p>
        </div>
      </div>
    </footer>
  )
}
