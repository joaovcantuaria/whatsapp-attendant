import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import fs from 'fs'
import pino from 'pino'

const logger = pino({ level: 'silent' })

export interface InstanceStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_ready'
  qr: string | null
  phone: string | null
  name: string | null
}

interface Instance extends InstanceStatus {
  socket: WASocket | null
  retryCount: number
}

export class SessionManager {
  private instances: Map<string, Instance> = new Map()
  private sessionsDir: string
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor() {
    this.sessionsDir = path.join(process.cwd(), 'sessions')
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true })
    }
  }

  getStatus(instanceId: string): InstanceStatus {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      return { status: 'disconnected', qr: null, phone: null, name: null }
    }
    return {
      status: instance.status,
      qr: instance.qr,
      phone: instance.phone,
      name: instance.name,
    }
  }

  listAll(): Array<{ id: string } & InstanceStatus> {
    const result: Array<{ id: string } & InstanceStatus> = []
    this.instances.forEach((instance, id) => {
      result.push({
        id,
        status: instance.status,
        qr: null, // Don't send QR in list
        phone: instance.phone,
        name: instance.name,
      })
    })
    return result
  }

  async connect(instanceId: string): Promise<InstanceStatus> {
    const existing = this.instances.get(instanceId)
    if (existing?.status === 'connected') {
      return this.getStatus(instanceId)
    }

    const authDir = path.join(this.sessionsDir, instanceId)
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true })
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir)

    const instance: Instance = {
      socket: null,
      qr: null,
      status: 'connecting',
      phone: null,
      name: null,
      retryCount: 0,
    }
    this.instances.set(instanceId, instance)

    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger,
      browser: ['BoraGerir', 'Chrome', '120.0.0'],
      connectTimeoutMs: 60000,
      qrTimeout: 60000,
      keepAliveIntervalMs: 30000,
      retryRequestDelayMs: 250,
      markOnlineOnConnect: false,
      shouldIgnoreJid: (jid) => jid?.endsWith('@newsletter') || false,
    })

    instance.socket = socket

    // Connection updates
    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        instance.qr = qr
        instance.status = 'qr_ready'
        console.log(`[${instanceId}] QR Code gerado`)
      }

      if (connection === 'close') {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode

        if (reason === DisconnectReason.loggedOut) {
          console.log(`[${instanceId}] Sessão encerrada (logout)`)
          instance.status = 'disconnected'
          instance.socket = null
          instance.qr = null
          instance.phone = null
          instance.name = null

          // Limpar auth
          if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true })
          }
        } else if (instance.retryCount < 10) {
          instance.retryCount++
          instance.status = 'connecting'
          const delay = Math.min(5000 * Math.pow(1.5, instance.retryCount), 60000)
          console.log(`[${instanceId}] Reconectando... (tentativa ${instance.retryCount}, próxima em ${Math.round(delay / 1000)}s)`)
          setTimeout(() => this.connect(instanceId), delay)
        } else {
          console.log(`[${instanceId}] Máximo de tentativas atingido`)
          instance.status = 'disconnected'
        }
      }

      if (connection === 'open') {
        instance.status = 'connected'
        instance.qr = null
        instance.retryCount = 0

        const user = socket.user
        if (user) {
          instance.phone = user.id.split(':')[0] || null
          instance.name = user.name || null
        }
        console.log(`[${instanceId}] ✅ Conectado como ${instance.phone}`)

        // Salvar o número conectado na empresa (para filtrar conversas)
        if (instance.phone) {
          try {
            const { createClient } = await import('@supabase/supabase-js')
            const supabase = createClient(
              process.env.SUPABASE_URL || '',
              process.env.SUPABASE_SERVICE_KEY || '',
              { auth: { persistSession: false } }
            )
            await supabase
              .from('companies')
              .update({ connected_phone: instance.phone })
              .eq('id', instanceId)
            console.log(`[${instanceId}] 📱 connected_phone salvo: ${instance.phone}`)
          } catch {}
        }

        // Start heartbeat to confirm server is alive
        this.startHeartbeat(instanceId)

        // Sincronizar grupos ao conectar
        this.syncGroups(instanceId, socket)
      }
    })

    socket.ev.on('creds.update', saveCreds)

    // Incoming messages
    socket.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
      // Processar tanto mensagens em tempo real (notify) quanto offline (append)
      if (type !== 'notify' && type !== 'append') return

      for (const msg of msgs) {
        if (msg.key.fromMe) continue

        const remoteJid = msg.key.remoteJid || ''
        
        // Ignorar newsletters
        if (remoteJid.includes('@newsletter')) continue

        // Detectar se é grupo
        const isGroup = remoteJid.includes('@g.us')

        // Para grupos, buscar nome do grupo
        let groupName = ''
        if (isGroup) {
          try {
            const groupMetadata = await socket.groupMetadata(remoteJid)
            groupName = groupMetadata?.subject || ''
          } catch {}
        }

        // Extrair número de telefone do JID
        // Formato normal: 5511999999999@s.whatsapp.net
        // Formato LID (multi-device): 197801061421087@lid
        // Formato grupo: 5538999209694-1234567890@g.us
        let phone = ''
        if (isGroup) {
          // Para grupos, usar o groupJid como identificador
          phone = remoteJid.replace('@g.us', '')
        } else if (remoteJid.endsWith('@s.whatsapp.net')) {
          phone = remoteJid.replace('@s.whatsapp.net', '')
        } else if (remoteJid.endsWith('@lid') || remoteJid.includes(':')) {
          // LID format - tentar mapear para o número real usando signalRepository
          console.log(`[${instanceId}] ⚠️ Mensagem com LID JID: ${remoteJid}`)
          
          try {
            // Usar o mapeamento LID → PN (Phone Number) do Baileys
            const phoneJid = await (socket as any).signalRepository?.lidMapping?.getPNForLID(remoteJid)
            if (phoneJid) {
              // phoneJid vem como "5511999999999:0@s.whatsapp.net" ou "5511999999999@s.whatsapp.net"
              phone = phoneJid.split(':')[0].replace('@s.whatsapp.net', '')
              console.log(`[${instanceId}] ✅ LID mapeado para número real: ${phone}`)
            }
          } catch (lidError) {
            console.log(`[${instanceId}] ⚠️ Erro ao mapear LID: ${lidError}`)
          }

          // Fallback: tentar extrair do formato numero:device@s.whatsapp.net
          if (!phone) {
            const colonSplit = remoteJid.split(':')
            if (colonSplit[0] && /^\d{10,15}$/.test(colonSplit[0])) {
              phone = colonSplit[0]
            } else {
              // Último recurso: usar o LID como identificador (não ideal mas mantém o contato rastreável)
              phone = remoteJid.replace('@lid', '').replace(/@.*$/, '')
              console.log(`[${instanceId}] ⚠️ Usando LID como phone (sem mapeamento): ${phone}`)
            }
          }
        } else {
          phone = remoteJid.replace(/@.*$/, '')
        }

        if (!phone) continue

        // Ignorar mensagens de protocolo/sistema sem conteúdo real
        if (!msg.message) continue
        if (msg.message.protocolMessage || 
            msg.message.senderKeyDistributionMessage ||
            msg.message.messageContextInfo ||
            msg.message.reactionMessage ||
            msg.messageStubType) continue

        const content =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          ''

        // Detectar tipo de mensagem
        let messageType = 'text'
        let mediaData: string | null = null

        if (msg.message?.imageMessage) {
          messageType = 'image'
        } else if (msg.message?.videoMessage) {
          messageType = 'video'
        } else if (msg.message?.audioMessage) {
          messageType = 'audio'
        } else if (msg.message?.documentMessage) {
          messageType = 'document'
        } else if (msg.message?.stickerMessage) {
          messageType = 'sticker'
        }

        // Ignorar mensagens de texto vazias (sem conteúdo e sem mídia)
        if (messageType === 'text' && !content) continue

        // Para stickers e imagens, baixar e salvar como base64 data URI
        if (messageType === 'sticker' || messageType === 'image' || messageType === 'audio' || messageType === 'video') {
          try {
            const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
            const buffer = await downloadMediaMessage(msg, 'buffer', {})
            if (buffer) {
              const mimeType = 
                msg.message?.stickerMessage?.mimetype ||
                msg.message?.imageMessage?.mimetype ||
                msg.message?.audioMessage?.mimetype ||
                msg.message?.videoMessage?.mimetype ||
                'application/octet-stream'
              mediaData = `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`
            }
          } catch (dlError) {
            console.log(`[${instanceId}] ⚠️ Erro ao baixar mídia: ${dlError}`)
          }
        }

        const pushName = msg.pushName || ''
        const timestamp = msg.messageTimestamp
          ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
          : new Date().toISOString()

        console.log(`[${instanceId}] 📩 ${phone}: ${content.substring(0, 50)}`)

        // Salvar no Supabase
        try {
          const { saveMessageToSupabase, updateContactName } = await import('./supabase')
          await saveMessageToSupabase({
            instanceId,
            phone,
            content,
            pushName: isGroup ? (groupName || pushName) : pushName,
            timestamp,
            fromMe: false,
            messageId: msg.key.id || '',
            type: messageType,
            mediaUrl: mediaData,
            isGroup,
          })

          // Atualizar nome do contato se veio pushName
          if (pushName) {
            const { updateContactName } = await import('./supabase')
            await updateContactName(instanceId, phone, pushName)
          }
        } catch (error) {
          console.error(`[${instanceId}] Erro ao salvar mensagem:`, error)
        }
      }
    })

    // Message receipt updates (delivered, read)
    socket.ev.on('message-receipt.update', async (updates) => {
      for (const update of updates) {
        const messageId = update.key.id
        if (!messageId) continue

        let status: string | null = null
        if (update.receipt.receiptTimestamp) {
          // Receipt timestamp means delivered
          status = 'delivered'
        }
        if (update.receipt.readTimestamp) {
          status = 'read'
        }

        if (!status) continue

        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_KEY || '',
            { auth: { persistSession: false } }
          )

          await supabase
            .from('messages')
            .update({ status })
            .eq('whatsapp_message_id', messageId)

          console.log(`[${instanceId}] 📬 Status atualizado: ${messageId} → ${status}`)
        } catch (err) {
          console.log(`[${instanceId}] ⚠️ Erro ao atualizar status: ${err}`)
        }
      }
    })

    // Message update events (also captures status changes)
    socket.ev.on('messages.update', async (updates) => {
      for (const update of updates) {
        const messageId = update.key.id
        if (!messageId || !update.update) continue

        let status: string | null = null
        if (update.update.status === 2) status = 'delivered' // SERVER_ACK
        if (update.update.status === 3) status = 'delivered' // DELIVERY_ACK
        if (update.update.status === 4) status = 'read'      // READ

        if (!status) continue

        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_KEY || '',
            { auth: { persistSession: false } }
          )

          await supabase
            .from('messages')
            .update({ status })
            .eq('whatsapp_message_id', messageId)

          console.log(`[${instanceId}] 📬 Status (messages.update): ${messageId} → ${status}`)
        } catch (err) {
          console.log(`[${instanceId}] ⚠️ Erro status update: ${err}`)
        }
      }
    })

    return this.getStatus(instanceId)
  }

  private startHeartbeat(instanceId: string) {
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(async () => {
      const instance = this.instances.get(instanceId)
      if (!instance || instance.status !== 'connected') {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
        return
      }

      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || '',
          { auth: { persistSession: false } }
        )
        await supabase
          .from('companies')
          .select('id')
          .limit(1)
          .maybeSingle()
        console.log(`[${instanceId}] 💓 Heartbeat OK`)
      } catch (err) {
        console.log(`[${instanceId}] ⚠️ Heartbeat failed: ${err}`)
      }
    }, 60000)
  }

  private async syncGroups(instanceId: string, socket: WASocket) {
    try {
      console.log(`[${instanceId}] 🔄 Sincronizando grupos...`)
      const groups = await socket.groupFetchAllParticipating()
      
      if (!groups || Object.keys(groups).length === 0) {
        console.log(`[${instanceId}] Nenhum grupo encontrado`)
        return
      }

      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_KEY || '',
        { auth: { persistSession: false } }
      )

      // Buscar company_id
      let companyId: string | null = null
      if (instanceId && instanceId !== 'default') {
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('id', instanceId)
          .maybeSingle()
        companyId = company?.id || null
      }
      if (!companyId && process.env.DEFAULT_COMPANY_ID) {
        companyId = process.env.DEFAULT_COMPANY_ID
      }
      if (!companyId) {
        const { data: latestCompany } = await supabase
          .from('companies')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        companyId = latestCompany?.id || null
      }
      if (!companyId) return

      let syncCount = 0
      for (const [jid, group] of Object.entries(groups)) {
        const groupPhone = jid.replace('@g.us', '')
        const groupName = group.subject || 'Grupo sem nome'

        // Buscar ou criar contato para o grupo
        let { data: contact } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone', groupPhone)
          .eq('company_id', companyId)
          .maybeSingle()

        if (!contact) {
          const { data: newContact } = await supabase
            .from('contacts')
            .insert({ phone: groupPhone, name: groupName, company_id: companyId })
            .select('id')
            .single()
          contact = newContact
        } else {
          // Atualizar nome do grupo se mudou
          await supabase
            .from('contacts')
            .update({ name: groupName })
            .eq('id', contact.id)
        }

        if (!contact) continue

        // Verificar se já tem conversa para este grupo
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('contact_id', contact.id)
          .eq('company_id', companyId)
          .eq('channel', 'whatsapp_group')
          .maybeSingle()

        if (!existingConv) {
          await supabase
            .from('conversations')
            .insert({
              contact_id: contact.id,
              company_id: companyId,
              channel: 'whatsapp_group',
              status: 'open',
              last_message: null,
              last_message_at: new Date().toISOString(),
            })
          syncCount++
        }
      }

      console.log(`[${instanceId}] ✅ ${syncCount} novos grupos sincronizados (${Object.keys(groups).length} total)`)
    } catch (error) {
      console.error(`[${instanceId}] ⚠️ Erro ao sincronizar grupos:`, error)
    }
  }

  async disconnect(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId)
    if (instance?.socket) {
      try {
        await instance.socket.logout()
      } catch {}
      instance.socket = null
      instance.status = 'disconnected'
      instance.qr = null
      instance.phone = null
      instance.name = null
    }
  }

  async sendText(instanceId: string, phone: string, message: string, skipSave: boolean = false): Promise<string | false> {
    const instance = this.instances.get(instanceId)
    if (!instance?.socket || instance.status !== 'connected') return false

    try {
      const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
      const sent = await instance.socket.sendMessage(jid, { text: message })
      const sentMessageId = sent?.key?.id || `sent_${Date.now()}`

      // Salvar mensagem enviada no Supabase (pular se já será salvo pelo caller)
      if (!skipSave) {
        try {
          const { saveMessageToSupabase } = await import('./supabase')
          await saveMessageToSupabase({
            instanceId,
            phone: phone.replace('@s.whatsapp.net', ''),
            content: message,
            pushName: '',
            timestamp: new Date().toISOString(),
            fromMe: true,
            messageId: sentMessageId,
          })
        } catch {}
      }

      return sentMessageId
    } catch (error) {
      console.error(`[${instanceId}] Erro ao enviar:`, error)
      return false
    }
  }

  async sendMedia(
    instanceId: string,
    phone: string,
    mediaUrl: string,
    caption?: string,
    type?: string
  ): Promise<boolean> {
    const instance = this.instances.get(instanceId)
    if (!instance?.socket || instance.status !== 'connected') return false

    try {
      const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
      
      const mediaType = type || 'image'
      const messageContent: any = {}

      if (mediaType === 'image') {
        messageContent.image = { url: mediaUrl }
        if (caption) messageContent.caption = caption
      } else if (mediaType === 'video') {
        messageContent.video = { url: mediaUrl }
        if (caption) messageContent.caption = caption
      } else if (mediaType === 'audio') {
        messageContent.audio = { url: mediaUrl }
        messageContent.mimetype = 'audio/mpeg'
      } else if (mediaType === 'document') {
        messageContent.document = { url: mediaUrl }
        messageContent.fileName = caption || 'document'
      }

      await instance.socket.sendMessage(jid, messageContent)
      return true
    } catch (error) {
      console.error(`[${instanceId}] Erro ao enviar mídia:`, error)
      return false
    }
  }
}
