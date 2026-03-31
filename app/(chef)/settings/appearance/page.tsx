import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { ColorPalettePicker } from '@/components/settings/color-palette-picker'

export const metadata: Metadata = { title: 'Appearance' }

export default async function AppearancePage() {
  await requireChef()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Appearance</h1>
        <p className="text-stone-400 mt-1">Theme, color palette, and display preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Color Palette</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500 mb-4">
            Choose a color palette for your ChefFlow workspace. This only changes what you see.
          </p>
          <ColorPalettePicker />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Color Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-300">Light / Dark</p>
              <p className="text-sm text-stone-500">Switch between light and dark mode</p>
            </div>
            <ThemeToggle dataTestId="appearance-theme-toggle" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
