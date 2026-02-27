// Public Pages Loading Page
export default function PublicLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        {/* Spinner */}
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>

        {/* Loading Text */}
        <p className="text-stone-300 text-sm">Loading...</p>
      </div>
    </div>
  )
}
