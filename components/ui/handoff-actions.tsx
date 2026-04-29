'use client'

import { useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { toast } from 'sonner'
import {
  copyToClipboard,
  recordHandoffUsage,
  type HandoffKind,
} from '@/lib/handoffs/client-actions'
import {
  buildMailtoHref,
  buildMapsDirectionsHref,
  buildSmsHref,
  buildTelHref,
  normalizeExternalHref,
} from '@/lib/handoffs/links'
import { CalendarPlus, Copy, ExternalLink, Mail, MapPin, MessageCircle, Phone } from './icons'

type HandoffButtonProps = {
  href?: string | null
  label: string
  tooltip: string
  copyValue?: string | null
  external?: boolean
  icon: ComponentType<{ className?: string }>
  kind: HandoffKind
  action?: 'open' | 'copy'
}

function HandoffIconButton({
  href,
  label,
  tooltip,
  copyValue,
  external,
  icon: Icon,
  kind,
  action = href ? 'open' : 'copy',
}: HandoffButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const value = copyValue?.trim()
    if (!value) return
    try {
      const result = await copyToClipboard(value, label, { kind, action, surface: label })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setCopied(true)
      toast.success(`${label} copied`)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`)
    }
  }

  const className =
    'inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-700 bg-stone-900 text-stone-300 transition hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={className}
        onClick={() => recordHandoffUsage(kind, action, label)}
        aria-label={tooltip}
        title={tooltip}
        data-tooltip={tooltip}
      >
        <Icon className="h-4 w-4" />
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!copyValue}
      className={className}
      aria-label={tooltip}
      title={tooltip}
      data-tooltip={tooltip}
    >
      {copied ? <Copy className="h-4 w-4 text-emerald-400" /> : <Icon className="h-4 w-4" />}
    </button>
  )
}

function HandoffText({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <span className={muted ? 'truncate text-stone-500' : 'truncate text-stone-200'}>
      {children}
    </span>
  )
}

export function PhoneHandoff({
  phone,
  smsBody,
  className = '',
}: {
  phone: string | null | undefined
  smsBody?: string
  className?: string
}) {
  if (!phone) return null
  const telHref = buildTelHref(phone)
  const smsHref = buildSmsHref(phone, smsBody)

  return (
    <span className={`inline-flex max-w-full items-center gap-2 ${className}`}>
      <HandoffText>{phone}</HandoffText>
      <span className="inline-flex shrink-0 items-center gap-1">
        <HandoffIconButton href={telHref} label="Phone" tooltip="Call" icon={Phone} kind="phone" />
        <HandoffIconButton
          href={smsHref}
          label="Phone"
          tooltip="Text"
          icon={MessageCircle}
          kind="sms"
        />
        <HandoffIconButton
          label="Phone"
          tooltip="Copy phone"
          copyValue={phone}
          icon={Copy}
          kind="phone"
        />
      </span>
    </span>
  )
}

export function EmailHandoff({
  email,
  subject,
  body,
  className = '',
}: {
  email: string | null | undefined
  subject?: string
  body?: string
  className?: string
}) {
  if (!email) return null
  const mailtoHref = buildMailtoHref(email, { subject, body })

  return (
    <span className={`inline-flex max-w-full items-center gap-2 ${className}`}>
      <HandoffText>{email}</HandoffText>
      <span className="inline-flex shrink-0 items-center gap-1">
        <HandoffIconButton
          href={mailtoHref}
          label="Email"
          tooltip="Compose email"
          icon={Mail}
          kind="email"
        />
        <HandoffIconButton
          label="Email"
          tooltip="Copy email"
          copyValue={email}
          icon={Copy}
          kind="email"
        />
      </span>
    </span>
  )
}

export function AddressHandoff({
  address,
  lat,
  lng,
  className = '',
}: {
  address: string | null | undefined
  lat?: number | string | null
  lng?: number | string | null
  className?: string
}) {
  if (!address) return null
  const mapsHref = buildMapsDirectionsHref({ address, lat, lng })

  return (
    <span className={`inline-flex max-w-full items-center gap-2 ${className}`}>
      <HandoffText>{address}</HandoffText>
      <span className="inline-flex shrink-0 items-center gap-1">
        <HandoffIconButton
          href={mapsHref}
          label="Address"
          tooltip="Open directions"
          icon={MapPin}
          external
          kind="address"
        />
        <HandoffIconButton
          label="Address"
          tooltip="Copy address"
          copyValue={address}
          icon={Copy}
          kind="address"
        />
      </span>
    </span>
  )
}

export function ExternalUrlHandoff({
  href,
  label = 'Open link',
  className = '',
}: {
  href: string | null | undefined
  label?: string
  className?: string
}) {
  const normalizedHref = normalizeExternalHref(href)
  if (!normalizedHref) return null

  return (
    <span className={`inline-flex max-w-full items-center gap-2 ${className}`}>
      <HandoffText muted>{normalizedHref}</HandoffText>
      <span className="inline-flex shrink-0 items-center gap-1">
        <HandoffIconButton
          href={normalizedHref}
          label={label}
          tooltip={label}
          icon={ExternalLink}
          external
          kind="link"
        />
        <HandoffIconButton
          label="Link"
          tooltip="Copy link"
          copyValue={normalizedHref}
          icon={Copy}
          kind="link"
        />
      </span>
    </span>
  )
}

export function CalendarLinkButton({
  href,
  label = 'Calendar',
}: {
  href: string | null | undefined
  label?: string
}) {
  if (!href) return null
  return (
    <HandoffIconButton
      href={href}
      label={label}
      tooltip="Add to calendar"
      icon={CalendarPlus}
      external
      kind="calendar"
    />
  )
}
