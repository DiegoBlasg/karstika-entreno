import type { ReactNode } from 'react'

type PropsIcono = { size?: number; className?: string; titulo?: string }

// Mismo lenguaje que lucide-react: caja 24×24, trazo 2, extremos redondeados, currentColor.
function Svg({ size = 24, className, titulo, children }: PropsIcono & { children: ReactNode }) {
  const accesible = titulo ? { role: 'img' as const } : { 'aria-hidden': true as const }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} {...accesible}>
      {titulo && <title>{titulo}</title>}
      {children}
    </svg>
  )
}

export const IconoMultipresa = (p: PropsIcono) => (
  <Svg {...p}>
    <rect x="2" y="6" width="20" height="8" rx="2" />
    <path d="M6 10h3M15 10h3" />
    <path d="M12 2v4" />
  </Svg>
)

export const IconoChapa = (p: PropsIcono) => (
  <Svg {...p}>
    <path d="M8 3h8l-1 7h-6z" />
    <circle cx="12" cy="6.5" r="1" />
    <path d="M10 10c0 5 4 5 4 10" />
    <path d="M14 10c0 5-4 5-4 10" />
  </Svg>
)

export const IconoReunion = (p: PropsIcono) => (
  <Svg {...p}>
    <circle cx="7" cy="7" r="2" />
    <circle cx="17" cy="7" r="2" />
    <path d="M7 9l5 7 5-7" />
    <circle cx="12" cy="18" r="2" />
  </Svg>
)

export const IconoCima = (p: PropsIcono) => (
  <Svg {...p}>
    <path d="M3 20l7-12 4 6 2-3 5 9z" />
    <path d="M10 8V3l4 2-4 2" />
  </Svg>
)

export const IconoPresa = (p: PropsIcono) => (
  <Svg {...p}>
    <path d="M4 15c0-5 4-9 9-9 4 0 7 2 7 5 0 4-5 7-10 7-4 0-6-1-6-3z" />
    <circle cx="12" cy="12" r="1" />
  </Svg>
)

export const IconoCuerda = (p: PropsIcono) => (
  <Svg {...p}>
    <path d="M12 2c-4 3 4 5 0 8s4 5 0 8" />
    <path d="M12 18v4" />
  </Svg>
)
