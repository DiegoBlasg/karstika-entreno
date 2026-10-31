import type { FaseId } from '@/motor/propuesta-tipos'

// Un color por fase. Las clases van escritas enteras para que Tailwind las genere (no se componen con plantillas).
export interface ColorFase {
  fondo: string
  texto: string
  borde: string
  trazo: string
  relleno: string
  // Color del texto que va encima de `fondo`: oscuro, salvo en transición (el gris no llega a 4,5:1 con texto oscuro).
  textoEncima: string
}

export const COLOR_FASE: Record<FaseId, ColorFase> = {
  base: { fondo: 'bg-fase-base', texto: 'text-fase-base', borde: 'border-fase-base', trazo: 'stroke-fase-base', relleno: 'fill-fase-base', textoEncima: 'text-fondo' },
  fuerza: { fondo: 'bg-fase-fuerza', texto: 'text-fase-fuerza', borde: 'border-fase-fuerza', trazo: 'stroke-fase-fuerza', relleno: 'fill-fase-fuerza', textoEncima: 'text-fondo' },
  resistencia: { fondo: 'bg-fase-resistencia', texto: 'text-fase-resistencia', borde: 'border-fase-resistencia', trazo: 'stroke-fase-resistencia', relleno: 'fill-fase-resistencia', textoEncima: 'text-fondo' },
  rendimiento: { fondo: 'bg-fase-rendimiento', texto: 'text-fase-rendimiento', borde: 'border-fase-rendimiento', trazo: 'stroke-fase-rendimiento', relleno: 'fill-fase-rendimiento', textoEncima: 'text-fondo' },
  transicion: { fondo: 'bg-fase-transicion', texto: 'text-fase-transicion', borde: 'border-fase-transicion', trazo: 'stroke-fase-transicion', relleno: 'fill-fase-transicion', textoEncima: 'text-texto' },
}

// La semana objetivo no es una fase del motor: usa el naranja de la cima.
export const COLOR_CIMA: ColorFase = {
  fondo: 'bg-cima', texto: 'text-cima', borde: 'border-cima', trazo: 'stroke-cima', relleno: 'fill-cima', textoEncima: 'text-fondo',
}
