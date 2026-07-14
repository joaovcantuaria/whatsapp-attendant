const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0'

function getHeaders() {
  return {
    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export async function sendTextMessage(phone: string, text: string) {
  const url = `${WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { preview_url: true, body: text },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Meta API Error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

export async function sendImageMessage(phone: string, imageUrl: string, caption?: string) {
  const url = `${WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'image',
      image: { link: imageUrl, caption },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Meta API Error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

export async function sendDocumentMessage(phone: string, documentUrl: string, filename: string) {
  const url = `${WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'document',
      document: { link: documentUrl, filename },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Meta API Error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

export async function sendAudioMessage(phone: string, audioUrl: string) {
  const url = `${WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'audio',
      audio: { link: audioUrl },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Meta API Error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  language: string,
  components?: Record<string, unknown>[]
) {
  const url = `${WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Meta API Error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

export async function getMediaUrl(mediaId: string) {
  const url = `${WHATSAPP_API_URL}/${mediaId}`
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Meta API Error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  return data.url as string
}

export async function downloadMedia(mediaUrl: string) {
  const response = await fetch(mediaUrl, {
    headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  })

  if (!response.ok) {
    throw new Error('Failed to download media')
  }

  return response
}

export async function uploadMedia(file: Buffer, mimeType: string, filename: string) {
  const url = `${WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`
  
  const formData = new FormData()
  formData.append('messaging_product', 'whatsapp')
  formData.append('file', new Blob([new Uint8Array(file)], { type: mimeType }), filename)
  formData.append('type', mimeType)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Meta API Error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

export async function createTemplate(templateData: {
  name: string
  language: string
  category: string
  components: Record<string, unknown>[]
}) {
  const url = `${WHATSAPP_API_URL}/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(templateData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Meta API Error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

export async function getTemplates() {
  const url = `${WHATSAPP_API_URL}/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`
  
  const response = await fetch(url, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Meta API Error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

export async function markMessageAsRead(messageId: string) {
  const url = `${WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  })

  return response.ok
}
