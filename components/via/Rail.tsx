import type { ReactNode } from 'react'

// Piezas comunes del dibujo de la vía. Cada fila de la lista lleva a la izquierda una columna de 40 px con su trozo de
// rail (línea de 4 px por el centro); las filas van pegadas para que el rail sea continuo de la cima al pie.

const CORTA = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
export const corta = (fecha: string): string => CORTA.format(new Date(`${fecha}T12:00:00Z`))

export const LINEA = 'absolute left-1/2 w-1 -translate-x-1/2'

// Fila de la vía: columna del rail (decorativa) y contenido.
// `arriba`: el contenido se pega arriba (los largos), junto a su reunión, que es el final del largo.
export function FilaVia({ rail, children, alto, arriba = false }: { rail: ReactNode; children: ReactNode; alto?: number; arriba?: boolean }) {
  return (
    <div className="relative flex gap-2" style={alto ? { minHeight: alto } : undefined}>
      <div aria-hidden="true" className="relative w-10 shrink-0">{rail}</div>
      <div className={`flex min-w-0 flex-1 flex-col py-1.5 ${arriba ? 'justify-start' : 'justify-center'}`}>{children}</div>
    </div>
  )
}

// Botón de fila que abre una hoja: su capa ::after cubre todo el padre `relative` (la fila o la tarjeta), así se toca
// en cualquier punto aunque la barra de progreso quede fuera del botón (un <button> no admite <div> dentro).
export const DISPARADOR_ESTIRADO =
  'block w-full min-h-11 rounded-lg text-left after:absolute after:inset-0 after:rounded-2xl active:after:bg-texto/5'
