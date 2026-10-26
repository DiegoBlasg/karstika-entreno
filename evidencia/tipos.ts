export type Nivel = 'A' | 'B' | 'C'

export const BLOQUES = [
  'rendimiento', 'dedos', 'fuerza', 'resistencia', 'tecnica',
  'tactica', 'periodizacion', 'lesiones', 'recuperacion',
] as const
export type Bloque = (typeof BLOQUES)[number]

export const PREFIJOS: Record<Bloque, string> = {
  rendimiento: 'RENDIM', dedos: 'DEDOS', fuerza: 'FUERZA', resistencia: 'RESIST',
  tecnica: 'TECNIC', tactica: 'TACTIC', periodizacion: 'PERIOD',
  lesiones: 'LESION', recuperacion: 'RECUP',
}

export interface Fuente {
  autores: string
  anio: number
  titulo: string
  publicacion: string
  doi?: string
  url?: string
}

export interface Hallazgo {
  id: string
  bloque: Bloque
  afirmacion: string
  fuentes: Fuente[]
  nivel: Nivel
  aplicaA: { nivel?: string; experiencia?: string; objetivo?: string }
  limitaciones: string
  verificada: { fecha: string; metodo: 'fuente-primaria' | 'resumen' }
}
