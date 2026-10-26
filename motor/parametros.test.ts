import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { METADATOS, type ParametroId } from './metadatos'
import { VALORES } from './parametros'

const md = readFileSync('docs/evidencia/parametros.md', 'utf8')

function columnas(id: string): string[] {
  const fila = md.split(/\r?\n/).find((l) => l.startsWith(`| ${id} |`))
  if (!fila) throw new Error(`No hay fila ${id}`)
  return fila.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim())
}

describe('VALORES', () => {
  it('cada clave es un parámetro conocido', () => {
    for (const id of Object.keys(VALORES)) expect(METADATOS[id as ParametroId], id).toBeDefined()
  })
  it('P-12 coincide con el documento', () => {
    expect(columnas('P-12')[1]).toMatch(/< 2 años/)
    expect(columnas('P-12')[2]).toMatch(/\b20 mm/)
    expect(columnas('P-12')[2]).toMatch(/\b2 sesiones de multipresa/)
    expect(VALORES['P-12']).toEqual({ anosMaximosPerfilNovel: 2, maxSesionesMultipresa7Dias: 2, regletaMinimaMm: 20 })
  })
  it('P-13 coincide con el documento', () => {
    expect(columnas('P-13')[2]).toMatch(/^0 sesiones/)
    expect(VALORES['P-13'].maxSesionesCampus).toBe(0)
  })
  it('P-14 coincide con el documento', () => {
    expect(columnas('P-14')[2]).toMatch(/^48 h/)
    expect(VALORES['P-14'].horasMinimasEntreSesionesIntensasDedos).toBe(48)
  })
  it('P-15 coincide con el documento', () => {
    const texto = columnas('P-15')[2]!.toLowerCase()
    const palabrasDoc = ['multipresa', 'board', 'bloque', 'vías', 'pegues', 'campus']
    for (const palabra of palabrasDoc) expect(texto).toContain(palabra)
    // Cada tipo del código debe tener su palabra en el texto del documento.
    const palabraDe: Record<string, string> = {
      'multipresa-resistencia': 'multipresa', 'multipresa-maxima': 'multipresa', board: 'board',
      'bloque-limite': 'bloque', 'via-cuerda-limite': 'con cuerda', 'via-autoasegurada': 'autoasegurada',
      'pegues-proyecto': 'pegues', campus: 'campus',
    }
    for (const tipo of VALORES['P-15'].tiposIntensosDedos) expect(texto, tipo).toContain(palabraDe[tipo]!)
    // Y al revés: cada palabra del documento está cubierta por al menos un tipo del código.
    const prefijoDe: Record<string, string> = {
      multipresa: 'multipresa', board: 'board', bloque: 'bloque', 'vías': 'via', pegues: 'pegues', campus: 'campus',
    }
    for (const palabra of palabrasDoc) {
      const cubierta = VALORES['P-15'].tiposIntensosDedos.some((t) => t.startsWith(prefijoDe[palabra]!))
      expect(cubierta, palabra).toBe(true)
    }
    expect([...VALORES['P-15'].tiposIntensosDedos].sort()).toEqual([
      'board', 'bloque-limite', 'campus', 'multipresa-maxima', 'multipresa-resistencia',
      'pegues-proyecto', 'via-autoasegurada', 'via-cuerda-limite',
    ].sort())
  })
  it('P-16 coincide con el documento', () => {
    expect(columnas('P-16')[2]).toMatch(/^2 días/)
    expect(VALORES['P-16'].maxDiasSeguidosCargaAlta).toBe(2)
  })
})
