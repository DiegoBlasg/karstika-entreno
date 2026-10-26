import type { Fase } from './propuesta-tipos'

// Fases por defecto del tramo 2b. El macrociclo (tramo 2c) definirá las fases reales.
// Escalar cerca del límite (vía con cuerda si hay compañero, bloque si no) entra desde la base: es lo más
// específico para el objetivo y la seguridad ya lo controla como sesión intensa de dedos (P-14, P-15).
export const FASE_BASE: Fase = {
  id: 'base-tecnica',
  nombre: 'Base técnica y adaptación',
  cupos: { 'evaluacion-dedos': 1, 'via-cuerda-limite': 1, 'bloque-limite': 1, tecnica: 2, arc: 1, hombro: 2 },
  prioridad: ['evaluacion-dedos', 'via-cuerda-limite', 'bloque-limite', 'tecnica', 'arc', 'hombro'],
  prohibidos: [
    'multipresa-resistencia', 'multipresa-maxima', 'board', 'campus', 'via-autoasegurada',
    'pegues-proyecto', 'dominadas', 'resistencia-4x4',
  ],
}

export const FASE_FUERZA: Fase = {
  id: 'fuerza-dedos',
  nombre: 'Fuerza de dedos',
  cupos: {
    'evaluacion-dedos': 1, 'multipresa-resistencia': 2, 'via-cuerda-limite': 1, board: 1, tecnica: 1, arc: 1, hombro: 2,
  },
  prioridad: [
    'evaluacion-dedos', 'multipresa-resistencia', 'via-cuerda-limite', 'board', 'bloque-limite', 'tecnica', 'arc', 'hombro',
  ],
  prohibidos: [
    'campus', 'multipresa-maxima', 'via-autoasegurada', 'pegues-proyecto', 'dominadas', 'resistencia-4x4',
  ],
}
