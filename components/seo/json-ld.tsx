// Reusable JSON-LD structured data components for SEO
// These inject schema.org markup that Google uses for rich snippets

type JsonLdProps = {
  data: Record<string, unknown>
}

/** Generic JSON-LD injector - pass any schema.org object */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

/** Organization schema - used on homepage / root layout */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'ChefFlow',
        url: BASE_URL,
        logo: `${BASE_URL}/logo.jpg`,
        description:
          'The business operating system built by a chef, for chefs. Events, clients, menus, and payments in one calm workspace.',
        foundingDate: '2025',
        sameAs: [],
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'support@cheflowhq.com',
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
        name: 'ChefFlow',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: BASE_URL,
        description:
          'Private chef business operating system - manage events, clients, menus, quotes, payments, and kitchen ops from one platform.',
        offers: {
          '@type': 'Offer',
          price: '29.00',
          priceCurrency: 'USD',
          priceValidUntil: '2027-12-31',
          availability: 'https://schema.org/InStock',
          description: 'Everything You Need - 14-day free trial included',
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
        name: 'ChefFlow',
        url: BASE_URL,
        description: 'Ops for Artists - Private chef business operating system',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${BASE_URL}/chefs?q={search_term_string}`,
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
