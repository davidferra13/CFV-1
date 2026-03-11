'use client'

import Link from 'next/link'
import {
  formatFeaturedMenuPriceLabel,
  formatFeaturedMenuUsageLabel,
  formatServiceStyleLabel,
  type PublicFeaturedBookingMenu,
} from '@/lib/booking/featured-menu-shared'

type ActionLink = {
  href: string
  label: string
}

type Props = {
  menu: PublicFeaturedBookingMenu
  primaryColor: string
  eyebrow?: string
  title?: string
  description?: string
  primaryAction?: ActionLink
  secondaryAction?: ActionLink
  compact?: boolean
}

export function FeaturedBookingMenuCard({
  menu,
  primaryColor,
  eyebrow = 'Ready to Book',
  title = menu.name,
  description,
  primaryAction,
  secondaryAction,
  compact = false,
}: Props) {
  const priceLabel = formatFeaturedMenuPriceLabel(menu.pricePerPersonCents)
  const usageLabel = formatFeaturedMenuUsageLabel(menu.timesUsed)
  const metadata = [
    menu.cuisineType,
    formatServiceStyleLabel(menu.serviceStyle),
    menu.targetGuestCount ? `Designed for ${menu.targetGuestCount} guests` : null,
  ].filter(Boolean)
  const summaryPills = [
    priceLabel,
    usageLabel,
    menu.dishCount > 0 ? `${menu.dishCount} ${menu.dishCount === 1 ? 'course' : 'courses'}` : null,
  ].filter(Boolean)
  const showAlternateMenuName = title.trim() !== menu.name.trim()

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-stone-700 bg-stone-950 text-stone-100 shadow-2xl ${
        compact ? 'p-5' : 'p-6 md:p-8'
      }`}
      style={{ boxShadow: `0 28px 80px -48px ${primaryColor}` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-100"
        style={{
          background: `radial-gradient(circle at top right, ${primaryColor}22, transparent 38%), linear-gradient(180deg, rgba(24,24,27,0.98) 0%, rgba(12,10,9,0.98) 100%)`,
        }}
      />

      <div className="relative space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]"
                style={{
                  borderColor: `${primaryColor}55`,
                  backgroundColor: `${primaryColor}18`,
                  color: '#f5f5f4',
                }}
              >
                {eyebrow}
              </span>
              {summaryPills.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1 text-xs font-medium text-stone-300"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="space-y-3">
              <h2
                className={
                  compact ? 'text-2xl font-semibold' : 'text-3xl font-semibold md:text-4xl'
                }
              >
                {title}
              </h2>
              {showAlternateMenuName && (
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
                  Menu: {menu.name}
                </p>
              )}
              <p className="max-w-2xl text-sm leading-6 text-stone-300 md:text-base">
                {description ||
                  'Skip the long custom-menu loop. This is a menu the chef is already ready to execute and book.'}
              </p>
              {metadata.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {metadata.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-stone-700 bg-stone-900/60 px-3 py-1 text-xs font-medium text-stone-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
              {menu.description && (
                <p className="max-w-2xl text-sm leading-6 text-stone-400">{menu.description}</p>
              )}
            </div>
          </div>

          {(primaryAction || secondaryAction) && (
            <div className="flex w-full flex-col gap-3 lg:max-w-[240px]">
              {primaryAction && (
                <Link
                  href={primaryAction.href}
                  className="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  {primaryAction.label}
                </Link>
              )}
              {secondaryAction && (
                <Link
                  href={secondaryAction.href}
                  className="inline-flex items-center justify-center rounded-2xl border border-stone-700 bg-stone-900/90 px-4 py-3 text-sm font-medium text-stone-200 transition-colors hover:bg-stone-800"
                >
                  {secondaryAction.label}
                </Link>
              )}
            </div>
          )}
        </div>

        {menu.dishes.length > 0 && (
          <div className={`grid gap-3 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            {menu.dishes.map((dish) => {
              const dishName = dish.name?.trim() || dish.courseName
              const courseLabel =
                dish.name?.trim() && dish.name.trim() !== dish.courseName
                  ? `${dish.courseName}: ${dishName}`
                  : dishName

              return (
                <div
                  key={dish.id}
                  className="rounded-2xl border border-stone-800 bg-stone-900/80 px-4 py-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                    Course {dish.courseNumber}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-100">{courseLabel}</p>
                  {dish.description && (
                    <p className="mt-2 text-sm leading-6 text-stone-400">{dish.description}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
