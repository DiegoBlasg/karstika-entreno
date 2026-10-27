import type { MotivoCaida, TipoSesion, Zona } from '../motor'

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

export const NOMBRE_ZONA: Record<Zona, string> = {
  dedos: 'Dedos',
  muneca: 'Muñeca / antebrazo',
  codo: 'Codo',
  hombro: 'Hombro',
  otra: 'Otra zona',
}

export const MOTIVOS_CAIDA = ['bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza'] as const satisfies readonly MotivoCaida[]

export const NOMBRE_MOTIVO: Record<MotivoCaida, string> = {
  bombeo: 'Caí por bombeo',
  'paso-fuerza': 'Caí en un paso de fuerza',
  'tecnica-lectura': 'Caí por técnica o lectura',
  cabeza: 'Caí por la cabeza (miedo)',
}

// Escala CR-10 de esfuerzo de sesión (P-34).
export const ETIQUETA_RPE: readonly string[] = [
  'reposo', 'muy, muy fácil', 'fácil', 'moderado', 'algo duro', 'duro', 'duro +', 'muy duro', 'muy duro +', 'casi máximo', 'máximo',
]

// Sesiones en las que se apuntan los intentos al límite (alimentan el diagnóstico).
export const TIPOS_CON_INTENTOS: readonly TipoSesion[] = ['via-cuerda-limite', 'pegues-proyecto', 'bloque-limite']
