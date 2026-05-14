import { requireAdmin } from '@/lib/auth/admin'
import {
  createGoogleCustomSearchProvider,
  createMockWebResearchProvider,
  selectWebResearchProvider,
} from './providers'
import {
  getPublishedWebResearchDirectoryRecords,
  listDirectoryListingCandidates,
  listWebResearchAuditEvents,
  listWebResearchJobs,
} from './store'
import type { WebResearchAdminDashboard, WebResearchProviderHealth } from './types'

export async function getWebResearchAdminDashboard(): Promise<WebResearchAdminDashboard> {
  await requireAdmin()

  const selectedProvider = selectWebResearchProvider()
  const [selected, google, mock] = await Promise.all([
    selectedProvider.healthcheck(),
    createGoogleCustomSearchProvider().healthcheck(),
    createMockWebResearchProvider().healthcheck(),
  ])
  const providers = [selected, google, mock].filter(
    (provider, index, all) => all.findIndex((item) => item.provider === provider.provider) === index
  )

  return {
    providers,
    jobs: listWebResearchJobs().slice(0, 20),
    candidates: listDirectoryListingCandidates().slice(0, 50),
    publishedRecords: getPublishedWebResearchDirectoryRecords(),
    auditEvents: listWebResearchAuditEvents().slice(0, 30),
  }
}

export async function getWebResearchProviderHealth(): Promise<WebResearchProviderHealth[]> {
  return (await getWebResearchAdminDashboard()).providers
}
