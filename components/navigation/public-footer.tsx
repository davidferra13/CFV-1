import Link from 'next/link'
import { AppLogo } from '@/components/branding/app-logo'

const FOOTER_LINKS = {
  product: [
    { href: '/', label: 'Home' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/contact', label: 'Contact' },
  ],
  legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
  ],
}

export function PublicFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-stone-700 bg-surface-muted">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <AppLogo />
            <span className="text-base font-display tracking-tight text-stone-100">ChefFlow</span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-400">
            A focused operations system for private chefs who want cleaner workflows, faster client
            response, and predictable revenue.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-100">Product</p>
          <ul className="mt-4 space-y-2">
            {FOOTER_LINKS.product.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-stone-400 hover:text-stone-100">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-100">Legal</p>
          <ul className="mt-4 space-y-2">
            {FOOTER_LINKS.legal.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-stone-400 hover:text-stone-100">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-600/50 py-4">
        <p className="text-center text-xs text-stone-500">
          Copyright {year} ChefFlow. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
