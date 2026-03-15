import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function Loading() {
  return (
    <>
      <ContextLoader contextId="nav-vendors" size="sm" className="py-0 items-start" />
      <ListPageSkeleton />
    </>
  )
}
