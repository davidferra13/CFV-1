/**
 * The live design-system catalog.
 *
 * Route: /design-system  (gated to the founder by app/(dev)/layout.tsx)
 *
 * This renders the ACTUAL React primitives with the ACTUAL tokens, so it stays
 * true by construction: if a component changes, this page changes with it.
 *
 * There is also a static, dependency-free copy at design-system/gallery/index.html,
 * built with `npm run gallery:build` and verified in a real browser with
 * `npm run gallery:validate`. Use the static one in CI and for sharing; use this
 * one while you are working on a component.
 *
 * Rules: design-system/SPEC.md
 * Checklist: design-system/BUILD-CHECKLIST.md
 * Search: node design-system/registry/find.mjs <query>
 */

import type { Metadata } from 'next'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-state'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusDot } from '@/components/ui/status-dot'
import { PageHeader } from '@/components/ui/page-header'

export const metadata: Metadata = {
  title: 'Design system',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

const BRAND_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
const STONE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
const STATUS_ROLES = ['success', 'warning', 'danger', 'info', 'neutral'] as const
const LAYERS: Array<[string, number]> = [
  ['z-raised', 10],
  ['z-sticky', 20],
  ['z-subnav', 25],
  ['z-chrome', 30],
  ['z-page-bar', 32],
  ['z-mobile-header', 35],
  ['z-nav', 40],
  ['z-island', 42],
  ['z-fab-secondary', 44],
  ['z-fab', 45],
  ['z-status', 46],
  ['z-offline', 48],
  ['z-overlay', 50],
  ['z-dialog', 60],
  ['z-float', 70],
  ['z-context-menu', 72],
  ['z-command', 74],
  ['z-spotlight', 78],
  ['z-toast', 80],
  ['z-system-overlay', 85],
  ['z-tooltip', 90],
]

function Section({
  id,
  title,
  blurb,
  children,
}: {
  id: string
  title: string
  blurb: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="border-t border-stone-800 py-10 first:border-t-0">
      <h2 className="font-display text-2xl tracking-tight text-stone-50">{title}</h2>
      <p className="mt-2 max-w-prose text-sm text-stone-300">{blurb}</p>
      <div className="mt-6 space-y-8">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="w-32 shrink-0 text-xs text-stone-400">{label}</code>
      {children}
    </div>
  )
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Design system"
        subtitle="The live catalog. These are the real components with the real tokens, so what you see here is what ships. Rules live in design-system/SPEC.md."
      />

      <Section
        id="colour"
        title="Colour"
        blurb="Every colour comes from a role. The brand ramp is swapped at runtime across eight palettes, which is why a hardcoded hex is a correctness bug and not a style preference."
      >
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">
            Brand ramp
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-11">
            {BRAND_STOPS.map((stop) => (
              <div key={stop}>
                <div
                  className="h-14 rounded-lg border border-stone-700/40"
                  style={{ background: `rgb(var(--brand-${stop}))` }}
                />
                <code className="mt-1 block text-2xs text-stone-400">brand-{stop}</code>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">
            Neutral ramp
          </h3>
          <p className="mb-3 text-xs text-stone-400">
            Inverted in light mode on purpose, so dark-first utility usage renders correctly on a
            light ground. zinc, gray and neutral are aliases of this scale.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-11">
            {STONE_STOPS.map((stop) => (
              <div key={stop}>
                <div
                  className="h-14 rounded-lg border border-stone-700/40"
                  style={{ background: `rgb(var(--stone-${stop}))` }}
                />
                <code className="mt-1 block text-2xs text-stone-400">stone-{stop}</code>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">
            Surfaces
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n}>
                <div
                  className="h-14 rounded-lg border border-stone-700/40"
                  style={{ background: `var(--surface-${n})` }}
                />
                <code className="mt-1 block text-2xs text-stone-400">--surface-{n}</code>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">
            Status roles
          </h3>
          <p className="mb-3 text-xs text-stone-400">
            Meaning is global, silhouette is local. The same role must read the same whether it
            appears as a chip, a dot or a row accent.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STATUS_ROLES.map((role) => (
              <div key={role} className="space-y-2">
                <div
                  className={`status-${role} rounded-md border px-3 py-1 text-center text-xs font-medium`}
                >
                  {role}
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <StatusDot
                    status={
                      role === 'success'
                        ? 'active'
                        : role === 'danger'
                          ? 'error'
                          : role === 'warning'
                            ? 'warning'
                            : 'idle'
                    }
                  />
                  StatusDot
                </div>
                <div
                  className="rounded-r-md bg-[var(--surface-2)] px-2 py-1 text-xs text-stone-300"
                  style={{ borderLeft: `3px solid var(--status-${role}-solid)` }}
                >
                  row accent
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section
        id="typography"
        title="Typography"
        blurb="Two visible families and one functional monospace. Playfair Display carries the editorial voice; the interface family is a system stack with no webfont cost."
      >
        <div className="space-y-4">
          <div className="font-display text-4xl tracking-tight text-stone-50">
            Display, h1 and hero
          </div>
          <div className="font-display text-2xl text-stone-50">Section heading, h2</div>
          <div className="text-lg font-semibold text-stone-50">Card title</div>
          <div className="text-sm text-stone-200">
            Body. The interface family. Fifteen pixels, raised from Tailwind&apos;s default for
            readability.
          </div>
          <div className="text-xs text-stone-400">Caption and helper text.</div>
          <div className="text-xxs font-bold uppercase tracking-[0.06em] text-stone-400">
            Overline
          </div>
          <div className="metric-display font-display text-stone-50">128</div>
          <div className="font-mono text-xs text-stone-300">
            evt_01J9K2M4 &mdash; monospace is functional only
          </div>
        </div>
      </Section>

      <Section
        id="actions"
        title="Actions"
        blurb="One primary button per screen. Every size clears the 44px touch minimum; sizes differ in padding and type, not height."
      >
        {(['primary', 'secondary', 'danger', 'ghost'] as const).map((variant) => (
          <Row key={variant} label={variant}>
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <Button key={size} variant={variant} size={size}>
                {variant} {size}
              </Button>
            ))}
          </Row>
        ))}
        <Row label="disabled">
          <Button disabled>Save</Button>
        </Row>
        <Row label="loading">
          <Button loading>Saving</Button>
        </Row>
        <Row label="as link">
          <Button href="#actions" variant="secondary">
            Anchor
          </Button>
          <Button href="#actions" loading>
            Inert while loading
          </Button>
        </Row>
      </Section>

      <Section
        id="status"
        title="Status"
        blurb="Colour is never the only carrier of meaning: the label does the work."
      >
        <Row label="badges">
          {(['default', 'success', 'warning', 'error', 'info'] as const).map((v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ))}
        </Row>
        <div className="space-y-3">
          {(['info', 'success', 'warning', 'error'] as const).map((v) => (
            <Alert key={v} variant={v} title={v}>
              Every alert announces. error and warning are assertive; info and success are polite.
            </Alert>
          ))}
        </div>
      </Section>

      <Section
        id="surfaces"
        title="Surfaces"
        blurb="Cards group 3 to 8 related things. Never one card per toggle, never cards for a list of ten similar items."
      >
        <div className="grid grid-cols-1 gap-card-grid sm:grid-cols-2 lg:grid-cols-4">
          {(['default', 'elevated', 'glass', 'highlight'] as const).map((variant) => (
            <Card key={variant} variant={variant}>
              <CardHeader>
                <CardTitle as="h3">{variant}</CardTitle>
                <CardDescription>Card variant</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-stone-300">
                Depth is carried by the surface scale; shadow is the secondary cue.
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm">
                  Action
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        id="forms"
        title="Forms"
        blurb="Validate inline. An error message names what to do. Inputs never render below 16px, so iOS does not auto-zoom."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Default" placeholder="hello@example.com" />
          <Input
            label="With helper"
            helperText="We only use this to send the confirmation."
            placeholder="Optional"
          />
          <Input label="Error" error="Enter a valid email address." defaultValue="not-an-email" />
          <Input label="Disabled" disabled placeholder="Unavailable" />
          <Textarea
            label="Notes"
            showCount
            maxLength={280}
            placeholder="Anything the chef should know"
          />
          <Select
            label="Service type"
            options={[
              { value: 'dinner', label: 'Dinner service' },
              { value: 'class', label: 'Cooking class' },
            ]}
          />
        </div>
        <Row label="switch">
          <Switch checked aria-label="On" />
          <Switch checked={false} aria-label="Off" />
          <Switch checked={false} disabled aria-label="Disabled" />
        </Row>
      </Section>

      <Section
        id="data"
        title="Data"
        blurb="Seven columns by default; anything more goes behind a column chooser. On a phone a table becomes a card list rather than a sideways scroll."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Harbour House</TableCell>
              <TableCell>12 Sep</TableCell>
              <TableCell>
                <Badge variant="success">confirmed</Badge>
              </TableCell>
              <TableCell className="font-mono">1,290.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Elm Street</TableCell>
              <TableCell>19 Sep</TableCell>
              <TableCell>
                <Badge variant="warning">awaiting client</Badge>
              </TableCell>
              <TableCell className="font-mono">860.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section
        id="states"
        title="Feedback states"
        blurb="All five data states, every time: empty, loading, loaded, error, partial. Never render a failed load as an empty list."
      >
        <div className="grid grid-cols-1 gap-card-grid lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle as="h3">Loading</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-5/6" />
              <div className="pt-2">
                <LoadingSpinner size="sm" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <EmptyState
              title="No events yet"
              description="An empty state names the next action, it does not just say there is nothing here."
              remy="pondering"
            />
          </Card>
          <Card>
            <ErrorState
              size="md"
              title="Could not load events"
              description="Never render a failed load as an empty list."
            />
          </Card>
        </div>
      </Section>

      <Section
        id="layer"
        title="Layering"
        blurb="The complete stacking contract. Sixteen of these names were in use across roughly 180 call sites while none of them existed, so every dialog and popover stacked by DOM order."
      >
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Layer scale">
          <table className="min-w-[28rem] text-left text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-xxs uppercase tracking-wider text-stone-400">
                  class
                </th>
                <th className="px-3 py-2 text-xxs uppercase tracking-wider text-stone-400">
                  z-index
                </th>
              </tr>
            </thead>
            <tbody>
              {LAYERS.map(([name, value]) => (
                <tr key={name} className="border-t border-stone-800">
                  <td className="px-3 py-2">
                    <code className="text-xs">{name}</code>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-stone-300">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone-400">
          float sits above dialog on purpose, so a menu opened inside a modal renders over it.
          Everything below overlay (50) is page chrome and is therefore covered by a modal.
        </p>
      </Section>

      <Section
        id="motion"
        title="Motion"
        blurb="Motion explains hierarchy, state, causality or spatial movement. Nothing animates to look richer."
      >
        <p className="text-sm text-stone-300">
          Durations: instant 75ms, fast 100ms, normal 200ms, slow 350ms, enter 220ms, exit 150ms,
          deliberate 500ms. The house curve is ease-spring.
        </p>
        <p className="text-sm text-stone-300">
          Under prefers-reduced-motion everything collapses to 0.01ms and entrance animations
          resolve to their final state rather than staying invisible. Loading spinners, skeleton
          shimmer and progress fills are exempt, because they are the only feedback that work is
          happening. Turn reduced motion on in your OS and reload this page to check.
        </p>
      </Section>
    </main>
  )
}
