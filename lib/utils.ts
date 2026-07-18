import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { WindowStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(phone: string): string {
  // Remove country code prefix and format
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 13) {
    // Brazilian format: +55 (11) 99999-9999
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
  }
  return `+${cleaned}`
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) return 'agora'
  if (diffInMinutes < 60) return `${diffInMinutes}min`
  if (diffInHours < 24) return `${diffInHours}h`
  if (diffInDays < 7) return `${diffInDays}d`
  
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function formatMessageTime(dateString: string): string {
  // Garantir que a data é interpretada como UTC se não tiver timezone
  let date: Date
  if (dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('T')) {
    date = new Date(dateString)
  } else {
    date = new Date(dateString + 'Z')
  }
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function getWindowStatus(lastMessageAt: string | null): WindowStatus {
  if (!lastMessageAt) return 'closed'
  
  const lastMessage = new Date(lastMessageAt)
  const now = new Date()
  const diffInHours = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60)

  if (diffInHours > 24) return 'closed'
  if (diffInHours > 23) return 'expiring'
  return 'open'
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const rows: Record<string, string>[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }
  
  return rows
}
