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
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(dateString)) {
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
  if (lines.length < 1) return []
  
  // Parser que respeita aspas (campos com vírgulas dentro de aspas)
  function parseLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const firstLineValues = parseLine(lines[0]).map(v => v.toLowerCase().replace(/['"]/g, '').trim())
  
  // Detectar se a primeira linha é cabeçalho (contém palavras-chave conhecidas)
  const knownHeaders = ['phone', 'telefone', 'tel', 'celular', 'whatsapp', 'numero', 'número', 'fone', 'name', 'nome', 'email', 'razao_social', 'empresa', 'cliente']
  const hasHeader = firstLineValues.some(v => knownHeaders.includes(v))
  
  let headers: string[]
  let dataStartIndex: number

  if (hasHeader) {
    headers = firstLineValues
    dataStartIndex = 1
  } else {
    // Sem cabeçalho — detectar automaticamente quais colunas têm telefone, nome, email
    // Analisar primeira linha de dados para inferir colunas
    const sampleValues = parseLine(lines[0])
    headers = sampleValues.map((val, idx) => {
      const clean = val.replace(/['"]/g, '').trim()
      const digitsOnly = clean.replace(/\D/g, '')
      
      // Detectar telefone: tem 10-13 dígitos, ou começa com +55, ou formato (XX) XXXXX
      if (digitsOnly.length >= 10 && digitsOnly.length <= 13) return 'phone'
      if (/^\+?\d{10,13}$/.test(digitsOnly)) return 'phone'
      if (/\(\d{2}\)\s*\d{4,5}/.test(clean)) return 'phone'
      
      // Detectar email
      if (clean.includes('@') && clean.includes('.')) return 'email'
      
      // O restante pode ser nome (primeira coluna com texto não-numérico e curta)
      return `col_${idx}`
    })
    
    // Se não encontrou 'phone', procurar a coluna com mais dígitos
    if (!headers.includes('phone')) {
      let bestPhoneIdx = -1
      let bestDigitCount = 0
      sampleValues.forEach((val, idx) => {
        const digits = val.replace(/\D/g, '').length
        if (digits >= 10 && digits > bestDigitCount) {
          bestDigitCount = digits
          bestPhoneIdx = idx
        }
      })
      if (bestPhoneIdx >= 0) headers[bestPhoneIdx] = 'phone'
    }
    
    // Primeira coluna com texto (não phone/email) = nome
    const nameIdx = headers.findIndex((h, idx) => {
      if (h === 'phone' || h === 'email') return false
      const val = sampleValues[idx]?.replace(/['"]/g, '').trim() || ''
      return val.length > 0 && val.replace(/\d/g, '').length > val.length * 0.5
    })
    if (nameIdx >= 0) headers[nameIdx] = 'name'
    
    dataStartIndex = 0
  }
  
  const rows: Record<string, string>[] = []
  
  for (let i = dataStartIndex; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = (values[index] || '').replace(/^["']|["']$/g, '').trim()
    })
    rows.push(row)
  }
  
  return rows
}
