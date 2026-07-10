'use client'

import { useQuickReplies } from '@/hooks/use-quick-replies'
import { ScrollArea } from '@/components/ui/scroll-area'

interface QuickReplyPickerProps {
  query: string
  onSelect: (content: string) => void
  onClose: () => void
}

export function QuickReplyPicker({ query, onSelect, onClose }: QuickReplyPickerProps) {
  const { filterByQuery } = useQuickReplies()
  const filtered = filterByQuery(query)

  if (filtered.length === 0) {
    return null
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 mx-3">
      <div className="bg-popover border rounded-lg shadow-lg overflow-hidden">
        <ScrollArea className="max-h-48">
          {filtered.map((reply) => (
            <button
              key={reply.id}
              onClick={() => onSelect(reply.content)}
              className="w-full px-4 py-2 text-left hover:bg-accent transition-colors border-b last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{reply.title}</span>
                {reply.shortcut && (
                  <span className="text-xs text-muted-foreground">/{reply.shortcut}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {reply.content}
              </p>
            </button>
          ))}
        </ScrollArea>
      </div>
    </div>
  )
}
