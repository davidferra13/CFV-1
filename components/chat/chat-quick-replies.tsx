'use client'

const QUICK_REPLIES = [
  'Sounds great!',
  'Can we adjust the menu?',
  'I have a question',
  'When works best?',
]

interface ChatQuickRepliesProps {
  onSelect: (text: string) => void
  visible: boolean
}

export function ChatQuickReplies({ onSelect, visible }: ChatQuickRepliesProps) {
  if (!visible) return null

  return (
    <div className="px-4 py-2 border-t border-stone-800 bg-stone-800">
      <p className="text-[10px] text-stone-400 mb-1.5">Quick replies</p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_REPLIES.map((reply) => (
          <button
            key={reply}
            onClick={() => onSelect(reply)}
            className="px-3 py-1.5 text-xs font-medium text-brand-400 bg-surface border border-brand-700 rounded-full hover:bg-brand-950 transition-colors"
          >
            {reply}
          </button>
        ))}
      </div>
    </div>
  )
}
