import Link from 'next/link'
import { AppLogo } from '@/components/branding/app-logo'
import { NewsletterSignup } from '@/components/marketing/newsletter-signup'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF } from '@/lib/marketing/launch-mode'
import {
  PLATFORM_AUDIENCE_LABEL,
  PLATFORM_SHORT_DESCRIPTION,
} from '@/lib/marketing/platform-positioning'

const FOOTER_LINKS = {
  product: [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/contact', label: 'Contact' },
    { href: '/chefs', label: 'Chef Directory' },
  ],
  resources: [
    { href: '/blog', label: 'Blog' },
    { href: '/faq', label: 'FAQ' },
    { href: '/trust', label: 'Trust Center' },
    { href: '/partner-signup', label: 'Become a Partner' },
  ],
  legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
  ],
}

export function PublicFooter() {
  const year = new Date().getFullYear()
  const isBeta = LAUNCH_MODE === 'beta'
  const resourcesLinks = [
    ...FOOTER_LINKS.resources,
    { href: PRIMARY_SIGNUP_HREF, label: isBeta ? 'Join Beta' : 'Sign up' },
  ]

  return (
    <footer className="border-t border-stone-700/50 bg-stone-950/60 backdrop-blur-sm">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <AppLogo />
            <span className="text-base font-display tracking-tight text-stone-100">ChefFlow</span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-400">
            Built for {PLATFORM_AUDIENCE_LABEL}. {PLATFORM_SHORT_DESCRIPTION}
          </p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-brand-500/80">
            Ops for Artists
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-100">Product</p>
          <ul className="mt-4 space-y-2">
            {FOOTER_LINKS.product.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-stone-400 hover:text-stone-100 transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-100">Resources</p>
          <ul className="mt-4 space-y-2">
            {resourcesLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-stone-400 hover:text-stone-100 transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-100">Stay Updated</p>
          <p className="mt-4 mb-3 text-sm text-stone-400">
            Short guides for modern food-business operations.
          </p>
          <NewsletterSignup />

          <p className="mt-6 text-sm font-semibold text-stone-100">Legal</p>
          <ul className="mt-3 space-y-2">
            {FOOTER_LINKS.legal.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-stone-400 hover:text-stone-100 transition-colors"
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
