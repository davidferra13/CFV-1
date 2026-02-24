import { format } from 'date-fns'
import type { ChatMessage } from '@/lib/chat/types'

interface ChatSystemMessageProps {
  message: ChatMessage
}

export function ChatSystemMessage({ message }: ChatSystemMessageProps) {
  return (
    <div className="flex justify-center my-3">
      <div className="bg-stone-800 border border-stone-700 rounded-full px-4 py-1.5 max-w-[80%]">
        <p className="text-xs text-stone-500 text-center">{message.body}</p>
        <p className="text-[10px] text-stone-400 text-center mt-0.5">
          {format(new Date(message.created_at), 'MMM d, h:mm a')}
        </p>
      </div>
    </div>
  )
}
