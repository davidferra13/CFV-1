'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { PublicCircleResult } from '@/lib/hub/community-circle-actions'
import { discoverPublicCircles } from '@/lib/hub/community-circle-actions'
import { CommunityCircleCard } from '@/components/hub/community-circle-card'
import { CreateCommunityCircleForm } from '@/components/hub/create-community-circle-form'

const POPULAR_TOPICS = [
  'Italian',
  'Japanese',
  'Mexican',
  'BBQ',
  'Plant-Based',
  'Gluten-Free',
  'Wine',
  'Baking',
  'Seafood',
  'Farm-to-Table',
]

interface Props {
  initialCircles: PublicCircleResult[]
  initialCursor: string | null
  initialSearch: string
  initialTopic: string
  isAuthenticated: boolean
}

export function CirclesDiscoveryView({
  initialCircles,
  initialCursor,
  initialSearch,
  initialTopic,
  isAuthenticated,
}: Props) {
  const router = useRouter()
  const [circles, setCircles] = useState(initialCircles)
  const [cursor, setCursor] = useState(initialCursor)
  const [search, setSearch] = useState(initialSearch)
  const [activeTopic, setActiveTopic] = useState(initialTopic)
  const [showCreate, setShowCreate] = useState(false)
  const [isSearching, startSearch] = useTransition()
  const [isLoadingMore, startLoadMore] = useTransition()

  const doSearch = (q: string, topic: string) => {
    startSearch(async () => {
      const result = await discoverPublicCircles({
        search: q || undefined,
        topic: topic || undefined,
        limit: 20,
      })
      setCircles(result.circles)
      setCursor(result.nextCursor)
    })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch(search, activeTopic)
  }

  const handleTopicFilter = (topic: string) => {
    const next = activeTopic === topic ? '' : topic
    setActiveTopic(next)
    doSearch(search, next)
  }

  const loadMore = () => {
    if (!cursor) return
    startLoadMore(async () => {
      const result = await discoverPublicCircles({
        search: search || undefined,
        topic: activeTopic || undefined,
        limit: 20,
        cursor,
      })
      setCircles((prev) => [...prev, ...result.circles])
      setCursor(result.nextCursor)
    })
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Community Circles</h1>
          <p className="mt-1 text-sm text-stone-400">
            Join conversations about food, cooking, and everything in between
          </p>
        </div>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 transition-colors"
          >
            {showCreate ? 'Cancel' : '+ Create Circle'}
          </button>
        ) : (
          <Link
            href="/auth/signin"
            className="rounded-lg bg-stone-700 px-4 py-2 text-sm font-medium text-stone-300 hover:bg-stone-600 text-center"
          >
            Sign in to create
          </Link>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6">
          <CreateCommunityCircleForm
            onCreated={(token) => {
              setShowCreate(false)
              router.push(`/hub/g/${token}`)
            }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search circles..."
          className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-amber-500"
        />
      </form>

      {/* Topic filters */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {POPULAR_TOPICS.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => handleTopicFilter(topic)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeTopic === topic
                ? 'bg-amber-900/40 text-amber-300 ring-1 ring-amber-500/50'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isSearching && <div className="py-8 text-center text-sm text-stone-500">Searching...</div>}

      {/* Results */}
      {!isSearching && circles.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {circles.map((circle) => (
            <CommunityCircleCard key={circle.id} circle={circle} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isSearching && circles.length === 0 && (
        <div className="rounded-xl border border-stone-700/50 bg-stone-800/30 px-6 py-16 text-center">
          <div className="mb-3 text-4xl">🔍</div>
          <h3 className="text-lg font-semibold text-stone-200">No circles yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-400">
            {search || activeTopic
              ? 'No circles match your search. Try different keywords or be the first to create one.'
              : 'Be the first to start a community circle. Pick a topic you care about and start the conversation.'}
          </p>
          {isAuthenticated && !showCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
            >
              Create the First Circle
            </button>
          )}
        </div>
      )}

      {/* Load more */}
      {cursor && !isSearching && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="rounded-lg bg-stone-800 px-6 py-2 text-sm text-stone-300 hover:bg-stone-700 disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </>
  )
}
