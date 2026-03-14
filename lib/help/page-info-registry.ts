// Page Info Registry - Help content for every page in ChefFlow
// Used by <PageInfoButton /> to show contextual help overlays.
//
// To add help for a new page:
// 1. Add an entry keyed by its route path (e.g., /events)
// 2. For dynamic routes, use [id] (e.g., /events/[id])

export type { PageAnnotation, PageInfoEntry } from './page-info-types'
import type { PageInfoEntry } from './page-info-types'
import { CHEF_PORTAL_CORE_PAGES_PAGE_INFO } from './page-info-sections/01-chef-portal-core-pages'
import { CHEF_PORTAL_EVENTS_PAGE_INFO } from './page-info-sections/02-chef-portal-events'
import { CHEF_PORTAL_INQUIRIES_PAGE_INFO } from './page-info-sections/03-chef-portal-inquiries'
import { CHEF_PORTAL_QUOTES_PAGE_INFO } from './page-info-sections/04-chef-portal-quotes'
import { CHEF_PORTAL_CLIENTS_PAGE_INFO } from './page-info-sections/05-chef-portal-clients'
import { CHEF_PORTAL_FINANCE_PAGE_INFO } from './page-info-sections/06-chef-portal-finance'
import { CHEF_PORTAL_EXPENSES_TOP_LEVEL_PAGE_INFO } from './page-info-sections/07-chef-portal-expenses-top-level'
import { CHEF_PORTAL_CULINARY_PAGE_INFO } from './page-info-sections/08-chef-portal-culinary'
import { CHEF_PORTAL_CALENDAR_PAGE_INFO } from './page-info-sections/09-chef-portal-calendar'
import { CHEF_PORTAL_ANALYTICS_PAGE_INFO } from './page-info-sections/10-chef-portal-analytics'
import { CHEF_PORTAL_MARKETING_PAGE_INFO } from './page-info-sections/11-chef-portal-marketing'
import { CHEF_PORTAL_LEADS_PROSPECTING_PAGE_INFO } from './page-info-sections/12-chef-portal-leads-prospecting'
import { CHEF_PORTAL_SOCIAL_MEDIA_PAGE_INFO } from './page-info-sections/13-chef-portal-social-media'
import { CHEF_PORTAL_STAFF_PAGE_INFO } from './page-info-sections/14-chef-portal-staff'
import { CHEF_PORTAL_PARTNERS_PAGE_INFO } from './page-info-sections/15-chef-portal-partners'
import { CHEF_PORTAL_NETWORK_PAGE_INFO } from './page-info-sections/16-chef-portal-network'
import { CHEF_PORTAL_OPERATIONS_PAGE_INFO } from './page-info-sections/17-chef-portal-operations'
import { CHEF_PORTAL_SAFETY_PAGE_INFO } from './page-info-sections/18-chef-portal-safety'
import { CHEF_PORTAL_SETTINGS_PAGE_INFO } from './page-info-sections/19-chef-portal-settings'
import { CHEF_PORTAL_MISCELLANEOUS_PAGE_INFO } from './page-info-sections/20-chef-portal-miscellaneous'
import { CLIENT_PORTAL_PAGE_INFO } from './page-info-sections/21-client-portal'
import { PUBLIC_PAGES_PAGE_INFO } from './page-info-sections/22-public-pages'
import { ADMIN_PORTAL_PAGE_INFO } from './page-info-sections/23-admin-portal'
import { PARTNER_PORTAL_PAGE_INFO } from './page-info-sections/24-partner-portal'
import { AUTH_PAGES_PAGE_INFO } from './page-info-sections/25-auth-pages'
import { BOOKING_PAGES_PAGE_INFO } from './page-info-sections/26-booking-pages'
import { OTHER_PAGE_INFO } from './page-info-sections/27-other'

export const PAGE_INFO_REGISTRY: Record<string, PageInfoEntry> = {
  ...CHEF_PORTAL_CORE_PAGES_PAGE_INFO,
  ...CHEF_PORTAL_EVENTS_PAGE_INFO,
  ...CHEF_PORTAL_INQUIRIES_PAGE_INFO,
  ...CHEF_PORTAL_QUOTES_PAGE_INFO,
  ...CHEF_PORTAL_CLIENTS_PAGE_INFO,
  ...CHEF_PORTAL_FINANCE_PAGE_INFO,
  ...CHEF_PORTAL_EXPENSES_TOP_LEVEL_PAGE_INFO,
  ...CHEF_PORTAL_CULINARY_PAGE_INFO,
  ...CHEF_PORTAL_CALENDAR_PAGE_INFO,
  ...CHEF_PORTAL_ANALYTICS_PAGE_INFO,
  ...CHEF_PORTAL_MARKETING_PAGE_INFO,
  ...CHEF_PORTAL_LEADS_PROSPECTING_PAGE_INFO,
  ...CHEF_PORTAL_SOCIAL_MEDIA_PAGE_INFO,
  ...CHEF_PORTAL_STAFF_PAGE_INFO,
  ...CHEF_PORTAL_PARTNERS_PAGE_INFO,
  ...CHEF_PORTAL_NETWORK_PAGE_INFO,
  ...CHEF_PORTAL_OPERATIONS_PAGE_INFO,
  ...CHEF_PORTAL_SAFETY_PAGE_INFO,
  ...CHEF_PORTAL_SETTINGS_PAGE_INFO,
  ...CHEF_PORTAL_MISCELLANEOUS_PAGE_INFO,
  ...CLIENT_PORTAL_PAGE_INFO,
  ...PUBLIC_PAGES_PAGE_INFO,
  ...ADMIN_PORTAL_PAGE_INFO,
  ...PARTNER_PORTAL_PAGE_INFO,
  ...AUTH_PAGES_PAGE_INFO,
  ...BOOKING_PAGES_PAGE_INFO,
  ...OTHER_PAGE_INFO,
}
