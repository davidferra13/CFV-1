export type NotFoundAudience = 'public' | 'chef' | 'client' | 'admin' | 'demo'

export type RoleRecoveryHome = {
  href: string
  label: string
  description: string
}

export type PathRecoveryContext = {
  eyebrow: string
  title: string
  description: string
  primaryHrefs: string[]
  secondaryTitle: string
  secondaryHrefs: string[]
  searchDefault: string
  reportLabel: string
  nearMatch?: {
    from: string
    to: string
    label: string
  }
}

const NEAR_MATCHES: Record<string, { to: string; label: string }> = {
  '/food-directory': {
    to: '/ingredients',
    label: 'Ingredient Directory',
  },
  '/operators': {
    to: '/for-operators',
    label: 'For Operators',
  },
}

export function getRoleRecoveryHome(role: string | null | undefined): RoleRecoveryHome | null {
  switch (role) {
    case 'client':
      return {
        href: '/my-events',
        label: 'My Events',
        description: 'Return to your client event dashboard.',
      }
    case 'chef':
      return {
        href: '/dashboard',
        label: 'Chef Dashboard',
        description: 'Return to your chef operating dashboard.',
      }
    case 'staff':
      return {
        href: '/staff-dashboard',
        label: 'Staff Dashboard',
        description: 'Return to your assigned workspace.',
      }
    case 'partner':
      return {
        href: '/partner/dashboard',
        label: 'Partner Dashboard',
        description: 'Return to your partner workspace.',
      }
    case 'admin':
      return {
        href: '/admin',
        label: 'Admin',
        description: 'Return to platform administration.',
      }
    default:
      return null
  }
}

export function getPathRecoveryContext(pathname: string): PathRecoveryContext | null {
  const path = normalizePath(pathname)
  const staleRoute = NEAR_MATCHES[path]

  if (staleRoute) {
    return {
      eyebrow: 'Moved link',
      title: 'This link has moved.',
      description: `The old ${path} route is no longer active. The current destination is ${staleRoute.label}.`,
      primaryHrefs: [staleRoute.to, '/'],
      secondaryTitle: 'Related paths',
      secondaryHrefs: ['/chefs', '/book', '/services', '/contact'],
      searchDefault: '',
      reportLabel: 'Report this stale link',
      nearMatch: {
        from: path,
        to: staleRoute.to,
        label: staleRoute.label,
      },
    }
  }

  if (path === '/chef' || path.startsWith('/chef/')) {
    const slug = cleanLastSegment(path)

    return {
      eyebrow: 'Chef profile 404',
      title: 'Chef profile not found.',
      description:
        'That chef profile may be unpublished, renamed, or no longer available in the public directory.',
      primaryHrefs: ['/chefs', '/book'],
      secondaryTitle: 'Recover from a chef link',
      secondaryHrefs: ['/services', '/how-it-works', '/contact', '/'],
      searchDefault: slug,
      reportLabel: 'Report broken chef link',
    }
  }

  if (path === '/ingredient' || path.startsWith('/ingredient/')) {
    const ingredient = cleanLastSegment(path)

    return {
      eyebrow: 'Ingredient 404',
      title: 'Ingredient page not found.',
      description:
        'The ingredient may use a different name, category, or spelling in the public ingredient directory.',
      primaryHrefs: [
        '/ingredients',
        ingredient ? `/ingredients?q=${encodeURIComponent(ingredient)}` : '/ingredients',
      ],
      secondaryTitle: 'Ingredient recovery',
      secondaryHrefs: ['/ingredients', '/services', '/chefs', '/contact'],
      searchDefault: ingredient,
      reportLabel: 'Report broken ingredient link',
    }
  }

  if (path === '/my-events' || path.startsWith('/my-events/')) {
    return {
      eyebrow: 'Event portal 404',
      title: 'Event link not found.',
      description:
        'This event portal link may have expired, changed, or require a different signed-in account.',
      primaryHrefs: ['/my-events', '/contact'],
      secondaryTitle: 'Event recovery',
      secondaryHrefs: ['/my-quotes', '/my-chat', '/book', '/auth/signin'],
      searchDefault: '',
      reportLabel: 'Report broken event link',
    }
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    return {
      eyebrow: 'Admin 404',
      title: 'Admin surface not found.',
      description:
        'That admin route may have been renamed, retired, or moved behind a different system surface.',
      primaryHrefs: ['/admin', '/admin/system'],
      secondaryTitle: 'Admin recovery',
      secondaryHrefs: [
        '/admin/users',
        '/admin/events',
        '/admin/directory',
        '/admin/communications',
      ],
      searchDefault: cleanLastSegment(path),
      reportLabel: 'Report broken admin link',
    }
  }

  return null
}

function normalizePath(pathname: string): string {
  const [withoutQuery] = pathname.split(/[?#]/)
  const path = withoutQuery || '/'
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1).toLowerCase()
  return path.toLowerCase()
}

function cleanLastSegment(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean).at(-1) ?? ''
  return decodeURIComponent(segment).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}
