'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  ChefHat,
  Compass,
  Home,
  LayoutDashboard,
  LifeBuoy,
  Search,
  ShieldCheck,
  Store,
  type LucideIcon,
} from 'lucide-react'
import {
  getPathRecoveryContext,
  getRoleRecoveryHome,
  type NotFoundAudience,
} from '@/lib/errors/not-found-recovery'
import { trackDiscoveryEvent } from '@/lib/discovery/track-discovery-click'

type RecoveryLink = {
  href: string
  label: string
  description: string
  icon: LucideIcon
}

type RecoveryPreset = {
  eyebrow: string
  title: string
  description: string
  primary: RecoveryLink[]
  secondaryTitle: string
  secondary: RecoveryLink[]
  utility: RecoveryLink[]
}

type NotFoundRecoveryProps = {
  audience?: NotFoundAudience
  signedInRole?: string | null
}

const linkCatalog: Record<string, RecoveryLink> = {
  '/': {
    href: '/',
    label: 'Home',
    description: 'Return to the ChefFlow homepage.',
    icon: Home,
  },
  '/admin': {
    href: '/admin',
    label: 'Admin Home',
    description: 'Return to the admin overview.',
    icon: LayoutDashboard,
  },
  '/admin/communications': {
    href: '/admin/communications',
    label: 'Communications',
    description: 'Open message and notification controls.',
    icon: LifeBuoy,
  },
  '/admin/directory': {
    href: '/admin/directory',
    label: 'Directory',
    description: 'Manage public listings and operator data.',
    icon: Store,
  },
  '/admin/events': {
    href: '/admin/events',
    label: 'Events',
    description: 'Review event records and operations.',
    icon: CalendarDays,
  },
  '/admin/system': {
    href: '/admin/system',
    label: 'System',
    description: 'Check platform health and operational surfaces.',
    icon: ShieldCheck,
  },
  '/admin/users': {
    href: '/admin/users',
    label: 'Users',
    description: 'Open user and account administration.',
    icon: Search,
  },
  '/auth/signin': {
    href: '/auth/signin',
    label: 'Sign In',
    description: 'Open your ChefFlow workspace.',
    icon: ShieldCheck,
  },
  '/book': {
    href: '/book',
    label: 'Book a Chef',
    description: 'Start an event request and get matched with the right chef.',
    icon: CalendarDays,
  },
  '/chef-dashboard': {
    href: '/dashboard',
    label: 'Chef Dashboard',
    description: 'Return to your operating overview.',
    icon: LayoutDashboard,
  },
  '/chefs': {
    href: '/chefs',
    label: 'Browse Chefs',
    description: 'Explore chef profiles, services, and availability paths.',
    icon: ChefHat,
  },
  '/contact': {
    href: '/contact',
    label: 'Contact Support',
    description: 'Ask for help finding the right page.',
    icon: LifeBuoy,
  },
  '/dashboard': {
    href: '/dashboard',
    label: 'Chef Dashboard',
    description: 'Return to your chef workspace.',
    icon: LayoutDashboard,
  },
  '/events': {
    href: '/events',
    label: 'Events',
    description: 'Open active, upcoming, and completed work.',
    icon: CalendarDays,
  },
  '/for-operators': {
    href: '/for-operators',
    label: 'For Operators',
    description: 'See the ChefFlow operating system for culinary teams.',
    icon: LayoutDashboard,
  },
  '/gift-cards': {
    href: '/gift-cards',
    label: 'Gift Cards',
    description: 'Open gifting options for private chef experiences.',
    icon: Store,
  },
  '/how-it-works': {
    href: '/how-it-works',
    label: 'How It Works',
    description: 'See the path from request to event follow-through.',
    icon: Compass,
  },
  '/ingredients': {
    href: '/ingredients',
    label: 'Ingredient Directory',
    description: 'Search food, ingredient, and sourcing reference pages.',
    icon: Search,
  },
  '/inquiries': {
    href: '/inquiries',
    label: 'Inquiries',
    description: 'Review lead flow and client replies.',
    icon: Compass,
  },
  '/menus': {
    href: '/menus',
    label: 'Menus',
    description: 'Open proposals, drafts, and menu tools.',
    icon: ChefHat,
  },
  '/my-chat': {
    href: '/my-chat',
    label: 'Messages',
    description: 'Open your event messages.',
    icon: LifeBuoy,
  },
  '/my-events': {
    href: '/my-events',
    label: 'My Events',
    description: 'Return to your client event dashboard.',
    icon: CalendarDays,
  },
  '/my-quotes': {
    href: '/my-quotes',
    label: 'My Quotes',
    description: 'Review current quote and proposal links.',
    icon: Store,
  },
  '/partner/dashboard': {
    href: '/partner/dashboard',
    label: 'Partner Dashboard',
    description: 'Return to your partner workspace.',
    icon: LayoutDashboard,
  },
  '/recipes': {
    href: '/recipes',
    label: 'Recipes',
    description: 'Find recipe records and production notes.',
    icon: Search,
  },
  '/services': {
    href: '/services',
    label: 'Services',
    description: 'Compare private dinners, events, meal prep, and recurring work.',
    icon: ChefHat,
  },
  '/settings': {
    href: '/settings',
    label: 'Settings',
    description: 'Manage profile, account, and business configuration.',
    icon: ShieldCheck,
  },
  '/staff-dashboard': {
    href: '/staff-dashboard',
    label: 'Staff Dashboard',
    description: 'Return to your assigned workspace.',
    icon: LayoutDashboard,
  },
}

const presets: Record<NotFoundAudience, RecoveryPreset> = {
  public: {
    eyebrow: 'Status 404',
    title: 'This ChefFlow link is missing.',
    description:
      'The page may have moved, the link may be stale, or the address may have been typed incorrectly.',
    primary: [linkCatalog['/book'], linkCatalog['/chefs']],
    secondaryTitle: 'Popular public paths',
    secondary: [
      linkCatalog['/services'],
      linkCatalog['/ingredients'],
      linkCatalog['/for-operators'],
      linkCatalog['/how-it-works'],
    ],
    utility: [linkCatalog['/'], linkCatalog['/auth/signin'], linkCatalog['/contact']],
  },
  chef: {
    eyebrow: 'Chef workspace 404',
    title: 'That workspace page is not available.',
    description:
      'Use the closest live workspace surface below instead of starting over from the public site.',
    primary: [linkCatalog['/chef-dashboard'], linkCatalog['/events']],
    secondaryTitle: 'Chef workspace paths',
    secondary: [
      linkCatalog['/inquiries'],
      linkCatalog['/menus'],
      linkCatalog['/recipes'],
      linkCatalog['/settings'],
    ],
    utility: [linkCatalog['/'], linkCatalog['/contact']],
  },
  client: {
    eyebrow: 'Client portal 404',
    title: 'That event portal link is not available.',
    description:
      'Use your event hub or start a new request. Tokenized event links can expire or be replaced.',
    primary: [linkCatalog['/my-events'], linkCatalog['/book']],
    secondaryTitle: 'Client paths',
    secondary: [
      linkCatalog['/chefs'],
      linkCatalog['/gift-cards'],
      linkCatalog['/services'],
      linkCatalog['/contact'],
    ],
    utility: [linkCatalog['/'], linkCatalog['/auth/signin']],
  },
  admin: {
    eyebrow: 'Admin 404',
    title: 'That admin surface is not available.',
    description: 'The route may be retired, renamed, or outside your current admin scope.',
    primary: [linkCatalog['/admin'], linkCatalog['/admin/system']],
    secondaryTitle: 'Admin paths',
    secondary: [
      linkCatalog['/admin/users'],
      linkCatalog['/admin/events'],
      linkCatalog['/admin/directory'],
      linkCatalog['/admin/communications'],
    ],
    utility: [linkCatalog['/dashboard'], linkCatalog['/']],
  },
  demo: {
    eyebrow: 'Demo 404',
    title: 'That demo page is not available.',
    description: 'Use a live public path or return to the ChefFlow homepage.',
    primary: [linkCatalog['/'], linkCatalog['/book']],
    secondaryTitle: 'Demo-safe paths',
    secondary: [
      linkCatalog['/chefs'],
      linkCatalog['/services'],
      linkCatalog['/how-it-works'],
      linkCatalog['/contact'],
    ],
    utility: [],
  },
}

export function NotFoundRecovery({
  audience = 'public',
  signedInRole = null,
}: NotFoundRecoveryProps) {
  const pathname = usePathname() ?? '/'
  const [referrer, setReferrer] = useState('')
  const [failedPath, setFailedPath] = useState(pathname)

  useEffect(() => {
    setReferrer(document.referrer)
    setFailedPath(`${window.location.pathname}${window.location.search}`)
  }, [pathname])

  const recovery = useMemo(() => {
    const base = presets[audience]
    const pathContext = getPathRecoveryContext(pathname)
    const roleHome = getRoleRecoveryHome(signedInRole)
    const shouldPromoteRole = audience === 'public' && roleHome
    const roleLink = roleHome
      ? {
          ...roleHome,
          icon: LayoutDashboard,
        }
      : null

    const primary = pathContext
      ? linksFromHrefs(pathContext.primaryHrefs)
      : shouldPromoteRole && roleLink
        ? [roleLink, ...base.primary.filter((link) => link.href !== roleLink.href)].slice(0, 2)
        : base.primary

    return {
      ...base,
      ...(pathContext
        ? {
            eyebrow: pathContext.eyebrow,
            title: pathContext.title,
            description: pathContext.description,
            secondaryTitle: pathContext.secondaryTitle,
            secondary: linksFromHrefs(pathContext.secondaryHrefs),
          }
        : {}),
      primary,
      utility:
        shouldPromoteRole && roleLink
          ? [roleLink, ...base.utility.filter((link) => link.href !== roleLink.href)]
          : base.utility,
      pathContext,
      searchDefault: pathContext?.searchDefault ?? '',
      reportLabel: pathContext?.reportLabel ?? 'Report broken link',
    }
  }, [audience, pathname, signedInRole])

  const reportHref = useMemo(() => buildReportHref(failedPath, referrer), [failedPath, referrer])

  const onRecoveryClick = useCallback(
    (link: RecoveryLink, slot: string) => {
      trackDiscoveryEvent({
        action: 'click',
        itemType: 'story',
        itemValue: `404:${slot}:${link.href}`.slice(0, 100),
        itemLabel: link.label,
        href: link.href,
        destinationPath: link.href,
        eventContext: {
          source: 'not_found_recovery',
          audience,
          failed_path: failedPath,
          referrer: referrer || null,
          slot,
        },
      })
    },
    [audience, failedPath, referrer]
  )

  return (
    <main
      id="main-content"
      className="relative min-h-[100svh] overflow-hidden bg-[var(--surface-0)] px-4 py-8 text-stone-100 sm:px-6 lg:px-8"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
          <section className="rounded-lg border border-stone-700/60 bg-stone-900/72 p-6 shadow-[var(--shadow-overlay)] backdrop-blur sm:p-8">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              {recovery.eyebrow}
            </div>

            <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-stone-50 sm:text-4xl lg:text-5xl">
              {recovery.title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-stone-300">
              {recovery.description}
            </p>
            <p className="mt-4 max-w-xl break-all rounded-lg border border-stone-700/70 bg-stone-950/60 px-3 py-2 text-xs text-stone-400">
              Missing path: {failedPath}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {recovery.primary.map((link, index) => (
                <RecoveryCard
                  key={link.href}
                  link={link}
                  prominent={index === 0}
                  onClick={() => onRecoveryClick(link, `primary_${index + 1}`)}
                />
              ))}
            </div>

            {recovery.pathContext?.nearMatch ? (
              <div className="mt-4 rounded-lg border border-emerald-700/40 bg-emerald-950/25 p-4 text-sm text-emerald-100">
                <p className="font-semibold">
                  Suggested redirect: {recovery.pathContext.nearMatch.from} {'->'}{' '}
                  {recovery.pathContext.nearMatch.to}
                </p>
                <p className="mt-1 text-emerald-200/80">
                  Use {recovery.pathContext.nearMatch.label} for the current page.
                </p>
              </div>
            ) : null}
          </section>

          <section className="space-y-4">
            <SearchRecoveryForm defaultQuery={recovery.searchDefault} onTrack={onRecoveryClick} />

            <div className="rounded-lg border border-stone-700/60 bg-stone-900/58 p-4 backdrop-blur sm:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-400">
                {recovery.secondaryTitle}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {recovery.secondary.map((link, index) => (
                  <RecoveryCard
                    key={`${link.href}-${index}`}
                    link={link}
                    onClick={() => onRecoveryClick(link, `secondary_${index + 1}`)}
                  />
                ))}
              </div>
            </div>

            <nav
              aria-label="Recovery utilities"
              className="grid gap-2 rounded-lg border border-stone-700/60 bg-stone-950/55 p-3 sm:grid-cols-3"
            >
              <Link
                href={reportHref}
                onClick={() =>
                  onRecoveryClick(
                    {
                      href: reportHref,
                      label: recovery.reportLabel,
                      description: 'Send the missing URL and referrer to support.',
                      icon: LifeBuoy,
                    },
                    'report_broken_link'
                  )
                }
                className="group flex min-h-[48px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-300 transition hover:bg-stone-800/80 hover:text-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <LifeBuoy
                  className="h-4 w-4 shrink-0 text-brand-300"
                  aria-hidden="true"
                  strokeWidth={1.8}
                />
                <span>{recovery.reportLabel}</span>
              </Link>
              {recovery.utility.slice(0, 5).map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => onRecoveryClick(link, `utility_${index + 1}`)}
                  className="group flex min-h-[48px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-300 transition hover:bg-stone-800/80 hover:text-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <link.icon
                    className="h-4 w-4 shrink-0 text-brand-300"
                    aria-hidden="true"
                    strokeWidth={1.8}
                  />
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>
          </section>
        </div>
      </div>
    </main>
  )
}

function SearchRecoveryForm({
  defaultQuery,
  onTrack,
}: {
  defaultQuery: string
  onTrack: (link: RecoveryLink, slot: string) => void
}) {
  const forms = [
    {
      action: '/chefs',
      label: 'Search chefs',
      name: 'q',
      placeholder: 'Chef, cuisine, city',
      icon: ChefHat,
    },
    {
      action: '/ingredients',
      label: 'Search ingredients',
      name: 'q',
      placeholder: 'Ingredient or category',
      icon: Search,
    },
    {
      action: '/services',
      label: 'Search services/help',
      name: 'q',
      placeholder: 'Service, setup, booking',
      icon: LifeBuoy,
    },
  ] as const

  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/58 p-4 backdrop-blur sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-400">
        Search from here
      </h2>
      <div className="mt-4 grid gap-3">
        {forms.map((form, index) => (
          <form
            key={form.action}
            action={form.action}
            method="get"
            className="grid gap-2 rounded-lg border border-stone-800 bg-stone-950/55 p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={() =>
              onTrack(
                {
                  href: form.action,
                  label: form.label,
                  description: form.placeholder,
                  icon: form.icon,
                },
                `search_${index + 1}`
              )
            }
          >
            <label className="sr-only" htmlFor={`not-found-${form.name}-${index}`}>
              {form.label}
            </label>
            <div className="flex min-h-11 items-center gap-3 rounded-lg border border-stone-700 bg-stone-900 px-3">
              <form.icon className="h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
              <input
                id={`not-found-${form.name}-${index}`}
                name={form.name}
                defaultValue={defaultQuery}
                placeholder={form.placeholder}
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-100 outline-none placeholder:text-stone-500"
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {form.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  )
}

function RecoveryCard({
  link,
  prominent = false,
  onClick,
}: {
  link: RecoveryLink
  prominent?: boolean
  onClick: () => void
}) {
  const Icon = link.icon

  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={`group flex min-h-[116px] flex-col justify-between rounded-lg border p-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        prominent
          ? 'border-brand-500/70 bg-brand-600 text-white shadow-md hover:bg-brand-700'
          : 'border-stone-700/70 bg-stone-800/54 text-stone-100 hover:border-brand-500/45 hover:bg-stone-800'
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-950/28">
          <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.8} />
        </span>
        <ArrowRight
          className="h-4 w-4 translate-x-0 text-current opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100"
          aria-hidden="true"
        />
      </span>
      <span className="mt-4 block">
        <span className="block text-base font-semibold leading-6">{link.label}</span>
        <span
          className={`mt-1 block text-sm leading-5 ${
            prominent ? 'text-white/82' : 'text-stone-400'
          }`}
        >
          {link.description}
        </span>
      </span>
    </Link>
  )
}

function linksFromHrefs(hrefs: string[]): RecoveryLink[] {
  return hrefs.map((href) => {
    const path = href.split('?')[0] || href
    const catalogLink = linkCatalog[path]
    if (catalogLink) {
      return {
        ...catalogLink,
        href,
      }
    }

    return {
      href,
      label: path,
      description: 'Open this recovery path.',
      icon: Compass,
    }
  })
}

function buildReportHref(path: string, referrer: string): string {
  const params = new URLSearchParams({
    reason: 'broken-link',
    path,
  })

  if (referrer) {
    params.set('referrer', referrer)
  }

  return `/contact?${params.toString()}`
}
