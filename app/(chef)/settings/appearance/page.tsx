import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export const metadata: Metadata = { title: 'Appearance - ChefFlow' }

export default async function AppearancePage() {
  await requireChef()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100 dark:text-stone-100">Appearance</h1>
        <p className="text-stone-400 dark:text-stone-400 mt-1">
          Customize how ChefFlow looks for you
        </p>
      </div>
      <Card className="dark:bg-stone-800 dark:border-stone-700">
        <CardHeader>
          <CardTitle className="dark:text-stone-100">Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-300 dark:text-stone-300">Color Theme</p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Switch between light and dark mode
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
