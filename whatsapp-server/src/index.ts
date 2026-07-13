import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { router } from './routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: [
    'https://chat.boragerir.com',
    'http://localhost:3000',
    /\.vercel\.app$/,
  ],
}))
app.use(express.json())

// API Key middleware (skip for health check)
app.use('/api', (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'API Key inválida' })
  }
  next()
})

// Routes
app.use('/api', router)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 BoraGerir WhatsApp Server rodando na porta ${PORT}`)
})
