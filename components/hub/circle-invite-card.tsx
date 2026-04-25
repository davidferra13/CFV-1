'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useHubInviteLink } from '@/components/hub/use-hub-invite-link'
import { buildCircleInviteShareMessage, type HubInviteCopyRole } from '@/lib/hub/invite-copy'
import { cn } from '@/lib/utils'

type CircleInviteCardProps = {
  groupToken: string
  profileToken?: string | null
  inviteRole?: HubInviteCopyRole | null
  title?: string
  description?: string
  occasion?: string | null
  openHref?: string
  showOpenButton?: boolean
  className?: string
}

function buildSmsHref(message: string) {
  return `sms:?&body=${encodeURIComponent(message)}`
}

export function CircleInviteCard({
  groupToken,
  profileToken,
  inviteRole,
  title = 'Invite the table',
  description = 'One clean link. Guests land in the Dinner Circle, add allergies, and stay synced in one place.',
  occasion,
  openHref = `/hub/g/${groupToken}`,
  showOpenButton = true,
  className,
}: CircleInviteCardProps) {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  const [messageCopied, setMessageCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const { invitePath, copyRole } = useHubInviteLink({
    groupToken,
    profileToken,
    roleHint: inviteRole ?? null,
  })

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const inviteUrl = origin ? `${origin}${invitePath}` : invitePath
  const shareTitle = occasion ? `${occasion} Dinner Circle` : 'Dinner Circle'
  const shareText =
    copyRole === 'chef'
      ? occasion
        ? `Join the Dinner Circle for ${occasion} on ChefFlow.`
        : 'Join the Dinner Circle on ChefFlow.'
      : copyRole === 'client'
        ? occasion
          ? `Join our Dinner Circle for ${occasion} on ChefFlow.`
          : 'Join our Dinner Circle on ChefFlow.'
        : occasion
          ? `Come join our Dinner Circle for ${occasion} on ChefFlow.`
          : 'Come join our Dinner Circle on ChefFlow.'
  const shareMessage = buildCircleInviteShareMessage({
    copyRole,
    occasion,
    inviteUrl,
  })
  const smsHref = buildSmsHref(shareMessage)
  const rolePills =
    copyRole === 'chef'
      ? ['Chef-led coordination', 'Text-message friendly', 'Dietaries + updates in one place']
      : copyRole === 'client'
        ? ['Guest-ready link', 'Text-message friendly', 'Host, chef, and guests aligned']
        : ['Easy to forward', 'Text-message friendly', 'Dietaries + updates in one place']

  async function copyText(value: string, onCopied: () => void) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = value
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    onCopied()
  }

  async function copyInviteLink() {
    try {
      await copyText(inviteUrl, () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      })
    } catch {
      // Ignore clipboard failures; the visible URL still gives the user a fallback.
    }
  }

  async function copyInviteMessage() {
    try {
      await copyText(shareMessage, () => {
        setMessageCopied(true)
        window.setTimeout(() => setMessageCopied(false), 1800)
      })
    } catch {
      // Ignore clipboard failures; the visible message still gives the user a fallback.
    }
  }

  async function shareInviteLink() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: inviteUrl,
        })
        setShared(true)
        window.setTimeout(() => setShared(false), 1800)
        return
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
      }
    }

    await copyInviteMessage()
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-[#e88f47]/20 bg-[radial-gradient(circle_at_top_left,rgba(232,143,71,0.18),transparent_38%),linear-gradient(135deg,rgba(28,25,23,0.98),rgba(17,14,12,0.98))] p-5 text-stone-100 shadow-[0_18px_60px_rgba(0,0,0,0.35)]',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#e88f47]/8 to-transparent" />
      <div className="pointer-events-none absolute -right-10 top-8 h-28 w-28 rounded-full bg-[#e88f47]/15 blur-3xl" />

      <div className="relative space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f3c29a]">
              Dinner Circle Invite
            </span>
            <div>
              <h3 className="text-lg font-semibold text-stone-50">{title}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-300">{description}</p>
            </div>
          </div>

          {showOpenButton ? (
            <Link
              href={openHref}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-stone-100 transition hover:border-[#e88f47]/40 hover:bg-[#e88f47]/10"
            >
              Open Circle
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-medium text-stone-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            No app download
          </span>
          {rolePills.map((pill) => (
            <span key={pill} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {pill}
            </span>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              Suggested Text
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-100">{shareMessage}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              Join Link
            </p>
            <p className="mt-2 break-all font-mono text-sm leading-6 text-stone-100">{inviteUrl}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={copyInviteLink}
            className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#e88f47] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {copied ? 'Copied Link' : 'Copy Link'}
          </button>

          <button
            type="button"
            onClick={copyInviteMessage}
            className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-stone-100 transition hover:border-[#e88f47]/40 hover:bg-[#e88f47]/10"
          >
            {messageCopied ? 'Copied Text' : 'Copy Text'}
          </button>

          <button
            type="button"
            onClick={shareInviteLink}
            className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-stone-100 transition hover:border-[#e88f47]/40 hover:bg-[#e88f47]/10"
          >
            {shared ? 'Shared' : 'Share'}
          </button>

          <a
            href={smsHref}
            className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-stone-100 transition hover:border-[#e88f47]/40 hover:bg-[#e88f47]/10"
          >
            Text It
          </a>
        </div>
      </div>
    </div>
  )
}
