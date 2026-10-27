import type { TipoSesion } from './tipos'

// Nombres para mostrar (explicaciones del motor y pantallas de la app).
export const NOMBRE_TIPO: Record<TipoSesion, string> = {
  'multipresa-resistencia': 'Multipresa: repeaters',
  'multipresa-maxima': 'Multipresa: suspensiones máximas',
  'multipresa-resistencia-fuerza': 'Multipresa: resistencia de fuerza',
  'evaluacion-dedos': 'Test de dedos',
  board: 'Board',
  'bloque-limite': 'Bloque al límite',
  'bloque-suave': 'Bloque suave',
  'via-cuerda-limite': 'Vía con cuerda al límite',
  'via-autoasegurada': 'Vía autoasegurada',
  'pegues-proyecto': 'Pegues al proyecto',
  campus: 'Campus',
  'resistencia-4x4': 'Resistencia 4×4',
  arc: 'ARC',
  tecnica: 'Técnica',
  dominadas: 'Dominadas lastradas',
  hombro: 'Hombro',
  descanso: 'Descanso',
}
