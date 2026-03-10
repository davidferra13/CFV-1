'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import type { getProposalByToken } from '@/lib/proposal/actions'
import { ProposalHero } from './proposal-hero'
import { ProposalServices } from './proposal-services'
import { ProposalChefInfo } from './proposal-chef-info'
import { ProposalGallery } from './proposal-gallery'
import { ProposalAddons } from './proposal-addons'
import { ProposalPriceSummary } from './proposal-price-summary'
import { ProposalContract } from './proposal-contract'
import { ProposalPayment } from './proposal-payment'
import { ProposalConfirmation } from './proposal-confirmation'

export type ProposalFlowData = Awaited<ReturnType<typeof getProposalByToken>>

// Non-null version (page.tsx checks for null before rendering)
export type ProposalFlowProps = {
  proposal: NonNullable<ProposalFlowData>
  token: string
  paymentStatus?: 'success' | 'cancelled'
}

type FlowStep = 'review' | 'contract' | 'payment' | 'confirmed'

export function ProposalFlow({ proposal, token, paymentStatus }: ProposalFlowProps) {
  // If payment was successful, jump straight to confirmation
  const initialStep: FlowStep = paymentStatus === 'success' ? 'confirmed' : 'review'

  const [step, setStep] = useState<FlowStep>(initialStep)
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>(() =>
    proposal.addons.filter((a) => a.isDefaultSelected).map((a) => a.id)
  )
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const contractRef = useRef<HTMLDivElement>(null)
  const paymentRef = useRef<HTMLDivElement>(null)

  // Compute the effective total in real time
  const { baseTotal, addonTotal, effectiveTotal, depositAmount } = useMemo(() => {
    const base = proposal.quote.totalQuotedCents
    let addons = 0

    for (const addon of proposal.addons) {
      if (selectedAddonIds.includes(addon.id)) {
        if (addon.isPerPerson && proposal.event?.guestCount) {
          addons += addon.priceCents * proposal.event.guestCount
        } else {
          addons += addon.priceCents
        }
      }
    }

    const effective = base + addons

    let deposit = effective
    if (proposal.quote.depositRequired && proposal.quote.depositAmountCents) {
      deposit = proposal.quote.depositAmountCents
    }

    return {
      baseTotal: base,
      addonTotal: addons,
      effectiveTotal: effective,
      depositAmount: deposit,
    }
  }, [selectedAddonIds, proposal])

  const toggleAddon = useCallback((addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    )
  }, [])

  const scrollToContract = useCallback(() => {
    contractRef.current?.scrollIntoView({ behavior: 'smooth' })
    setStep('contract')
  }, [])

  const scrollToPayment = useCallback(() => {
    paymentRef.current?.scrollIntoView({ behavior: 'smooth' })
    setStep('payment')
  }, [])

  // Payment success state
  if (step === 'confirmed' || paymentStatus === 'success') {
    return (
      <ProposalConfirmation
        clientName={proposal.client.name}
        eventDate={proposal.event?.eventDate || null}
        effectiveTotal={effectiveTotal}
        depositAmount={proposal.quote.depositRequired ? depositAmount : null}
      />
    )
  }

  const hasContract = !!proposal.contract?.bodySnapshot
  const hasAddons = proposal.addons.length > 0
  const hasCoverPhoto = !!proposal.quote.coverPhotoUrl
  const hasChefMessage = !!proposal.quote.chefMessage

  // Collect gallery photos from proposal sections
  const galleryPhotos = proposal.proposalSections
    .filter((s) => s.sectionType === 'gallery')
    .flatMap((s) => (s.photoUrls || []).map((url) => ({ url, caption: s.title })))

  // Collect text sections from proposal sections
  const textSections = proposal.proposalSections.filter(
    (s) => s.sectionType === 'text' && s.isVisible
  )

  // Collect testimonial sections
  const testimonialSections = proposal.proposalSections.filter(
    (s) => s.sectionType === 'testimonial' && s.isVisible
  )

  // Whether to use the visual hero or the original header
  const useVisualHero = hasCoverPhoto || hasChefMessage

  return (
    <div className="min-h-screen bg-white pb-32 md:pb-8">
      {/* Hero section (visual with cover photo, or fallback to original header) */}
      {useVisualHero ? (
        <ProposalHero
          coverPhotoUrl={proposal.quote.coverPhotoUrl}
          chefBusinessName={proposal.chef.businessName}
          chefLogoUrl={proposal.chef.logoUrl}
          eventOccasion={proposal.event?.occasion || null}
          eventDate={proposal.event?.eventDate || null}
          guestCount={proposal.event?.guestCount || null}
          locationCity={proposal.event?.locationCity || null}
          locationState={proposal.event?.locationState || null}
          clientName={proposal.client.name}
          chefMessage={proposal.quote.chefMessage}
        />
      ) : (
        <ProposalHero
          coverPhotoUrl={null}
          chefBusinessName={proposal.chef.businessName}
          chefLogoUrl={proposal.chef.logoUrl}
          eventOccasion={proposal.event?.occasion || null}
          eventDate={proposal.event?.eventDate || null}
          guestCount={proposal.event?.guestCount || null}
          locationCity={proposal.event?.locationCity || null}
          locationState={proposal.event?.locationState || null}
          clientName={proposal.client.name}
          chefMessage={null}
        />
      )}

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-10">
        {/* Menu / Services (with photo support) */}
        {proposal.menu && (
          <ProposalServices eventOccasion={proposal.event?.occasion || null} menu={proposal.menu} />
        )}

        {/* Text sections from proposal builder */}
        {textSections.map((section) => (
          <section key={section.id}>
            {section.title && (
              <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h2>
            )}
            {section.bodyText && (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {section.bodyText}
              </p>
            )}
          </section>
        ))}

        {/* About the Chef */}
        <ProposalChefInfo
          businessName={proposal.chef.businessName}
          profileImageUrl={proposal.chef.profileImageUrl}
          logoUrl={proposal.chef.logoUrl}
          bio={proposal.chef.bio}
          tagline={proposal.chef.tagline}
        />

        {/* Testimonials */}
        {testimonialSections.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">What Clients Say</h2>
            <div className="space-y-4">
              {testimonialSections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-5"
                >
                  {section.bodyText && (
                    <p className="text-sm text-gray-700 italic leading-relaxed">
                      &ldquo;{section.bodyText}&rdquo;
                    </p>
                  )}
                  {section.title && (
                    <p className="text-xs text-gray-500 mt-3 font-medium">- {section.title}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Photo Gallery */}
        {galleryPhotos.length > 0 && <ProposalGallery photos={galleryPhotos} />}

        {/* Add-ons */}
        {hasAddons && (
          <ProposalAddons
            addons={proposal.addons}
            selectedAddonIds={selectedAddonIds}
            guestCount={proposal.event?.guestCount || null}
            onToggle={toggleAddon}
          />
        )}

        {/* Contract */}
        {hasContract && (
          <div ref={contractRef}>
            <ProposalContract
              bodySnapshot={proposal.contract!.bodySnapshot!}
              contractStatus={proposal.contract!.status}
              signatureDataUrl={signatureDataUrl}
              onSignatureChange={setSignatureDataUrl}
              agreedToTerms={agreedToTerms}
              onAgreedChange={setAgreedToTerms}
            />
          </div>
        )}

        {/* Payment */}
        <div ref={paymentRef}>
          <ProposalPayment
            token={token}
            effectiveTotal={effectiveTotal}
            depositAmount={proposal.quote.depositRequired ? depositAmount : null}
            selectedAddonIds={selectedAddonIds}
            signatureDataUrl={signatureDataUrl}
            agreedToTerms={hasContract ? agreedToTerms : true}
            hasContract={hasContract}
            onSuccess={() => setStep('confirmed')}
          />
        </div>
      </div>

      {/* Sticky price summary bar */}
      <ProposalPriceSummary
        baseTotal={baseTotal}
        addonTotal={addonTotal}
        effectiveTotal={effectiveTotal}
        depositAmount={proposal.quote.depositRequired ? depositAmount : null}
        hasContract={hasContract}
        step={step}
        onContinueToContract={scrollToContract}
        onContinueToPayment={scrollToPayment}
      />

      {/* Powered by footer */}
      <div className="text-center py-6">
        <p className="text-xs text-gray-400">Powered by ChefFlow</p>
      </div>
    </div>
  )
}
