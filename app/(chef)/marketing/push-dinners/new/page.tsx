import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ChevronLeft } from '@/components/ui/icons'

const PushDinnerBuilder = dynamic(
  () => import('@/components/campaigns/push-dinner-builder').then((m) => m.PushDinnerBuilder),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="h-10 rounded-lg bg-stone-800 animate-pulse" />
        <div className="h-48 rounded-lg bg-stone-800 animate-pulse" />
      </div>
    ),
  }
)

export default function NewPushDinnerPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/marketing/push-dinners"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Push Dinners
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-200">Create a push dinner</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Build the concept, pick who to invite, review auto-drafted personal messages, then choose
          how to share it.
        </p>
      </div>

      <PushDinnerBuilder />
    </div>
  )
}
