'use client'

import { useState, useTransition } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Heart } from '@/components/ui/icons'
import { toggleDirectoryListingFavorite } from '@/lib/discover/actions'
import { toast } from 'sonner'

export type DirectoryFavoriteMode = 'active' | 'signin' | 'hidden'

type DirectoryFavoriteButtonProps = {
  listingId: string
  listingName: string
  initialFavorited: boolean
  mode: DirectoryFavoriteMode
  variant?: 'card' | 'detail'
  className?: string
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function DirectoryFavoriteButton({
  listingId,
  listingName,
  initialFavorited,
  mode,
  variant = 'card',
  className,
}: DirectoryFavoriteButtonProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isFavorited, setIsFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()

  if (mode === 'hidden') return null

  const buttonLabel =
    mode === 'signin' ? 'Save' : isFavorited ? (variant === 'detail' ? 'Saved' : 'Saved') : 'Save'

  const sharedClasses =
    variant === 'detail'
      ? joinClasses(
          'inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors',
          isFavorited
            ? 'border-rose-500/40 bg-rose-950/20 text-rose-200 hover:border-rose-400/50 hover:bg-rose-950/30'
            : 'border-stone-700 text-stone-300 hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100',
          className
        )
      : joinClasses(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors',
          isFavorited
            ? 'border-rose-500/40 bg-rose-950/80 text-rose-100 hover:border-rose-400/50'
            : 'border-stone-700/80 bg-stone-950/80 text-stone-200 hover:border-stone-500 hover:bg-stone-900/90',
          className
        )

  function redirectToSignIn() {
    const query = searchParams?.toString()
    const redirectPath = pathname ? `${pathname}${query ? `?${query}` : ''}` : '/nearby'
    window.location.href = `/auth/signin?redirect=${encodeURIComponent(redirectPath)}`
  }

  function handleClick() {
    if (isPending) return

    if (mode === 'signin') {
      redirectToSignIn()
      return
    }

    const previous = isFavorited
    setIsFavorited(!previous)

    startTransition(async () => {
      try {
        const result = await toggleDirectoryListingFavorite(listingId)
        setIsFavorited(result.isFavorited)
        toast.success(
          result.isFavorited
            ? `${listingName} saved to favorite operators.`
            : `${listingName} removed from favorite operators.`
        )
      } catch (err) {
        setIsFavorited(previous)
        toast.error(err instanceof Error ? err.message : 'Could not update favorite operators.')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={mode === 'active' ? isFavorited : undefined}
      aria-label={
        mode === 'signin'
          ? `Sign in to save ${listingName}`
          : isFavorited
            ? `Remove ${listingName} from favorites`
            : `Save ${listingName} to favorites`
      }
      title={mode === 'signin' ? 'Sign in to save this operator' : undefined}
      className={joinClasses(
        sharedClasses,
        isPending && 'cursor-wait opacity-80',
        mode === 'signin' && variant === 'detail' && 'border-brand-700/40 text-brand-200'
      )}
    >
      <Heart
        className={joinClasses('h-4 w-4', isFavorited ? 'text-rose-300' : undefined)}
        weight={isFavorited ? 'fill' : 'regular'}
      />
      <span>{buttonLabel}</span>
    </button>
  )
}
