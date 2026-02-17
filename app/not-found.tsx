// 404 Not Found Page
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-24 h-24 flex items-center justify-center rounded-full bg-stone-100">
            <span className="text-4xl font-bold text-stone-400">404</span>
          </div>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-stone-600">
            Sorry, the page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/">
            <Button variant="primary" className="w-full">
              Go Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
