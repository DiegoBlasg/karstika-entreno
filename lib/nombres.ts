import type { Agarre, FaseId, MotivoCaida, Sesion, TipoSesion, Zona } from '../motor'
import { NOMBRE_TIPO } from '../motor/nombres'

export { NOMBRE_TIPO }

// «Técnica + ARC»: el tipo y sus complementos.
export function nombreSesion(s: Sesion): string {
  return [s.tipo, ...(s.incluye ?? [])].map((t) => NOMBRE_TIPO[t]).join(' + ')
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

// Objetivo de cada fase, para la línea de contexto de la temporada. Sale de docs/evidencia/conclusiones.md y de los
// comentarios de motor/fases.ts.
export const OBJETIVO_FASE: Record<FaseId, string> = {
  base:
    'Adaptarte y ganar técnica: mucha técnica variando vías y presas, y escalar cerca del límite, todavía sin multipresa. ' +
    'Con menos de 2 años la técnica es lo que más margen tiene, y poleas y tendones se adaptan a lo largo de años.',
  fuerza:
    'Ganar fuerza de dedos, lo que más se asocia al nivel de escalada: 2 sesiones de multipresa con repeaters submáximos ' +
    'por semana y una vía al límite.',
  resistencia:
    'Resistencia de fuerza: aguantar esfuerzos intermitentes de dedos, que en deportiva suma a la fuerza. Multipresa ' +
    'intermitente y 4×4 de bloques fáciles, más la vía al límite.',
  rendimiento:
    'Rendir: pegues al proyecto en roca cuando hay viaje y vías al límite en sala el resto, con multipresa de mantenimiento y técnica.',
  transicion: 'Descanso activo entre ciclos: nada intenso, solo técnica, ARC y hombro.',
}

// La semana objetivo tiene id de rendimiento pero otro objetivo (motor/fases.ts, FASE_OBJETIVO).
export const OBJETIVO_SEMANA_OBJETIVO =
  'Solo pegues al proyecto en roca y cosas suaves: nada intenso en sala, para llegar fresco a los días de roca.'

export const DONDE_SE_HACE: Record<TipoSesion, string> = {
  'via-cuerda-limite': 'Zona de vías, con cuerda y compañero',
  'bloque-limite': 'Zona de búlder',
  'bloque-suave': 'Zona de búlder',
  'resistencia-4x4': 'Zona de búlder',
  arc: 'Vías fáciles o travesía de búlder, sin bombeo',
  tecnica: 'Búlder o vías por debajo de tu nivel',
  'multipresa-resistencia': 'Multipresa',
  'multipresa-maxima': 'Multipresa',
  'multipresa-resistencia-fuerza': 'Multipresa',
  'evaluacion-dedos': 'Multipresa',
  hombro: 'Barra y bandas (en casa o en el rocódromo)',
  dominadas: 'Barra y bandas (en casa o en el rocódromo)',
  board: 'Board del rocódromo',
  'pegues-proyecto': 'Roca, con compañero',
  'via-autoasegurada': 'Vías con autoasegurador',
  campus: 'Campus',
  descanso: '—',
}
