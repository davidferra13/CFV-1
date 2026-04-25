'use client'

import { useEffect, useState } from 'react'
import { getCircleInviteLinkContext } from '@/lib/hub/invite-actions'
import type { HubInviteCopyRole } from '@/lib/hub/invite-copy'

export function useHubInviteLink(input: {
  groupToken: string
  profileToken?: string | null
  roleHint?: HubInviteCopyRole | null
}) {
  const fallbackPath = `/hub/join/${input.groupToken}`
  const [invitePath, setInvitePath] = useState(fallbackPath)
  const [copyRole, setCopyRole] = useState<HubInviteCopyRole>(input.roleHint ?? 'member')

  useEffect(() => {
    let cancelled = false

    setInvitePath(fallbackPath)
    setCopyRole(input.roleHint ?? 'member')

    if (!input.profileToken) {
      return () => {
        cancelled = true
      }
    }

    getCircleInviteLinkContext({
      groupToken: input.groupToken,
      profileToken: input.profileToken,
      roleHint: input.roleHint ?? null,
    })
      .then((result) => {
        if (cancelled) return
        setInvitePath(result.invitePath)
        setCopyRole(result.copyRole)
      })
      .catch(() => {
        if (cancelled) return
        setInvitePath(fallbackPath)
        setCopyRole(input.roleHint ?? 'member')
      })

    return () => {
      cancelled = true
    }
  }, [fallbackPath, input.groupToken, input.profileToken, input.roleHint])

  return {
    invitePath,
    copyRole,
  }
}
