'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MenuUploadZone } from '@/components/menus/menu-upload-zone'
import { UploadReviewPanel } from '@/components/menus/upload-review-panel'
import Link from 'next/link'

interface UploadJob {
  id: string
  file_name: string
  file_type: string
  status: string
  dishes_found: number | null
  dishes_approved: number | null
  error_message: string | null
  created_at: string
  parsed_dishes: unknown
  extracted_text: string | null
}

interface MenuUploadClientProps {
  initialJobs: UploadJob[]
}

export function MenuUploadClient({ initialJobs }: MenuUploadClientProps) {
  const router = useRouter()
  const [reviewJobId, setReviewJobId] = useState<string | null>(null)
  const [reviewJob, setReviewJob] = useState<UploadJob | null>(null)

  const handleFilesProcessed = useCallback(
    (jobId: string) => {
      router.refresh()
    },
    [router]
  )

  const handlePastedText = useCallback(
    async (text: string) => {
      try {
        const response = await fetch('/api/menus/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pastedText: text }),
        })

        if (!response.ok) throw new Error('Failed to parse text')

        const result = await response.json()
        router.refresh()
        // Open review for this job
        setReviewJobId(result.jobId)
        setReviewJob({
          id: result.jobId,
          file_name: 'Pasted Text',
          file_type: 'text',
          status: 'review',
          dishes_found: result.dishes?.length ?? 0,
          dishes_approved: null,
          error_message: null,
          created_at: new Date().toISOString(),
          parsed_dishes: result.dishes,
          extracted_text: text,
        })
      } catch (err) {
        console.error('Parse failed:', err)
      }
    },
    [router]
  )

  const handleReviewJob = useCallback((job: UploadJob) => {
    setReviewJobId(job.id)
    setReviewJob(job)
  }, [])

  const handleReviewComplete = useCallback(() => {
    setReviewJobId(null)
    setReviewJob(null)
    router.refresh()
  }, [router])

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      uploaded: 'bg-stone-800 text-stone-400',
      extracting: 'bg-brand-900/50 text-brand-400',
      parsing: 'bg-brand-900/50 text-brand-400',
      review: 'bg-amber-900/50 text-amber-400',
      completed: 'bg-green-900/50 text-green-400',
      failed: 'bg-red-900/50 text-red-400',
    }
    return styles[status] || styles.uploaded
  }

  // Active review
  if (reviewJobId && reviewJob) {
    const parsedDishes =
      (reviewJob.parsed_dishes as Array<{
        dish_name: string
        course: string
        description: string
        dietary_tags: string[]
      }>) || []

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Review: {reviewJob.file_name}</h1>
            <p className="text-stone-500 mt-1">
              Review and approve parsed dishes before adding to your index
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setReviewJobId(null)
              setReviewJob(null)
            }}
          >
            Back to Uploads
          </Button>
        </div>
        <UploadReviewPanel
          jobId={reviewJobId}
          dishes={parsedDishes}
          rawText={reviewJob.extracted_text || undefined}
          onComplete={handleReviewComplete}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Upload Menus</h1>
            <p className="text-stone-500 mt-1">
              Upload historical menus to build your Dish Index automatically
            </p>
          </div>
          <Link href="/culinary/dish-index">
            <Button variant="secondary">View Dish Index</Button>
          </Link>
        </div>
      </div>

      {/* Upload zone */}
      <MenuUploadZone onFilesProcessed={handleFilesProcessed} onPastedText={handlePastedText} />

      {/* Upload history */}
      {initialJobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-200 mb-3">Upload History</h2>
          <Card className="divide-y divide-stone-800">
            {initialJobs.map((job) => (
              <div key={job.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-300 truncate">{job.file_name}</p>
                  <p className="text-xs text-stone-600">
                    {new Date(job.created_at).toLocaleDateString()}
                    {job.dishes_found !== null && ` · ${job.dishes_found} dishes found`}
                    {job.dishes_approved !== null && ` · ${job.dishes_approved} indexed`}
                  </p>
                  {job.error_message && (
                    <p className="text-xs text-amber-500 mt-0.5">{job.error_message}</p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(job.status)}`}
                >
                  {job.status}
                </span>
                {job.status === 'review' && (
                  <Button size="sm" onClick={() => handleReviewJob(job)}>
                    Review
                  </Button>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
