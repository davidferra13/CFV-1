'use client'

import { useState } from 'react'

type FirstClientStepProps = {
  onComplete: (data: Record<string, unknown>) => void
  onSkip: () => void
}

export function FirstClientStep({ onComplete, onSkip }: FirstClientStepProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dietary, setDietary] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onComplete({ clientName: name, clientEmail: email, clientPhone: phone, dietaryRestrictions: dietary })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Add your first client</h2>
        <p className="mt-1 text-sm text-gray-500">
          Get started by adding a client you already work with, or skip and add them later.
        </p>
      </div>

      <div>
        <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
          Client Name *
        </label>
        <input
          id="clientName"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sarah Johnson"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      <div>
        <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="clientEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="sarah@example.com"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      <div>
        <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700">
          Phone
        </label>
        <input
          id="clientPhone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      <div>
        <label htmlFor="dietary" className="block text-sm font-medium text-gray-700">
          Dietary Restrictions / Allergies
        </label>
        <textarea
          id="dietary"
          rows={2}
          value={dietary}
          onChange={(e) => setDietary(e.target.value)}
          placeholder="e.g. Gluten-free, nut allergy, vegetarian"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Skip - I'll add clients later
        </button>
        <button
          type="submit"
          className="rounded-md bg-orange-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          Add Client & Continue
        </button>
      </div>
    </form>
  )
}
