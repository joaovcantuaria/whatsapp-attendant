/**
 * Baileys WhatsApp Manager
 * 
 * IMPORTANTE: Baileys requer um processo Node.js persistente.
 * Em produção, isso deve rodar em um servidor dedicado (VPS, EC2, etc.)
 * e não em serverless (Vercel Functions tem timeout de 10s).
 * 
 * Para desenvolvimento/teste local, funciona normalmente.
 * Em produção, considere:
 * - Servidor Node.js separado (PM2 + Express)
 * - Docker container
 * - AWS EC2 / DigitalOcean Droplet
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  BaileysEventMap,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import fs from 'fs'

interface BaileysInstance {
  socket: WASocket | null
  qr: string | null
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_ready'
  phone: string | null
  name: string | null
  lastUpdated: number
}

// Store sessions per company
const instances: Map<string, BaileysInstance> = new Map()

export function getInstanceStatus(companyId: string): BaileysInstance {
  return instances.get(companyId) || {
    socket: null,
    qr: null,
    status: 'disconnected',
    phone: null,
    name: null,
    lastUpdated: Date.now(),
  }
}

export function getQRCode(companyId: string): string | null {
  return instances.get(companyId)?.qr || null
}

export async function connectBaileys(companyId: string): Promise<{ qr?: string; status: string }> {
  // If already connected, return status
  const existing = instances.get(companyId)
  if (existing?.status === 'connected') {
    return { status: 'connected' }
  }

  const authDir = path.join(process.cwd(), '.baileys-sessions', companyId)
  
  // Ensure directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir)

  const instance: BaileysInstance = {
    socket: null,
    qr: null,
    status: 'connecting',
    phone: null,
    name: null,
    lastUpdated: Date.now(),
  }
  instances.set(companyId, instance)

  const socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['BoraGerir Chat', 'Chrome', '120.0.0'],
  })

  instance.socket = socket

  // Handle connection updates
  socket.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      instance.qr = qr
      instance.status = 'qr_ready'
      instance.lastUpdated = Date.now()
    }

    if (connection === 'close') {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode
      
      if (reason === DisconnectReason.loggedOut) {
        // Session invalidated, clean up
        instance.status = 'disconnected'
        instance.qr = null
        instance.socket = null
        instance.phone = null
        instance.name = null
        instances.set(companyId, instance)
        
        // Remove auth files
        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true })
        }
      } else {
        // Reconnect on other errors
        instance.status = 'connecting'
        instance.lastUpdated = Date.now()
        // Auto-reconnect after 3s
        setTimeout(() => connectBaileys(companyId), 3000)
      }
    }

    if (connection === 'open') {
      instance.status = 'connected'
      instance.qr = null
      instance.lastUpdated = Date.now()
      
      // Get connected phone info
      const user = socket.user
      if (user) {
        instance.phone = user.id.split(':')[0] || null
        instance.name = user.name || null
      }
    }
  })

  // Save credentials on update
  socket.ev.on('creds.update', saveCreds)

  // Handle incoming messages
  socket.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
    if (type !== 'notify') return

    for (const msg of msgs) {
      if (msg.key.fromMe) continue // Skip own messages
      
      const phone = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || ''
      const content = msg.message?.conversation 
        || msg.message?.extendedTextMessage?.text 
        || ''

      if (!phone || !content) continue

      // Here you would save to your database
      // This is where you integrate with your existing conversation system
      console.log(`[Baileys ${companyId}] Message from ${phone}: ${content}`)
      
      // TODO: Save to supabase conversations/messages table
      // await saveIncomingMessage(companyId, phone, content, msg)
    }
  })

  return { qr: instance.qr || undefined, status: instance.status }
}

export async function disconnectBaileys(companyId: string): Promise<void> {
  const instance = instances.get(companyId)
  if (instance?.socket) {
    await instance.socket.logout()
    instance.socket = null
    instance.status = 'disconnected'
    instance.qr = null
    instance.phone = null
    instance.name = null
    instances.set(companyId, instance)
  }
}

export async function sendMessageBaileys(
  companyId: string,
  phone: string,
  message: string
): Promise<boolean> {
  const instance = instances.get(companyId)
  if (!instance?.socket || instance.status !== 'connected') {
    return false
  }

  try {
    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
    await instance.socket.sendMessage(jid, { text: message })
    return true
  } catch (error) {
    console.error(`[Baileys ${companyId}] Send error:`, error)
    return false
  }
}
