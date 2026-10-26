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
    expect(columnas('P-14')[2]).toMatch(/^1 día natural completo sin sesión intensa de dedos entre dos días/)
    expect(VALORES['P-14'].diasMinimosEntreSesionesIntensasDedos).toBe(2)
  })
  it('P-15 coincide con el documento', () => {
    const texto = columnas('P-15')[2]!.toLowerCase()
    const palabrasDoc = ['multipresa', 'board', 'bloque', 'vías', 'pegues', 'campus', 'test de fuerza']
    for (const palabra of palabrasDoc) expect(texto).toContain(palabra)
    // Cada tipo del código debe tener su palabra en el texto del documento.
    const palabraDe: Record<string, string> = {
      'multipresa-resistencia': 'multipresa', 'multipresa-maxima': 'multipresa', board: 'board',
      'bloque-limite': 'bloque', 'via-cuerda-limite': 'con cuerda', 'via-autoasegurada': 'autoasegurada',
      'pegues-proyecto': 'pegues', campus: 'campus', 'evaluacion-dedos': 'test de fuerza',
    }
    for (const tipo of VALORES['P-15'].tiposIntensosDedos) expect(texto, tipo).toContain(palabraDe[tipo]!)
    // Y al revés: cada palabra del documento está cubierta por al menos un tipo del código.
    const prefijoDe: Record<string, string> = {
      multipresa: 'multipresa', board: 'board', bloque: 'bloque', 'vías': 'via', pegues: 'pegues', campus: 'campus',
      'test de fuerza': 'evaluacion',
    }
    for (const palabra of palabrasDoc) {
      const cubierta = VALORES['P-15'].tiposIntensosDedos.some((t) => t.startsWith(prefijoDe[palabra]!))
      expect(cubierta, palabra).toBe(true)
    }
    expect([...VALORES['P-15'].tiposIntensosDedos].sort()).toEqual([
      'board', 'bloque-limite', 'campus', 'evaluacion-dedos', 'multipresa-maxima', 'multipresa-resistencia',
      'pegues-proyecto', 'via-autoasegurada', 'via-cuerda-limite',
    ].sort())
  })
  it('P-16 coincide con el documento', () => {
    expect(columnas('P-16')[2]).toMatch(/^2 días/)
    expect(VALORES['P-16'].maxDiasSeguidosCargaAlta).toBe(2)
  })
  it('P-32 coincide con el documento', () => {
    expect(columnas('P-32')[2]).toMatch(/^4 semanas como mínimo/)
    expect(VALORES['P-32'].diasBaseMinimos).toBe(28)
  })
  it('los valores de las plantillas coinciden con el documento', () => {
    expect(columnas('P-02')[2]).toMatch(/^7 s colgado : 3 s descanso/)
    expect(VALORES['P-02']).toEqual({ trabajoS: 7, descansoS: 3 })
    expect(columnas('P-03')[2]).toMatch(/^7 repeticiones por serie, 6 series por bloque, 2 bloques/)
    expect(VALORES['P-03']).toEqual({ repeticionesPorSerie: 7, seriesPorBloque: 6 })
    expect(columnas('P-04')[2]).toMatch(/^1 bloque \(6 series × 7 repeticiones\) en las primeras 2 semanas de multipresa; después, 2 bloques/)
    expect(VALORES['P-04']).toEqual({ semanasConUnBloque: 2, bloquesIniciales: 1, bloquesDespues: 2 })
    expect(columnas('P-05')[2]).toMatch(/^2,5 min/)
    expect(VALORES['P-05'].descansoEntreSeriesS).toBe(150)
    expect(columnas('P-06')[2]).toMatch(/sin superar el 80 % de la fuerza máxima/)
    expect(VALORES['P-06'].fraccionMaximaRepeaters).toBe(0.8)
    expect(columnas('P-07')[2]).toMatch(/^2 sesiones por semana/)
    expect(VALORES['P-07'].sesionesPorSemana).toBe(2)
    expect(columnas('P-08')[2]).toMatch(/nunca más de 10 seguidas/)
    expect(VALORES['P-08'].semanasMaximasSinReevaluar).toBe(10)
    expect(columnas('P-18')[2]).toMatch(/^Suspensión de 10 s; hasta 3 intentos con 3 min de descanso/)
    expect(VALORES['P-18']).toEqual({ duracionS: 10, intentos: 3, descansoS: 180 })
    expect(columnas('P-35')[2]).toMatch(/2 series de 10-15 min/)
    expect(columnas('P-35')[2]).toMatch(/10 min de descanso/)
    expect(VALORES['P-35']).toEqual({ series: 2, minutosSerie: 15, minutosSerieCorta: 10, descansoMin: 10 })
    expect(columnas('P-41')[2]).toMatch(/2 veces por semana, 15 min/)
    expect(VALORES['P-41'].minutos).toBe(15)
    expect(columnas('P-49')[2]).toMatch(/^Unos 10 min/)
    expect(VALORES['P-49'].minutos).toBe(10)
    expect(columnas('P-53')[2]).toMatch(/^Hasta 3 min/)
    expect(VALORES['P-53'].minutosPrevisualizacion).toBe(3)
  })
})
