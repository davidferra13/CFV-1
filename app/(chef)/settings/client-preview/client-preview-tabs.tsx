'use client'

// Client Preview Tabs — manages tab state, device frame toggle, client selector,
// and async data loading. Delegates rendering to sub-components.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Monitor, Smartphone, ExternalLink, Eye } from '@/components/ui/icons'
import { PublicProfilePreview } from './public-profile-preview'
import { ClientPortalPreview } from './client-portal-preview'
import {
  getPreviewClientEvents,
  getPreviewClientQuotes,
  getPreviewClientLoyaltyStatus,
  type PreviewClient,
} from '@/lib/preview/client-portal-preview-actions'

type Tab = 'public' | 'portal'
type DeviceFrame = 'desktop' | 'mobile'

type PortalData = {
  clientId: string // tracked so we can detect staleness when the client changes while on the Public tab
  events: Awaited<ReturnType<typeof getPreviewClientEvents>>
  quotes: Awaited<ReturnType<typeof getPreviewClientQuotes>>
  loyaltyStatus: Awaited<ReturnType<typeof getPreviewClientLoyaltyStatus>>
  clientName: string
}

type PublicProfileData = {
  chef: {
    display_name: string
    profile_image_url: string | null
    logo_url: string | null
    tagline: string | null
    bio: string | null
    website_url: string | null
    show_website_on_public_profile: boolean
    preferred_inquiry_destination: string | null
    portal_primary_color: string | null
    portal_background_color: string | null
    portal_background_image_url: string | null
  }
  partners: any[]
} | null

type Props = {
  slug: string | null
  publicProfileData: PublicProfileData
  clients: PreviewClient[]
}

export function ClientPreviewTabs({ slug, publicProfileData, clients }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('public')
  const [deviceFrame, setDeviceFrame] = useState<DeviceFrame>('desktop')
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id ?? '')
  const [portalData, setPortalData] = useState<PortalData | null>(null)
  const [isPending, startTransition] = useTransition()

  function loadClientData(clientId: string) {
    const client = clients.find((c) => c.id === clientId)
    if (!client) return

    startTransition(async () => {
      try {
        const [events, quotes, loyaltyStatus] = await Promise.all([
          getPreviewClientEvents(clientId),
          getPreviewClientQuotes(clientId),
          getPreviewClientLoyaltyStatus(clientId),
        ])
        setPortalData({ clientId, events, quotes, loyaltyStatus, clientName: client.full_name })
      } catch (err) {
        toast.error('Failed to load client preview data')
      }
    })
  }

  function handleTabSwitch(tab: Tab) {
    setActiveTab(tab)
    // Load (or reload) when switching to portal if we have no data yet,
    // or if the user changed the client selector while they were on the Public tab.
    if (
      tab === 'portal' &&
      selectedClientId &&
      (!portalData || portalData.clientId !== selectedClientId)
    ) {
      loadClientData(selectedClientId)
    }
  }

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId)
    if (activeTab === 'portal') {
      loadClientData(clientId)
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        {/* Tab switcher */}
        <div className="flex rounded-lg border border-stone-700 bg-stone-900 p-1 gap-1">
          <button
            onClick={() => handleTabSwitch('public')}
            className={[
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === 'public'
                ? 'bg-stone-900 text-white'
                : 'text-stone-400 hover:bg-stone-800',
            ].join(' ')}
          >
            Public Profile
          </button>
          <button
            onClick={() => handleTabSwitch('portal')}
            className={[
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === 'portal'
                ? 'bg-stone-900 text-white'
                : 'text-stone-400 hover:bg-stone-800',
            ].join(' ')}
          >
            Client Portal
          </button>
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-2">
          {/* Device frame toggle */}
          <div className="flex rounded-lg border border-stone-700 bg-stone-900 p-1 gap-1">
            <button
              onClick={() => setDeviceFrame('desktop')}
              title="Desktop view"
              className={[
                'p-1.5 rounded-md transition-colors',
                deviceFrame === 'desktop'
                  ? 'bg-stone-800 text-stone-100'
                  : 'text-stone-400 hover:text-stone-400',
              ].join(' ')}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceFrame('mobile')}
              title="Mobile view"
              className={[
                'p-1.5 rounded-md transition-colors',
                deviceFrame === 'mobile'
                  ? 'bg-stone-800 text-stone-100'
                  : 'text-stone-400 hover:text-stone-400',
              ].join(' ')}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {/* Open live page (public tab only) */}
          {activeTab === 'public' && slug && (
            <a
              href={`/chef/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Live Page
            </a>
          )}
        </div>
      </div>

      {/* Client selector (portal tab only) */}
      {activeTab === 'portal' && clients.length > 0 && (
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-stone-400 flex-shrink-0" />
          <span className="text-sm font-medium text-stone-300">Previewing as:</span>
          <select
            value={selectedClientId}
            onChange={(e) => handleClientChange(e.target.value)}
            className="text-sm border border-stone-700 rounded-lg px-3 py-1.5 bg-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-600 text-stone-200"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} ({c.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Preview mode banner */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-950 px-4 py-2.5 text-sm text-amber-800">
        <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Preview Mode</strong> - This is exactly what your clients see.
          {activeTab === 'portal' &&
            ' Buttons are shown but disabled. No actions can be taken from here.'}
        </span>
      </div>

      {/* Content */}
      {activeTab === 'public' ? (
        <PublicProfilePreview
          slug={slug}
          publicProfileData={publicProfileData}
          deviceFrame={deviceFrame}
        />
      ) : (
        <ClientPortalPreview
          clients={clients}
          selectedClientId={selectedClientId}
          portalData={portalData}
          isPending={isPending}
          deviceFrame={deviceFrame}
        />
      )}
    </div>
  )
}
