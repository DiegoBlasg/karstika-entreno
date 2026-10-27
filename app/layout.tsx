import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = { title: 'Karstika Entreno', description: 'Entrenador personal de escalada' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function LayoutRaiz({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  )
}
