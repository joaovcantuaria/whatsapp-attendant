// Servidor WhatsApp por QR Code (Baileys) na VPS.
// Para trocar de servidor sem mexer no código, defina na Vercel:
//   WHATSAPP_SERVER_URL      ex.: http://IP-DA-VPS:3001
//   WHATSAPP_SERVER_API_KEY  a mesma API_KEY do .env da VPS
// Sem as variáveis, valem os valores antigos.
export const WHATSAPP_SERVER_URL = (process.env.WHATSAPP_SERVER_URL || 'http://169.58.36.33:3001').replace(/\/$/, '')
export const WHATSAPP_SERVER_API_KEY = process.env.WHATSAPP_SERVER_API_KEY || 'boragerir-whatsapp-server-2026'
