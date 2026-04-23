import {
  PUBLIC_MATCHING_EXPLAINER_COPY,
  PUBLIC_MATCHING_FOLLOWUP_COPY,
} from '@/lib/public/public-market-copy'

export type PublicRouteRole =
  | 'consumer_booking'
  | 'consumer_browse'
  | 'consumer_directory'
  | 'consumer_support'
  | 'operator_software'

export type PublicCta = {
  href: string
  label: string
}

export const PUBLIC_PRIMARY_CONSUMER_CTA: PublicCta = {
  href: '/book',
  label: 'Book Now',
}

export const PUBLIC_SECONDARY_CONSUMER_CTA: PublicCta = {
  href: '/chefs',
  label: 'Browse Chefs',
}

export const PUBLIC_SUPPORTING_DIRECTORY_ENTRY: PublicCta = {
  href: '/nearby',
  label: 'Food Directory',
}

export const PUBLIC_DINNER_CIRCLES_ENTRY: PublicCta = {
  href: '/hub',
  label: 'Dinner Circles',
}

export const PUBLIC_OPERATOR_ENTRY: PublicCta = {
  href: '/for-operators',
  label: 'For Operators',
}

export const PUBLIC_ROUTE_ROLE: Record<string, PublicRouteRole> = {
  '/book': 'consumer_booking',
  '/chefs': 'consumer_browse',
  '/nearby': 'consumer_directory',
  '/hub': 'consumer_support',
  '/services': 'consumer_browse',
  '/how-it-works': 'consumer_support',
  '/trust': 'consumer_support',
  '/contact': 'consumer_support',
  '/pricing': 'operator_software',
  '/for-operators': 'operator_software',
  '/for-operators/walkthrough': 'operator_software',
  '/marketplace-chefs': 'operator_software',
}

export const PUBLIC_MATCHED_CHEF_HELPER = PUBLIC_MATCHING_EXPLAINER_COPY

export const PUBLIC_MATCHED_CHEF_FOLLOWUP = PUBLIC_MATCHING_FOLLOWUP_COPY

export const PUBLIC_DIRECTORY_HELPER = 'Looking for restaurants, caterers, or food trucks instead?'
