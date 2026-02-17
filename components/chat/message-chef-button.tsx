'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Loader2 } from 'lucide-react'
import { clientGetOrCreateConversation } from '@/lib/chat/actions'

interface MessageChefButtonProps {
  variant?: 'button' | 'fab'
  context_type?: 'standalone' | 'event' | 'inquiry'
  event_id?: string
  inquiry_id?: string
  label?: string
  className?: string
}

export function MessageChefButton({
  variant = 'button',
  context_type,
  event_id,
  inquiry_id,
  label = 'Message Chef',
  className = '',
}: MessageChefButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    setLoading(true)
    try {
      const result = await clientGetOrCreateConversation({
        context_type,
        event_id,
        inquiry_id,
      })
      router.push(`/my-chat/${result.conversation.id}`)
    } catch (err) {
      console.error('Failed to start conversation:', err)
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'fab') {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-brand-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-brand-700 disabled:opacity-50 transition-all hover:shadow-xl ${className}`}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <MessageCircle className="w-5 h-5" />
        )}
        <span className="font-medium">{label}</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 disabled:opacity-50 transition-colors ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4" />
      )}
      {label}
    </button>
  )
}
