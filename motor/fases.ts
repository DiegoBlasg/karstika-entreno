import type { Fase } from './propuesta-tipos'

// Fases por defecto del tramo 2b. El macrociclo (tramo 2c) definirá las fases reales.
export const FASE_BASE: Fase = {
  id: 'base-tecnica',
  nombre: 'Base técnica y adaptación',
  cupos: { 'evaluacion-dedos': 1, tecnica: 2, arc: 1, hombro: 2 },
  prioridad: ['evaluacion-dedos', 'tecnica', 'arc', 'hombro'],
  prohibidos: [
    'multipresa-resistencia', 'multipresa-maxima', 'board', 'campus', 'bloque-limite',
    'via-cuerda-limite', 'via-autoasegurada', 'pegues-proyecto', 'dominadas', 'resistencia-4x4',
  ],
}

export const FASE_FUERZA: Fase = {
  id: 'fuerza-dedos',
  nombre: 'Fuerza de dedos',
  cupos: { 'evaluacion-dedos': 1, 'multipresa-resistencia': 2, board: 1, tecnica: 1, arc: 1, hombro: 2 },
  prioridad: ['evaluacion-dedos', 'multipresa-resistencia', 'board', 'tecnica', 'arc', 'hombro'],
  prohibidos: [
    'campus', 'multipresa-maxima', 'bloque-limite', 'via-cuerda-limite', 'via-autoasegurada',
    'pegues-proyecto', 'dominadas', 'resistencia-4x4',
  ],
}
