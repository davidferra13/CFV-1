'use client'
import { useTheme } from 'next-themes'
import { Moon, Sun } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

interface ThemeToggleProps {
  className?: string
  dataTestId?: string
}

export function ThemeToggle({ className = '', dataTestId = 'theme-toggle' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = resolvedTheme === 'dark'
  const nextTheme = isDark ? 'light' : 'dark'

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={isDark}
      title={`Switch to ${nextTheme} mode`}
      data-testid={dataTestId}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
