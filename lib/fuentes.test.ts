import { describe, expect, it } from 'vitest'
import { METADATOS, PARAMETRO_IDS, type ParametroId } from '../motor'
import type { Explicacion } from '@/motor'
import { basesDe, citaCorta, estudio, NIVEL_TEXTO } from './fuentes'

const expl = (parametros: Explicacion['parametros']): Explicacion => ({
  regla: 'r', parametros, evidencias: [], nivelMinimo: 'A', origen: 'evidencia', motivo: 'm',
})

describe('estudio', () => {
  it('resuelve todos los ids de evidencia de todos los METADATOS', () => {
    const faltan: string[] = []
    for (const p of PARAMETRO_IDS) for (const id of METADATOS[p].evidencia) if (!estudio(id)) faltan.push(`${p}: ${id}`)
    expect(faltan).toEqual([])
  })
  it('devuelve null si el id no existe', () => {
    expect(estudio('EV-NO-EXISTE')).toBeNull()
  })
  it('enlaza al DOI', () => {
    const e = estudio('EV-DEDOS-004')!
    expect(e.id).toBe('EV-DEDOS-004')
    if (e.doi) expect(e.url).toBe(`https://doi.org/${e.doi}`)
    else expect(e.url).toBeNull()
  })
})

describe('citaCorta', () => {
  it('un autor', () => expect(citaCorta('Lopez, A.', 2020)).toBe('Lopez (2020)'))
  it('dos autores', () => expect(citaCorta('Lopez, A.; Medernach, J.', 2020)).toBe('Lopez y Medernach (2020)'))
  it('tres o más autores', () => expect(citaCorta('Lopez, A.; Medernach, J.; Giles, D.', 2020)).toBe('Lopez et al. (2020)'))
  it('separados por comas', () => {
    expect(citaCorta('Lopez, A.M., Medernach, J., Giles, D.', 2020)).toBe('Lopez et al. (2020)')
  })
})

describe('basesDe', () => {
  it('omite un parámetro que ya no existe (propuestas antiguas guardadas)', () => {
    const x = { regla: 'r', parametros: ['P-99', 'P-02'] as unknown as ParametroId[], evidencias: [], nivelMinimo: 'A' as const, origen: 'evidencia' as const, motivo: 'm' }
    expect(basesDe([x]).map((b) => b.parametro)).toEqual(['P-02'])
  })
  it('no repite parámetros y da el nivel en palabras', () => {
    const b = basesDe([expl(['P-02', 'P-03']), expl(['P-03'])])
    expect(b.map((x) => x.parametro)).toEqual(['P-02', 'P-03'])
    expect(b[0]!.nivelTexto).toBe(NIVEL_TEXTO[METADATOS['P-02'].nivelMinimo])
    expect(b[0]!.titulo).toBe(METADATOS['P-02'].titulo)
    expect(b[0]!.estudios.length).toBeGreaterThan(0)
  })
  it('un parámetro de diseño no tiene estudios', () => {
    const [b] = basesDe([expl(['P-04'])])
    expect(b!.estudios).toEqual([])
    expect(b!.nivelTexto).toBe('decisión de diseño, sin estudio directo')
  })
})
