'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { EventStatusBadge, type EventStatus } from '@/components/events/event-status-badge'
import { CalendarAddButtons } from '@/components/events/calendar-add-buttons'
import { AddressHandoff } from '@/components/ui/handoff-actions'
import type { OpsHubData } from '@/lib/events/ops-hub-actions'
import type { PrepSymbol } from '@/lib/prep-timeline/compute-timeline'
import { formatPrepTime } from '@/lib/prep-timeline/compute-timeline'

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatQty(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2)
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)

  return (
    <section className="rounded-lg border border-stone-700 bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        <span className="text-sm font-medium text-stone-500">{open ? 'v' : '>'}</span>
      </button>
      {open && <div className="mt-5">{children}</div>}
    </section>
  )
}

function Badge({
  children,
  tone = 'stone',
}: {
  children: ReactNode
  tone?: 'stone' | 'red' | 'yellow' | 'blue'
}) {
  const classes =
    tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'yellow'
        ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
        : tone === 'blue'
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-stone-200 bg-stone-50 text-stone-700'

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${classes}`}>
      {children}
    </span>
  )
}

function MenuSection({ menu }: { menu: OpsHubData['menu'] }) {
  if (!menu) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 p-6 text-sm text-stone-600">
        No menu linked to this event yet.{' '}
        <Link href="/menus" className="font-medium text-stone-900 underline underline-offset-2">
          Open menus
        </Link>
      </div>
    )
  }

  const byCourse = new Map<number, typeof menu.dishes>()
  for (const dish of menu.dishes) {
    byCourse.set(dish.course_number, [...(byCourse.get(dish.course_number) ?? []), dish])
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">{menu.name}</p>
      {[...byCourse.entries()].map(([courseNumber, dishes]) => (
        <div key={courseNumber} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Course {courseNumber}
          </h3>
          <div className="divide-y divide-stone-100 rounded-lg border border-stone-200">
            {dishes.map((dish) => (
              <div key={dish.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm font-medium text-stone-900">{dish.name}</span>
                {dish.recipe_id ? (
                  <Badge tone="blue">Recipe linked</Badge>
                ) : (
                  <Badge>No recipe</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ShoppingSection({ shopping }: { shopping: OpsHubData['shopping'] }) {
  if (shopping.items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 p-6 text-sm text-stone-600">
        Add recipes to your menu to generate a shopping list
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
            <th className="py-2 pr-4 font-medium">Ingredient</th>
            <th className="py-2 pr-4 font-medium">Qty Needed</th>
            <th className="py-2 pr-4 font-medium">On Hand</th>
            <th className="py-2 pr-4 font-medium">To Buy</th>
            <th className="py-2 pr-4 font-medium">Est. Cost</th>
            <th className="py-2 font-medium">Allergen Flags</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {shopping.items.map((item) => (
            <tr key={item.ingredientId}>
              <td className="py-3 pr-4 font-medium text-stone-900">{item.ingredientName}</td>
              <td className="py-3 pr-4 text-stone-600">
                {formatQty(item.totalRequired)} {item.unit}
              </td>
              <td className="py-3 pr-4 text-stone-600">
                {formatQty(item.onHand)} {item.unit}
              </td>
              <td className="py-3 pr-4 text-stone-900">
                {formatQty(item.toBuy)} {item.unit}
              </td>
              <td className="py-3 pr-4 text-stone-600">{formatMoney(item.estimatedCostCents)}</td>
              <td className="py-3">
                <div className="flex flex-wrap gap-1">
                  {item.allergenFlags.length > 0 ? (
                    item.allergenFlags.map((flag) => (
                      <Badge key={flag} tone="red">
                        {flag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-stone-400">None</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-stone-200">
            <td colSpan={4} className="pt-4 text-right font-semibold text-stone-900">
              Total estimated cost
            </td>
            <td className="pt-4 font-semibold text-stone-900">
              {formatMoney(shopping.totalEstimatedCostCents)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function PrepSymbolBadge({ symbol }: { symbol: PrepSymbol }) {
  if (symbol === 'freezable') return <Badge tone="blue">Snowflake</Badge>
  if (symbol === 'day_of') return <Badge tone="stone">Day-of</Badge>
  if (symbol === 'safety_warning') return <Badge tone="yellow">Warning</Badge>
  if (symbol === 'allergen') return <Badge tone="red">Allergen</Badge>
  if (symbol === 'fresh') return <Badge tone="stone">Fresh</Badge>
  if (symbol === 'serve_immediately') return <Badge tone="yellow">Serve now</Badge>
  if (symbol === 'hold_warm') return <Badge tone="yellow">Hold warm</Badge>
  return null
}

function PrepSection({ prep }: { prep: OpsHubData['prep'] }) {
  if (!prep) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 p-6 text-sm text-stone-600">
        Link recipes with prep data to generate a timeline
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">{formatPrepTime(prep.totalPrepMinutes)} total prep</p>
      {prep.days.map((day) => (
        <div key={new Date(day.date).toISOString()} className="rounded-lg border border-stone-200">
          <div className="border-b border-stone-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-stone-900">
              {format(new Date(day.date), 'EEEE, MMM d')} - {day.label}
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              {day.items.length} item{day.items.length === 1 ? '' : 's'}
              {day.totalPrepMinutes > 0 ? `, ${formatPrepTime(day.totalPrepMinutes)}` : ''}
            </p>
          </div>
          {day.items.length > 0 ? (
            <div className="divide-y divide-stone-100">
              {day.items.map((item) => (
                <div
                  key={`${item.recipeId}-${item.componentName}-${item.dishName}`}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-900">{item.recipeName}</p>
                    <p className="text-xs text-stone-500">
                      {item.componentName} on {item.dishName}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-stone-500">
                      {formatPrepTime(item.prepTimeMinutes)}
                    </span>
                    {item.symbols.map((symbol) => (
                      <PrepSymbolBadge key={symbol} symbol={symbol} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-stone-500">No prep items scheduled</div>
          )}
        </div>
      ))}
    </div>
  )
}

export function OpsHubView({ data }: { data: OpsHubData }) {
  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-stone-700 bg-stone-900 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-stone-100">
                {data.event.occasion || 'Untitled Event'}
              </h1>
              <EventStatusBadge status={data.event.status as EventStatus} />
            </div>
            <p className="mt-2 text-sm text-stone-300">
              {format(new Date(data.event.event_date), 'EEEE, MMMM d, yyyy')}
              {data.event.serve_time ? ` at ${data.event.serve_time}` : ''} |{' '}
              {data.event.guest_count} guests
            </p>
            {data.event.client_name && (
              <p className="mt-1 text-sm text-stone-400">{data.event.client_name}</p>
            )}
            {data.event.location_address && (
              <div className="mt-2 text-sm text-stone-400">
                <AddressHandoff address={data.event.location_address} />
              </div>
            )}
          </div>
          <div className="shrink-0">
            <CalendarAddButtons
              eventId={data.event.id}
              occasion={data.event.occasion || 'ChefFlow Event'}
              eventDate={data.event.event_date}
              startTime={data.event.serve_time ?? undefined}
              location={data.event.location_address ?? undefined}
            />
          </div>
        </div>
      </header>

      <Section title="Menu Overview">
        <MenuSection menu={data.menu} />
      </Section>

      <Section title="Shopping List">
        <ShoppingSection shopping={data.shopping} />
      </Section>

      <Section title="Prep Timeline">
        <PrepSection prep={data.prep} />
      </Section>
    </div>
  )
}
