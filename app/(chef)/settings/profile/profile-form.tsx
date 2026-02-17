// Profile Form - Edit chef network profile fields
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { updateChefProfile } from '@/lib/network/actions'

interface ProfileFormProps {
  profile: {
    display_name: string | null
    business_name: string
    bio: string | null
    profile_image_url: string | null
  }
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [profileImageUrl, setProfileImageUrl] = useState(profile.profile_image_url ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        await updateChefProfile({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          profile_image_url: profileImageUrl.trim() || null,
        })
        setSuccess(true)
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Failed to update profile')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-700">Profile updated successfully.</p>
            </div>
          )}

          <Input
            label="Display Name"
            placeholder={profile.business_name}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            helperText={`If left blank, your business name "${profile.business_name}" will be shown instead.`}
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Bio
            </label>
            <textarea
              placeholder="Tell other chefs a bit about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <p className="mt-1.5 text-sm text-stone-500">{bio.length}/500 characters</p>
          </div>

          <Input
            label="Profile Image URL"
            type="url"
            placeholder="https://example.com/your-photo.jpg"
            value={profileImageUrl}
            onChange={(e) => setProfileImageUrl(e.target.value)}
            helperText="Link to a profile photo. If blank, your initials will be shown."
          />

          {/* Preview */}
          <div className="pt-2 border-t border-stone-100">
            <p className="text-sm font-medium text-stone-700 mb-2">Preview</p>
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Preview"
                  className="h-10 w-10 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center">
                  <span className="text-xs font-semibold text-brand-700">
                    {(displayName || profile.business_name)
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  {displayName.trim() || profile.business_name}
                </p>
                {bio.trim() && (
                  <p className="text-xs text-stone-500 line-clamp-1">{bio.trim()}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={isPending}>
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
