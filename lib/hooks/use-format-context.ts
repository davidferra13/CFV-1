'use client'

import { createContext, useContext } from 'react'

export interface FormatContext {
  locale: string
  currency: string
  timezone: string
  measurementSystem: 'imperial' | 'metric'
}

export const DEFAULT_FORMAT_CONTEXT: FormatContext = {
  locale: 'en-US',
  currency: 'USD',
  timezone: 'America/New_York',
  measurementSystem: 'imperial',
}

const FormatCtx = createContext<FormatContext>(DEFAULT_FORMAT_CONTEXT)

export const FormatProvider = FormatCtx.Provider

export function useFormatContext(): FormatContext {
  return useContext(FormatCtx)
}
