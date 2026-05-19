import type { Metadata, Viewport } from 'next'
import './globals.css'
import PWARegister from '@/components/PWARegister'

export const metadata: Metadata = {
  title: 'nido — tu internet, organizado',
  description: 'Tu hogar personal de internet',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'nido',
  },
}

export const viewport: Viewport = {
  themeColor: '#0E0E0F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
