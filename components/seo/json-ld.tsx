// Reusable JSON-LD structured data components for SEO
// These inject schema.org markup that Google uses for rich snippets

import { COMPANY_NAME, SUPPORT_EMAIL, absoluteUrl } from '@/lib/site/public-site'

type JsonLdProps = {
  data: Record<string, unknown>
}

/** Generic JSON-LD injector - pass any schema.org object */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
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
        url: absoluteUrl('/'),
        logo: absoluteUrl('/logo.jpg'),
        description:
          'The business operating system built by a chef, for chefs. Events, clients, menus, and payments in one calm workspace.',
        foundingDate: '2025',
        sameAs: [],
        contactPoint: {
          '@type': 'ContactPoint',
          email: SUPPORT_EMAIL,
          contactType: 'customer support',
          availableLanguage: 'English',
        },
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
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: absoluteUrl('/'),
        description:
          'Private chef business operating system - manage events, clients, menus, quotes, payments, and kitchen ops from one platform.',
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
        url: absoluteUrl('/'),
        description: 'Ops for Artists - Private chef business operating system',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${absoluteUrl('/chefs')}?q={search_term_string}`,
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
