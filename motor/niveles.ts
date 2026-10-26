export type NivelMinimo = 'sinEvidencia' | 'C' | 'B' | 'A'

export const ORDEN_NIVEL: readonly NivelMinimo[] = ['sinEvidencia', 'C', 'B', 'A']

export interface MetadatoParametro<Id extends string = string> {
  id: Id
  titulo: string
  origen: 'evidencia' | 'diseno'
  evidencia: string[]
  nivelMinimo: NivelMinimo
}

export function nivelMasBajo(niveles: readonly NivelMinimo[]): NivelMinimo {
  if (niveles.length === 0) throw new Error('nivelMasBajo necesita al menos un nivel')
  return niveles.reduce((a, b) => (ORDEN_NIVEL.indexOf(b) < ORDEN_NIVEL.indexOf(a) ? b : a))
}
