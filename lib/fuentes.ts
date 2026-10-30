import { porId } from '../evidencia'
import { METADATOS, type Explicacion, type NivelMinimo } from '../motor'

export const NIVEL_TEXTO: Record<NivelMinimo, string> = {
  A: 'evidencia sólida',
  B: 'evidencia moderada',
  C: 'evidencia limitada',
  sinEvidencia: 'decisión de diseño, sin estudio directo',
}

export interface Estudio {
  id: string
  cita: string
  titulo: string
  publicacion: string
  doi: string | null
  url: string | null
}

export interface Base {
  parametro: string
  titulo: string
  nivel: NivelMinimo
  nivelTexto: string
  estudios: Estudio[]
}

function apellidos(autores: string): string[] {
  const partes = autores.includes(';') ? autores.split(';') : autores.split(/(?<=\.)\s*,\s*/)
  return partes.map((a) => (a.split(',')[0] ?? '').trim()).filter(Boolean)
}

export function citaCorta(autores: string, anio: number): string {
  const a = apellidos(autores)
  if (a.length <= 1) return `${a[0] ?? autores} (${anio})`
  if (a.length === 2) return `${a[0]} y ${a[1]} (${anio})`
  return `${a[0]} et al. (${anio})`
}

export function estudio(id: string): Estudio | null {
  const h = porId(id)
  const f = h?.fuentes[0]
  if (!h || !f) return null
  return {
    id,
    cita: citaCorta(f.autores, f.anio),
    titulo: f.titulo,
    publicacion: f.publicacion,
    doi: f.doi ?? null,
    url: f.doi ? `https://doi.org/${f.doi}` : (f.url ?? null),
  }
}

export function basesDe(explicaciones: Explicacion[]): Base[] {
  return basesDeParametros(explicaciones.flatMap((x) => x.parametros))
}

// Las bases de una lista de parámetros (p. ej. los de una ficha de la biblioteca), sin repetir.
export function basesDeParametros(parametros: readonly string[]): Base[] {
  const vistos = new Set<string>()
  const bases: Base[] = []
  for (const p of parametros) {
    if (vistos.has(p)) continue
    vistos.add(p)
    // Una propuesta guardada puede citar un parámetro que ya no existe: se omite en vez de romper la página.
    if (!Object.hasOwn(METADATOS, p)) continue
    const m = METADATOS[p as keyof typeof METADATOS]
    bases.push({
      parametro: p,
      titulo: m.titulo,
      nivel: m.nivelMinimo,
      nivelTexto: NIVEL_TEXTO[m.nivelMinimo],
      estudios: m.evidencia.map(estudio).filter((e): e is Estudio => e !== null),
    })
  }
  return bases
}
