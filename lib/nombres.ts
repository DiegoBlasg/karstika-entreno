import type { Agarre, MotivoCaida, TipoSesion, Zona } from '../motor'

export { NOMBRE_TIPO } from '../motor/nombres'

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

// Sesiones colgado de la regleta: en «Hice otra cosa» se pregunta el canto y el agarre (el motor exige el canto a
// los noveles, P-12).
export const TIPOS_CON_REGLETA: readonly TipoSesion[] = [
  'multipresa-resistencia', 'multipresa-maxima', 'multipresa-resistencia-fuerza', 'evaluacion-dedos',
]

export const AGARRES = ['abierto', 'semiarqueado', 'arqueado'] as const satisfies readonly Agarre[]

export const NOMBRE_AGARRE: Record<Agarre, string> = {
  abierto: 'Abierto',
  semiarqueado: 'Semiarqueado',
  arqueado: 'Arqueado',
}
