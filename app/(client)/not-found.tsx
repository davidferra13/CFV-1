import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="text-muted-foreground text-sm">The page you're looking for doesn't exist.</p>
      <Link
        href="/my-events"
        className="text-brand-500 hover:text-brand-600 text-sm font-medium underline"
      >
        Go to My Events
      </Link>
    </div>
  )
}
