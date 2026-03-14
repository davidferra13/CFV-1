import { PushDinnerBuilder } from '@/components/campaigns/push-dinner-builder'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

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
