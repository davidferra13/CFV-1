import { createAdminClient } from '@/lib/db/admin'
import { COMPARE_PAGES } from '@/lib/marketing/compare-pages'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const FEED_QUERY_TIMEOUT_MS = 5000

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  let chefItems = ''

  try {
    const db: any = createAdminClient()
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('feed query timeout')), FEED_QUERY_TIMEOUT_MS)
    })

    const { data: chefs } = (await Promise.race([
      db
        .from('chefs')
        .select('slug, display_name, tagline, updated_at')
        .not('slug', 'is', null)
        .eq('profile_public', true),
      timeoutPromise,
    ])) as {
      data: Array<{
        slug: string
        display_name: string
        tagline: string | null
        updated_at: string | null
      }> | null
    }

    if (chefs) {
      chefItems = chefs
        .map(
          (chef) => `    <item>
      <title>${escapeXml(chef.display_name)} - Private Chef on ChefFlow</title>
      <link>${BASE_URL}/chef/${escapeXml(chef.slug)}</link>
      <description>${escapeXml(chef.tagline || `View ${chef.display_name}'s profile on ChefFlow.`)}</description>
      <pubDate>${chef.updated_at ? new Date(chef.updated_at).toUTCString() : new Date().toUTCString()}</pubDate>
      <guid isPermaLink="true">${BASE_URL}/chef/${escapeXml(chef.slug)}</guid>
    </item>`
        )
        .join('\n')
    }
  } catch {
    // If DB is unavailable, return feed with static items only
  }

  let eventItems = ''

  try {
    const db: any = createAdminClient()
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('feed query timeout')), FEED_QUERY_TIMEOUT_MS)
    })

    const { data: events } = (await Promise.race([
      db
        .from('events')
        .select('id, title, description, event_date, updated_at, slug')
        .eq('visibility', 'public')
        .eq('status', 'confirmed')
        .order('event_date', { ascending: false })
        .limit(20),
      timeoutPromise,
    ])) as {
      data: Array<{
        id: string
        title: string
        description: string | null
        event_date: string | null
        updated_at: string | null
        slug: string | null
      }> | null
    }

    if (events) {
      eventItems = events
        .map(
          (event) => `    <item>
      <title>${escapeXml(event.title)} - Event on ChefFlow</title>
      <link>${BASE_URL}/events/${escapeXml(event.slug || event.id)}</link>
      <description>${escapeXml(event.description || `${event.title} hosted through ChefFlow.`)}</description>
      <pubDate>${event.event_date ? new Date(event.event_date).toUTCString() : new Date().toUTCString()}</pubDate>
      <guid isPermaLink="true">${BASE_URL}/events/${escapeXml(event.slug || event.id)}</guid>
    </item>`
        )
        .join('\n')
    }
  } catch {
    // Events query failed; continue without event items
  }

  let serviceItems = ''

  try {
    const db: any = createAdminClient()
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('feed query timeout')), FEED_QUERY_TIMEOUT_MS)
    })

    const { data: services } = (await Promise.race([
      db
        .from('services')
        .select('slug, name, description, updated_at')
        .eq('active', true)
        .not('slug', 'is', null)
        .limit(20),
      timeoutPromise,
    ])) as {
      data: Array<{
        slug: string
        name: string
        description: string | null
        updated_at: string | null
      }> | null
    }

    if (services) {
      serviceItems = services
        .map(
          (service) => `    <item>
      <title>${escapeXml(service.name)} - Service on ChefFlow</title>
      <link>${BASE_URL}/services/${escapeXml(service.slug)}</link>
      <description>${escapeXml(service.description || `${service.name} available through ChefFlow.`)}</description>
      <pubDate>${service.updated_at ? new Date(service.updated_at).toUTCString() : new Date().toUTCString()}</pubDate>
      <guid isPermaLink="true">${BASE_URL}/services/${escapeXml(service.slug)}</guid>
    </item>`
        )
        .join('\n')
    }
  } catch {
    // Services query failed; continue without service items
  }

  const compareItems = COMPARE_PAGES.map(
    (page) => `    <item>
      <title>${escapeXml(page.title)}</title>
      <link>${BASE_URL}/compare/${escapeXml(page.slug)}</link>
      <description>${escapeXml(page.summary)}</description>
      <guid isPermaLink="true">${BASE_URL}/compare/${escapeXml(page.slug)}</guid>
    </item>`
  ).join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ChefFlow - Private Chef Network &amp; Events</title>
    <link>${BASE_URL}</link>
    <description>Browse ChefFlow's curated chef network, discover upcoming private dining events, explore services, and find food service providers in the directory.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${chefItems}
${eventItems}
${serviceItems}
${compareItems}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
