import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 p-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-muted-foreground text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <Link href="/" className="w-full">
          <Button variant="primary" className="w-full">
            Go Home
          </Button>
        </Link>
        <div className="flex gap-2 w-full">
          <Link href="/chefs" className="flex-1">
            <Button variant="secondary" className="w-full">
              Browse Chefs
            </Button>
          </Link>
          <Link href="/book" className="flex-1">
            <Button variant="secondary" className="w-full">
              Book a Chef
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
