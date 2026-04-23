import {
  getDirectoryListingTrust,
  type DirectoryFieldTrust,
  type DirectoryListingTrustInput,
} from './trust'

export type NearbyFieldTrustItem = {
  key: 'status' | 'photos' | 'menu' | 'contact' | 'hours'
  label: string
  trust: DirectoryFieldTrust
}

export type NearbyListingTrustModel = {
  showClaimFlow: boolean
  summary: string
  fieldItems: NearbyFieldTrustItem[]
}

function toFieldItem(
  key: NearbyFieldTrustItem['key'],
  label: string,
  trust: DirectoryFieldTrust | null
): NearbyFieldTrustItem | null {
  if (!trust) return null
  return { key, label, trust }
}

export function shouldShowNearbyClaimFlow(status: string): boolean {
  return status === 'discovered'
}

export function buildNearbyListingTrustModel(
  listing: DirectoryListingTrustInput,
  now: Date = new Date()
): NearbyListingTrustModel {
  const trust = getDirectoryListingTrust(listing, { now })

  return {
    showClaimFlow: shouldShowNearbyClaimFlow(listing.status),
    summary: trust.status.evidence,
    fieldItems: [
      toFieldItem('status', 'Status', trust.status),
      toFieldItem('photos', 'Photos', trust.photos),
      toFieldItem('menu', 'Menu', trust.menu),
      toFieldItem('contact', 'Contact info', trust.contact),
      toFieldItem('hours', 'Hours', trust.hours),
    ].filter(Boolean) as NearbyFieldTrustItem[],
  }
}
