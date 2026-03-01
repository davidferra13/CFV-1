// 404 Not Found Page
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle warm glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] rounded-full bg-brand-500/[0.03] blur-[80px]" />
      </div>
      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-24 h-24 flex items-center justify-center rounded-full bg-brand-950">
            <span className="text-4xl font-bold text-brand-400">404</span>
          </div>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-stone-400">
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
