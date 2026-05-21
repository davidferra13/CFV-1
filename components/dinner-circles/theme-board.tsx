'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { upsertThemeBoard, addContribution } from '@/lib/dinner-circles/theme-board'

interface ColorEntry {
  hex: string
  label?: string
}

interface DecorIdea {
  idea: string
  imageUrl?: string
  source?: string
}

interface Contribution {
  id: string
  contributor_id: string
  type: string
  content: string
  image_url?: string | null
  created_at: string
}

interface ThemeBoardData {
  circle_id: string
  mood_description: string | null
  color_palette: ColorEntry[]
  decor_ideas: DecorIdea[]
  playlist_notes: string | null
  playlist_url: string | null
  atmosphere_notes: string | null
  menu_aesthetic_notes: string | null
  chef_visibility: 'full' | 'summary' | 'none'
  contributions: Contribution[]
}

interface ThemeBoardProps {
  circleId: string
  board: ThemeBoardData | null
  isHost: boolean
  callerProfileId: string
  onRefresh?: () => void
}

type ContributionType = 'color' | 'decor' | 'mood' | 'playlist' | 'atmosphere'

const CONTRIB_LABELS: Record<ContributionType, string> = {
  color: 'Color idea',
  decor: 'Decor idea',
  mood: 'Mood note',
  playlist: 'Playlist suggestion',
  atmosphere: 'Atmosphere note',
}

export function ThemeBoard({
  circleId,
  board,
  isHost,
  callerProfileId,
  onRefresh,
}: ThemeBoardProps) {
  const [isPending, startTransition] = useTransition()
  const [editMode, setEditMode] = useState(false)
  const [showContrib, setShowContrib] = useState(false)
  const [contribType, setContribType] = useState<ContributionType>('mood')
  const [contribContent, setContribContent] = useState('')

  // Editable fields for host
  const [mood, setMood] = useState(board?.mood_description ?? '')
  const [playlistNotes, setPlaylistNotes] = useState(board?.playlist_notes ?? '')
  const [playlistUrl, setPlaylistUrl] = useState(board?.playlist_url ?? '')
  const [atmosphereNotes, setAtmosphereNotes] = useState(board?.atmosphere_notes ?? '')
  const [menuAesthetic, setMenuAesthetic] = useState(board?.menu_aesthetic_notes ?? '')

  function handleSave() {
    startTransition(async () => {
      try {
        await upsertThemeBoard({
          circleId,
          moodDescription: mood || undefined,
          playlistNotes: playlistNotes || undefined,
          playlistUrl: playlistUrl || undefined,
          atmosphereNotes: atmosphereNotes || undefined,
          menuAestheticNotes: menuAesthetic || undefined,
        })
        toast.success('Theme board updated')
        setEditMode(false)
        onRefresh?.()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  function handleAddContribution() {
    if (!contribContent.trim()) return
    startTransition(async () => {
      try {
        await addContribution({
          circleId,
          contributionType: contribType,
          content: contribContent.trim(),
        })
        toast.success('Contribution added')
        setContribContent('')
        setShowContrib(false)
        onRefresh?.()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to add contribution')
      }
    })
  }

  const palette = board?.color_palette ?? []
  const contributions = board?.contributions ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Theme Board</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowContrib((v) => !v)}
            disabled={isPending}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            + Contribute
          </button>
          {isHost && (
            <button
              onClick={() => setEditMode((v) => !v)}
              disabled={isPending}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {editMode ? 'Cancel' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {/* Contribution form */}
      {showContrib && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">Add your contribution</p>
          <div className="flex gap-2">
            <select
              id="contrib-type"
              aria-label="Contribution type"
              value={contribType}
              onChange={(e) => setContribType(e.target.value as ContributionType)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              {Object.entries(CONTRIB_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={contribContent}
            onChange={(e) => setContribContent(e.target.value)}
            placeholder="Share your idea..."
            className="w-full rounded-md border px-3 py-2 text-sm"
            rows={2}
            maxLength={500}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddContribution}
              disabled={!contribContent.trim() || isPending}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Submit
            </button>
            <button
              onClick={() => setShowContrib(false)}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit mode form (host) */}
      {editMode && isHost && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <p className="text-sm font-medium">Edit theme board</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="tb-mood" className="text-xs font-medium text-muted-foreground">
                Mood description
              </label>
              <textarea
                id="tb-mood"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                rows={2}
                maxLength={1000}
              />
            </div>
            <div>
              <label htmlFor="tb-atmosphere" className="text-xs font-medium text-muted-foreground">
                Atmosphere notes
              </label>
              <textarea
                id="tb-atmosphere"
                value={atmosphereNotes}
                onChange={(e) => setAtmosphereNotes(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                rows={2}
                maxLength={1000}
              />
            </div>
            <div>
              <label
                htmlFor="tb-menu-aesthetic"
                className="text-xs font-medium text-muted-foreground"
              >
                Menu aesthetic notes
              </label>
              <textarea
                id="tb-menu-aesthetic"
                value={menuAesthetic}
                onChange={(e) => setMenuAesthetic(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                rows={2}
                maxLength={1000}
              />
            </div>
            <div>
              <label htmlFor="tb-playlist" className="text-xs font-medium text-muted-foreground">
                Playlist notes
              </label>
              <input
                id="tb-playlist"
                type="text"
                value={playlistNotes}
                onChange={(e) => setPlaylistNotes(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                maxLength={1000}
              />
            </div>
            <div>
              <label
                htmlFor="tb-playlist-url"
                className="text-xs font-medium text-muted-foreground"
              >
                Playlist URL
              </label>
              <input
                id="tb-playlist-url"
                type="url"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="https://open.spotify.com/..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Display view */}
      {!editMode && (
        <div className="space-y-4">
          {board?.mood_description && (
            <div className="rounded-lg bg-muted/40 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Mood</p>
              <p className="text-sm">{board.mood_description}</p>
            </div>
          )}

          {palette.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Color palette</p>
              <div className="flex gap-2 flex-wrap">
                {palette.map((c, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span
                      className="block h-10 w-10 rounded-full border shadow-sm"
                      title={c.label ?? c.hex}
                      aria-label={c.label ?? c.hex}
                      data-hex={c.hex}
                      ref={(el) => {
                        if (el) el.style.backgroundColor = c.hex
                      }}
                    />
                    {c.label && <span className="text-xs text-muted-foreground">{c.label}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {board?.atmosphere_notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Atmosphere</p>
              <p className="text-sm">{board.atmosphere_notes}</p>
            </div>
          )}

          {(board?.playlist_notes || board?.playlist_url) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Playlist</p>
              {board.playlist_notes && <p className="text-sm">{board.playlist_notes}</p>}
              {board.playlist_url && (
                <a
                  href={board.playlist_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-600 hover:underline"
                >
                  Open playlist
                </a>
              )}
            </div>
          )}

          {!board && (
            <p className="text-sm text-muted-foreground">
              No theme board yet. Add the first details.
            </p>
          )}
        </div>
      )}

      {/* Member contributions */}
      {contributions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Member contributions ({contributions.length})
          </p>
          <ul className="space-y-2">
            {contributions.map((c) => (
              <li key={c.id} className="flex gap-3 rounded-lg border bg-card px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {CONTRIB_LABELS[c.type as ContributionType] ?? c.type}
                    </span>
                  </div>
                  <p className="text-sm">{c.content}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
