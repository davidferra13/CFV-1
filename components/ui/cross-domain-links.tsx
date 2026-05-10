'use client'
import Link from 'next/link'

type CrossDomainLink = {
  label: string
  href: string
}

export function CrossDomainLinks({
  links,
  className,
}: {
  links: CrossDomainLink[]
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-xs px-2.5 py-1 rounded-full border border-stone-700 text-stone-400 hover:text-amber-500 hover:border-amber-700/50 transition-colors"
        >
          {link.label}
        </Link>
      ))}
    </div>
  )
}
