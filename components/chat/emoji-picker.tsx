'use client'

import { useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

const EMOJI_CATEGORIES = [
  {
    name: 'Mais usados',
    emojis: ['😀', '😂', '❤️', '👍', '🙏', '😊', '🔥', '😍', '👏', '🎉', '💪', '😘', '🤝', '✅', '💯', '🙌', '😉', '🤣', '💕', '👋'],
  },
  {
    name: 'Rostos',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🫢', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫠', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
  },
  {
    name: 'Gestos',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '💪'],
  },
  {
    name: 'Corações',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  },
  {
    name: 'Objetos',
    emojis: ['⭐', '🌟', '✨', '💫', '🎯', '🎊', '🎉', '🎁', '🏆', '🥇', '📌', '📎', '✏️', '📝', '📅', '⏰', '💡', '🔔', '📢', '💬', '💭', '🗨️', '✅', '❌', '⚠️', '🚀', '💰', '📱', '💻', '📧'],
  },
]

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 right-0 mb-2 mx-3"
    >
      <div className="bg-popover border rounded-lg shadow-lg overflow-hidden w-80">
        <ScrollArea className="h-64 p-3">
          {EMOJI_CATEGORIES.map((category) => (
            <div key={category.name} className="mb-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1.5">
                {category.name}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {category.emojis.map((emoji, i) => (
                  <button
                    key={`${category.name}-${i}`}
                    onClick={() => onSelect(emoji)}
                    className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent text-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>
    </div>
  )
}
