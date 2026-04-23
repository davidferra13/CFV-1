import type { LinkProps } from 'next/link'

type RawMarketingSourceValue = string | string[] | undefined

type MarketingSourceSearchParams =
  | URLSearchParams
  | Record<string, RawMarketingSourceValue>
  | null
  | undefined

type BuildMarketingSourceHrefInput = {
  pathname: string
  sourcePage?: string | null
  sourceCta?: string | null
}

export type MarketingSourceContext = {
  sourcePage?: string
  sourceCta?: string
}

function normalizeValue(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function firstParamValue(value: RawMarketingSourceValue) {
  if (Array.isArray(value)) {
    return value.find((entry) => entry.trim().length > 0)
  }
  return value
}

export function buildMarketingSourceHref({
  pathname,
  sourcePage,
  sourceCta,
}: BuildMarketingSourceHrefInput): LinkProps['href'] {
  const normalizedSourcePage = normalizeValue(sourcePage)
  const normalizedSourceCta = normalizeValue(sourceCta)

  if (!normalizedSourcePage && !normalizedSourceCta) {
    return pathname
  }

  const query: Record<string, string> = {}

  if (normalizedSourcePage) {
    query.source_page = normalizedSourcePage
  }

  if (normalizedSourceCta) {
    query.source_cta = normalizedSourceCta
  }

  return {
    pathname,
    query,
  }
}

export function readMarketingSourceFromSearchParams(
  searchParams: MarketingSourceSearchParams
): MarketingSourceContext {
  if (!searchParams) return {}

  if (searchParams instanceof URLSearchParams) {
    return {
      sourcePage: normalizeValue(searchParams.get('source_page')),
      sourceCta: normalizeValue(searchParams.get('source_cta')),
    }
  }

  return {
    sourcePage: normalizeValue(firstParamValue(searchParams.source_page)),
    sourceCta: normalizeValue(firstParamValue(searchParams.source_cta)),
  }
}
