export default function SurveyLoading() {
  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-stone-700 border-t-amber-500" />
        <p className="text-sm text-stone-400">Opening your feedback link...</p>
      </div>
    </div>
  )
}
