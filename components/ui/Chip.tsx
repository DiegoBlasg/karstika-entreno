import type { ReactNode } from 'react'
import { CHIP } from '../estilos'

const TONO = {
  neutro: 'bg-superficie-2 text-texto',
  progreso: 'bg-superficie-2 text-progreso',
  cima: 'bg-cima/15 text-cima',
  ambar: 'bg-ambar/15 text-ambar',
  rojo: 'bg-rojo/15 text-rojo',
} as const

export function Chip({ tono = 'neutro', children }: { tono?: keyof typeof TONO; children: ReactNode }) {
  return <span className={`${CHIP} ${TONO[tono]}`}>{children}</span>
}
