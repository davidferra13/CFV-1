'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  PALETTES,
  DEFAULT_PALETTE_ID,
  PALETTE_STORAGE_KEY,
  getPaletteById,
  type ColorPalette,
} from '@/lib/themes/color-palettes'
import { CHEF_SHELL_RESET_EVENT } from '@/lib/chef/shell-state'

const defaultPalette = getPaletteById(DEFAULT_PALETTE_ID)

interface PaletteContextValue {
  palette: ColorPalette
  setPalette: (id: string) => void
  palettes: ColorPalette[]
}

const PaletteContext = createContext<PaletteContextValue>({
  palette: defaultPalette,
  setPalette: () => {},
  palettes: PALETTES,
})

export function usePalette() {
  return useContext(PaletteContext)
}

function applyPalette(palette: ColorPalette) {
  const style = document.documentElement.style
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
  for (const step of steps) {
    style.setProperty(`--brand-${step}`, palette.colors[step])
  }
}

export function ColorPaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<ColorPalette>(defaultPalette)

  const syncPaletteFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(PALETTE_STORAGE_KEY)
      const nextPalette = stored ? getPaletteById(stored) : defaultPalette
      setPaletteState(nextPalette)
      applyPalette(nextPalette)
    } catch {
      setPaletteState(defaultPalette)
      applyPalette(defaultPalette)
    }
  }, [])

  useEffect(() => {
    syncPaletteFromStorage()
  }, [syncPaletteFromStorage])

  useEffect(() => {
    window.addEventListener(CHEF_SHELL_RESET_EVENT, syncPaletteFromStorage)
    return () => window.removeEventListener(CHEF_SHELL_RESET_EVENT, syncPaletteFromStorage)
  }, [syncPaletteFromStorage])

  const setPalette = useCallback((id: string) => {
    const found = getPaletteById(id)
    setPaletteState(found)
    applyPalette(found)
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, id)
    } catch {
      // localStorage unavailable
    }
  }, [])

  return (
    <PaletteContext.Provider value={{ palette, setPalette, palettes: PALETTES }}>
      {children}
    </PaletteContext.Provider>
  )
}

/**
 * Blocking script to prevent flash of default palette.
 * Reads palette ID from localStorage and sets CSS vars before paint.
 * Rendered as a <script> in <head> via layout.tsx.
 */
export function PaletteScript() {
  const scriptContent = `(function(){try{var id=localStorage.getItem("${PALETTE_STORAGE_KEY}");if(!id||id==="copper")return;var p=${JSON.stringify(
    Object.fromEntries(
      PALETTES.filter((p) => p.id !== DEFAULT_PALETTE_ID).map((p) => [p.id, p.colors])
    )
  )};var c=p[id];if(!c)return;var s=document.documentElement.style;var k=[50,100,200,300,400,500,600,700,800,900,950];for(var i=0;i<k.length;i++){s.setProperty("--brand-"+k[i],c[k[i]])}}catch(e){}})()`

  return <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
}
