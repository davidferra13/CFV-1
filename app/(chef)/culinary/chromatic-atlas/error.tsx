'use client'

import { useEffect } from 'react'

export default function ChromaticAtlasError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Chromatic Flavor Atlas Error]', error)
  }, [error])

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <section className="rounded-lg border border-red-900/50 bg-red-950/30 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
          Honest failure state
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-100">
          Chromatic Flavor Atlas could not load
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          The atlas is experimental and evidence-labeled. If source data, runtime code, or route
          permissions fail, the page should stop here instead of showing incomplete claims as fact.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-stone-500">Error id: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-md border border-red-700 bg-red-900/40 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-900/70"
        >
          Try again
        </button>
      </section>
    </div>
  )
}
