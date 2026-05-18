import { ContextLoader } from '@/components/ui/context-loader'

export default function Loading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-chef-cannabis-handbook" size="sm" />
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 rounded-full border-2 border-stone-700 border-t-stone-400 animate-spin" />
      </div>
    </div>
  )
}
