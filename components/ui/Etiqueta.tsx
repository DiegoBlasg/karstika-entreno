import type { ReactNode } from 'react'
import { ETIQUETA } from '../estilos'

export function Etiqueta({ children, className = '', as: Elemento = 'span' }: { children: ReactNode; className?: string; as?: 'span' | 'p' | 'h2' | 'h3' }) {
  return <Elemento className={`${ETIQUETA} ${className}`}>{children}</Elemento>
}
