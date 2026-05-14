'use client'

import { IconContext } from '@phosphor-icons/react/dist/lib/context'

export function IconProvider({ children }: { children: React.ReactNode }) {
  return (
    <IconContext.Provider value={{ weight: 'duotone', size: 20 }}>{children}</IconContext.Provider>
  )
}
