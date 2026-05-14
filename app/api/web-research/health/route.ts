import { NextResponse } from 'next/server'
import {
  createGoogleCustomSearchProvider,
  createMockWebResearchProvider,
  selectWebResearchProvider,
} from '@/lib/web-research'

export async function GET() {
  const selectedProvider = selectWebResearchProvider()
  const [selected, google, mock] = await Promise.all([
    selectedProvider.healthcheck(),
    createGoogleCustomSearchProvider().healthcheck(),
    createMockWebResearchProvider().healthcheck(),
  ])

  const providers = [selected, google, mock].filter(
    (provider, index, all) => all.findIndex((item) => item.provider === provider.provider) === index
  )

  return NextResponse.json({
    feature: 'trusted-web-research',
    selectedProvider: selected.provider,
    providers,
    safeguards: {
      secretsExposed: false,
      publicBrowseRequiresPublishedCandidate: true,
      reviewRequiredBeforeDurablePromotion: true,
      rawSearchResultsRenderedPublicly: false,
    },
  })
}
