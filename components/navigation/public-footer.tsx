// Public Footer — Clean, professional
import Link from 'next/link'

export function PublicFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-stone-50 border-t border-stone-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">CF</span>
              </div>
              <span className="text-lg font-semibold text-stone-900">ChefFlow</span>
            </Link>
            <p className="mt-4 text-sm text-stone-500 max-w-md leading-relaxed">
              The calm operating system for private chefs. Manage events, menus, clients,
              and finances in one place.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-4">Navigation</h3>
            <ul className="space-y-2.5">
              {[
                { href: '/', label: 'Home' },
                { href: '/pricing', label: 'Pricing' },
                { href: '/contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-4">Legal</h3>
            <ul className="space-y-2.5">
              {[
                { href: '/privacy', label: 'Privacy Policy' },
                { href: '/terms', label: 'Terms of Service' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-stone-200">
          <p className="text-sm text-stone-400 text-center">
            &copy; {currentYear} ChefFlow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
