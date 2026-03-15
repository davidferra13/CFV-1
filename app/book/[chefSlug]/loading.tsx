import { ContextLoader } from '@/components/ui/context-loader'

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center flex-col gap-4">
      <ContextLoader contextId="nav-public-booking" size="sm" className="py-0 items-start" />
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
    </div>
  )
}
