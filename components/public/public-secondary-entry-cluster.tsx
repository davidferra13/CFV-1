import Link from 'next/link'
import type { SecondaryEntryLink } from '@/lib/public/public-secondary-entry-config'

interface PublicSecondaryEntryClusterProps {
  links: SecondaryEntryLink[]
  heading?: string
  theme?: 'light' | 'dark'
}

export function PublicSecondaryEntryCluster({
  links,
  heading = 'Not ready yet?',
  theme = 'light',
}: PublicSecondaryEntryClusterProps) {
  if (!links.length) return null

  const isDark = theme === 'dark'

  return (
    <div className={`mt-6 border-t pt-5 ${isDark ? 'border-stone-700/50' : 'border-stone-200'}`}>
      <p
        className={`text-xs font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-stone-500' : 'text-stone-400'}`}
      >
        {heading}
      </p>
      <div className="flex flex-wrap gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`group flex-1 min-w-[140px] rounded-lg border px-4 py-3 transition-colors ${
              isDark
                ? 'border-stone-700 bg-stone-900/60 hover:border-stone-600 hover:bg-stone-800/60'
                : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            <p
              className={`text-sm font-medium transition-colors ${
                isDark
                  ? 'text-stone-300 group-hover:text-stone-100'
                  : 'text-stone-700 group-hover:text-stone-900'
              }`}
            >
              {link.label}
            </p>
            <p
              className={`text-xs mt-0.5 leading-snug ${isDark ? 'text-stone-500' : 'text-stone-400'}`}
            >
              {link.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
