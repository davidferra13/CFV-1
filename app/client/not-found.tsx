// Client Portal Not Found
// Shown when a portal token is invalid, revoked, or not found.
// The chef generates a new link to restore access.

export default function ClientPortalNotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-stone-200">
          <svg
            className="w-8 h-8 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-stone-200">Link Not Found</h1>
          <p className="text-sm text-stone-500 mt-2">
            This portal link may have expired or been revoked.
            Please ask your chef to send you a new link.
          </p>
        </div>
        <p className="text-xs text-stone-400">
          If you believe this is a mistake, contact your private chef directly.
        </p>
      </div>
    </div>
  )
}
