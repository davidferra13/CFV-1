'use client'

import { useState, useTransition } from 'react'
import { generateGroceryList } from '@/lib/grocery/generate-grocery-list'
import type { GroceryListData } from '@/lib/grocery/generate-grocery-list'
import { GroceryListView } from './grocery-list-view'

interface GroceryListButtonProps {
  eventId: string
  hasMenu: boolean // whether the event has a menu with recipes
}

export function GroceryListButton({ eventId, hasMenu }: GroceryListButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [groceryData, setGroceryData] = useState<GroceryListData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleGenerate = () => {
    setError(null)
    startTransition(async () => {
      try {
        const data = await generateGroceryList(eventId)
        setGroceryData(data)
        setIsOpen(true)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to generate grocery list. Please try again.'
        )
        setGroceryData(null)
      }
    })
  }

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={!hasMenu || isPending}
        title={
          !hasMenu
            ? 'Add a menu with recipes to generate a grocery list'
            : 'Generate grocery list from event menu'
        }
        className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          !hasMenu
            ? 'cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400'
            : isPending
              ? 'border border-gray-200 bg-gray-50 text-gray-500'
              : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        {isPending ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
              />
            </svg>
            Grocery List
          </>
        )}
      </button>

      {error && <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Grocery List Panel */}
      {isOpen && groceryData && (
        <div className="fixed inset-0 z-50 overflow-hidden print:static print:overflow-visible">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 transition-opacity print:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-over panel */}
          <div className="absolute inset-y-0 right-0 flex max-w-full print:static print:max-w-none">
            <div className="relative w-screen max-w-lg print:max-w-none">
              <div className="flex h-full flex-col overflow-y-auto bg-white shadow-xl print:shadow-none">
                {/* Close button */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 print:hidden">
                  <h2 className="text-lg font-semibold text-gray-900">Grocery List</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-md p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 px-6 py-4">
                  <GroceryListView data={groceryData} eventId={eventId} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
