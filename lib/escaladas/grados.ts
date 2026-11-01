// Escalas de grado de las escaladas. Puro.
// Vías en grado francés: 4a, 4b, 4c y, a partir del 5, cada letra con su + (5a, 5a+ … 8c+), hasta el 9a.
// Bloques en escala Font: 4, 4+, 5, 5+, 6A, 6A+ … 8A+.
// Las mismas listas van en el check de migraciones/008_escaladas.sql (un test comprueba que coinciden).

export type TipoEscalada = 'via' | 'bloque'

const conMas = (bases: readonly string[]): string[] => bases.flatMap((b) => [b, `${b}+`])
const letras = (n: number, abc: readonly string[]): string[] => abc.map((l) => `${n}${l}`)

export const GRADOS_VIA: readonly string[] = [
  '4a', '4b', '4c',
  ...[5, 6, 7, 8].flatMap((n) => conMas(letras(n, ['a', 'b', 'c']))),
  '9a',
]

export const GRADOS_BLOQUE: readonly string[] = [
  ...conMas(['4', '5']),
  ...[6, 7].flatMap((n) => conMas(letras(n, ['A', 'B', 'C']))),
  ...conMas(['8A']),
]

export const ESCALA: Record<TipoEscalada, readonly string[]> = { via: GRADOS_VIA, bloque: GRADOS_BLOQUE }

const NOMBRE: Record<TipoEscalada, string> = { via: 'vía', bloque: 'bloque' }

export function esGradoValido(tipo: TipoEscalada, grado: string): boolean {
  return ESCALA[tipo].includes(grado)
}

// La posición del grado en su escala: sirve para comparar grados del mismo tipo.
export function ordenGrado(tipo: TipoEscalada, grado: string): number {
  const i = ESCALA[tipo].indexOf(grado)
  if (i < 0) throw new Error(`Grado no válido para ${NOMBRE[tipo]}: ${grado}`)
  return i
}

export function compararGrados(tipo: TipoEscalada, a: string, b: string): number {
  return ordenGrado(tipo, a) - ordenGrado(tipo, b)
}

export function maxGrado(tipo: TipoEscalada, grados: readonly string[]): string | null {
  let max: string | null = null
  for (const g of grados) if (max === null || compararGrados(tipo, g, max) > 0) max = g
  return max
}

// Cuántos grados de la escala hay de `desde` a `hasta` (cada + cuenta como uno): de 6b a 7a, 4.
export function distanciaGrados(tipo: TipoEscalada, desde: string, hasta: string): number {
  return ordenGrado(tipo, hasta) - ordenGrado(tipo, desde)
}
