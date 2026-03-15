// Public Client Intake Form Page
// No auth required - accessed via share token
// Standalone page with no navigation chrome

import { notFound } from 'next/navigation'
import { getIntakeFormByToken } from '@/lib/clients/intake-actions'
import { IntakeFormClient } from '@/components/clients/intake-form-client'

export default async function IntakeFormPage({ params }: { params: { token: string } }) {
  const result = await getIntakeFormByToken(params.token)

  if (!result) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">{result.form.name}</h1>
          {result.form.description && (
            <p className="text-sm text-stone-500 mt-2 max-w-lg mx-auto">
              {result.form.description}
            </p>
          )}
        </div>

        <IntakeFormClient form={result.form} share={result.share} shareToken={params.token} />

        <p className="text-center text-xs text-stone-400 mt-8">Powered by ChefFlow</p>
      </div>
    </div>
  )
}
