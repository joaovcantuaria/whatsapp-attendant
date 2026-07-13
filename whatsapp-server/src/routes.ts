import { Router } from 'express'
import { SessionManager } from './session-manager'
import QRCode from 'qrcode'

export const router = Router()
const sessions = new SessionManager()

// Criar/conectar instância
router.post('/instance/connect', async (req, res) => {
  try {
    const { instanceId } = req.body
    if (!instanceId) {
      return res.status(400).json({ error: 'instanceId obrigatório' })
    }

    const result = await sessions.connect(instanceId)
    
    let qrDataUrl: string | null = null
    if (result.qr) {
      qrDataUrl = await QRCode.toDataURL(result.qr, {
        width: 300,
        margin: 2,
      })
    }

    res.json({ status: result.status, qr: qrDataUrl })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Status da instância
router.get('/instance/status/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params
    const instance = sessions.getStatus(instanceId)
    
    let qrDataUrl: string | null = null
    if (instance.qr) {
      qrDataUrl = await QRCode.toDataURL(instance.qr, {
        width: 300,
        margin: 2,
      })
    }

    res.json({
      status: instance.status,
      qr: qrDataUrl,
      phone: instance.phone,
      name: instance.name,
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// QR Code da instância (imagem)
router.get('/instance/qr/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params
    const instance = sessions.getStatus(instanceId)
    
    if (!instance.qr) {
      return res.status(404).json({ error: 'QR não disponível' })
    }

    const qrDataUrl = await QRCode.toDataURL(instance.qr, { width: 400, margin: 2 })
    res.json({ qr: qrDataUrl })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Desconectar instância
router.post('/instance/disconnect', async (req, res) => {
  try {
    const { instanceId } = req.body
    if (!instanceId) {
      return res.status(400).json({ error: 'instanceId obrigatório' })
    }

    await sessions.disconnect(instanceId)
    res.json({ status: 'disconnected' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Reiniciar instância
router.post('/instance/restart', async (req, res) => {
  try {
    const { instanceId } = req.body
    if (!instanceId) {
      return res.status(400).json({ error: 'instanceId obrigatório' })
    }

    await sessions.disconnect(instanceId)
    const result = await sessions.connect(instanceId)
    res.json({ status: result.status })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Enviar mensagem de texto
router.post('/message/send-text', async (req, res) => {
  try {
    const { instanceId, phone, message } = req.body
    if (!instanceId || !phone || !message) {
      return res.status(400).json({ error: 'instanceId, phone e message obrigatórios' })
    }

    const sent = await sessions.sendText(instanceId, phone, message)
    if (sent) {
      res.json({ success: true })
    } else {
      res.status(400).json({ error: 'Falha ao enviar. Instância não conectada.' })
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Enviar mídia
router.post('/message/send-media', async (req, res) => {
  try {
    const { instanceId, phone, mediaUrl, caption, type } = req.body
    if (!instanceId || !phone || !mediaUrl) {
      return res.status(400).json({ error: 'instanceId, phone e mediaUrl obrigatórios' })
    }

    const sent = await sessions.sendMedia(instanceId, phone, mediaUrl, caption, type)
    if (sent) {
      res.json({ success: true })
    } else {
      res.status(400).json({ error: 'Falha ao enviar mídia.' })
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Listar todas as instâncias
router.get('/instances', (req, res) => {
  const all = sessions.listAll()
  res.json(all)
})
