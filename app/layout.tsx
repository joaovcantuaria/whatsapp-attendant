import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'BoraGerir Conversas - Atendimento via WhatsApp',
  description: 'Sistema completo de atendimento via WhatsApp para sua equipe',
  manifest: '/manifest.json',
  themeColor: '#F26522',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BoraGerir',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: '/icon-app.png',
    shortcut: '/icon-app.png',
    apple: '/icon-app.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="application-name" content="BoraGerir" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BoraGerir" />
        <link rel="apple-touch-icon" href="/icon-app.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-app.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-app.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icon-app.png" />
        <link rel="icon" type="image/png" href="/icon-app.png" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {})
                })
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
