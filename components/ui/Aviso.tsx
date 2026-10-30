import type { ReactNode } from 'react'

const TONO = {
  info: 'border-borde bg-superficie-2',
  ok: 'border-progreso/40 bg-progreso/10',
  ambar: 'border-ambar/40 bg-ambar/10',
  rojo: 'border-rojo/50 bg-rojo/10',
} as const

export function Aviso({ tono, children, className = '' }: { tono: keyof typeof TONO; children: ReactNode; className?: string }) {
  return <div role={tono === 'rojo' ? 'alert' : undefined} className={`rounded-2xl border p-3 text-sm ${TONO[tono]} ${className}`}>{children}</div>
}
