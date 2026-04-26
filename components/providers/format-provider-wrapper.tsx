'use client'

import { FormatProvider, type FormatContext } from '@/lib/hooks/use-format-context'

export function FormatProviderWrapper({
  value,
  children,
}: {
  value: FormatContext
  children: React.ReactNode
}) {
  return <FormatProvider value={value}>{children}</FormatProvider>
}
