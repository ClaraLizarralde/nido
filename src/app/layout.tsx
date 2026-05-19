import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'nido — tu internet, organizado',
  description: 'Tu hogar personal de internet',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
