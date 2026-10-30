import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-barlow', display: 'swap' })
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Karstika Entreno',
  description: 'Entrenador personal de escalada',
  appleWebApp: { capable: true, title: 'Entreno', statusBarStyle: 'black-translucent' },
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0E1417', viewportFit: 'cover' }

export default function LayoutRaiz({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="min-h-dvh bg-fondo font-sans text-texto antialiased">{children}</body>
    </html>
  )
}
