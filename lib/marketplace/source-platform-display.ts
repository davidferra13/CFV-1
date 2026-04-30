import { MARKETPLACE_CHANNELS } from './platforms'

const DOMAIN_CHANNELS: Array<{ channel: string; domains: string[] }> = [
  { channel: 'take_a_chef', domains: ['takeachef.com', 'privatechefmanager.com'] },
  { channel: 'yhangry', domains: ['yhangry.com'] },
  { channel: 'cozymeal', domains: ['cozymeal.com'] },
  { channel: 'bark', domains: ['bark.com'] },
  { channel: 'thumbtack', domains: ['thumbtack.com'] },
  { channel: 'gigsalad', domains: ['gigsalad.com'] },
  { channel: 'theknot', domains: ['theknot.com', 'weddingwire.com'] },
  { channel: 'privatechefmanager', domains: ['privatechefmanager.com'] },
  { channel: 'hireachef', domains: ['hireachef.com'] },
  { channel: 'cuisineistchef', domains: ['cuisineistchef.com', 'cuisineist.com'] },
  { channel: 'google_business', domains: ['business.google.com'] },
  { channel: 'wix', domains: ['wix.com'] },
]

function hostnameFromUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

export function getSafeSourcePlatformLabel(_channel?: string | null): string {
  return 'Source platform'
}

export function getSafeSourcePlatformBadge(_channel?: string | null): string {
  return 'Source'
}

export function getSafeSourcePlatformBucket(index: number): string {
  return `Source channel ${index + 1}`
}

export function isMarketplaceChannelValue(channel: string | null | undefined): boolean {
  return !!channel && MARKETPLACE_CHANNELS.has(channel)
}

export function inferSourcePlatformChannel(input: {
  pageUrl?: string | null
  pageText?: string | null
  pageLinks?: string[] | null
}): string {
  const hosts = [
    hostnameFromUrl(input.pageUrl),
    ...(input.pageLinks ?? []).map((link) => hostnameFromUrl(link)),
  ].filter((host): host is string => !!host)
  const text = `${input.pageUrl ?? ''}\n${input.pageText ?? ''}\n${(input.pageLinks ?? []).join(
    '\n'
  )}`.toLowerCase()

  for (const candidate of DOMAIN_CHANNELS) {
    if (
      hosts.some((host) =>
        candidate.domains.some((domain) => host === domain || host.endsWith(`.${domain}`))
      )
    ) {
      return candidate.channel
    }

    if (candidate.domains.some((domain) => text.includes(domain))) {
      return candidate.channel
    }
  }

  return 'other'
}
