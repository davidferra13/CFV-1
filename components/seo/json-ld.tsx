// Reusable JSON-LD structured data components for SEO
// These inject schema.org markup that Google uses for rich snippets

import {
  COMPANY_NAME,
  PUBLIC_MARKETPLACE_CONTACT_POINTS,
  PUBLIC_MARKETPLACE_DESCRIPTION,
  PUBLIC_SITE_ALTERNATE_NAMES,
  PUBLIC_SITE_DESCRIPTION,
  absoluteUrl,
  canonicalUrl,
} from '@/lib/site/public-site'

type JsonLdProps = {
  data: Record<string, unknown> | object
}

/** Generic JSON-LD injector - pass any schema.org object */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

/** Organization schema - used on homepage / root layout */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: COMPANY_NAME,
        alternateName: PUBLIC_SITE_ALTERNATE_NAMES,
        url: canonicalUrl('/'),
        logo: absoluteUrl('/logo.jpg'),
        description: PUBLIC_SITE_DESCRIPTION,
        foundingDate: '2025',
        sameAs: [],
        contactPoint: PUBLIC_MARKETPLACE_CONTACT_POINTS,
      }}
    />
  )
}

/** SoftwareApplication schema - used on homepage or pricing page */
export function SoftwareApplicationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: COMPANY_NAME,
        alternateName: PUBLIC_SITE_ALTERNATE_NAMES,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Food marketplace and chef operations software',
        operatingSystem: 'Web',
        url: canonicalUrl('/'),
        description: PUBLIC_SITE_DESCRIPTION,
        publisher: {
          '@type': 'Organization',
          name: COMPANY_NAME,
          url: canonicalUrl('/'),
        },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          description: 'Every feature included, free for all chefs',
        },
        featureList: [
          'Unlimited events & clients',
          'Inquiry-to-payout pipeline',
          'Menus, recipes & food costing',
          'Invoices, payments & expense tracking',
          'Client portal with proposals & approvals',
          'Auto-generated documents',
          'Prep lists & shopping lists',
          'Calendar & scheduling',
        ],
      }}
    />
  )
}

/** FAQPage schema - used on pricing page */
export function FAQPageJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }}
    />
  )
}

/** WebSite schema with SearchAction - enables Google sitelinks search box */
export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: COMPANY_NAME,
        alternateName: PUBLIC_SITE_ALTERNATE_NAMES,
        url: canonicalUrl('/'),
        description: PUBLIC_MARKETPLACE_DESCRIPTION,
        inLanguage: 'en-US',
        publisher: {
          '@type': 'Organization',
          name: COMPANY_NAME,
          url: canonicalUrl('/'),
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${canonicalUrl('/chefs')}?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }}
    />
  )
}

/** BreadcrumbList schema - for nested page navigation */
export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  )
}

/** Person schema - used on /about for founder entity */
export function PersonJsonLd({
  name,
  role,
  description,
  image,
  worksForName,
  worksForUrl,
  sameAs,
}: {
  name: string
  role: string
  description: string
  image?: string | null
  worksForName: string
  worksForUrl: string
  sameAs?: string[]
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Person',
        name,
        jobTitle: role,
        description,
        ...(image ? { image } : {}),
        worksFor: {
          '@type': 'Organization',
          name: worksForName,
          url: worksForUrl,
        },
        sameAs: sameAs ?? [],
      }}
    />
  )
}
