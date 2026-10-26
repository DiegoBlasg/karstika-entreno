import type { MetadatoParametro, NivelMinimo } from './niveles'

const FILA = /^\|\s*P-\d{2}\s*\|/
const ID_EV = /EV-[A-Z]{5,6}-\d{3}/g
const NIVEL = /^(sinEvidencia|A|B|C)(?![A-Za-z])/

export function parsearParametros(md: string): MetadatoParametro[] {
  const filas = md.split(/\r?\n/).filter((l) => FILA.test(l))
  return filas.map((fila) => {
    const c = fila.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim())
    if (c.length !== 6) throw new Error(`Fila con ${c.length} columnas en lugar de 6: ${c[0]}`)
    const id = c[0]!
    const titulo = c[1]!
    const ids = c[3]!
    const nivel = c[4]!
    const m = NIVEL.exec(nivel)
    if (!m) throw new Error(`Nivel no reconocido en ${id}: ${nivel}`)
    const nivelMinimo = m[1] as NivelMinimo
    const origen = ids.includes('sinEvidencia') ? 'diseno' : 'evidencia'
    if ((origen === 'diseno') !== (nivelMinimo === 'sinEvidencia')) {
      throw new Error(`Origen y nivel incoherentes en ${id}`)
    }
    const evidencia = [...new Set(ids.match(ID_EV) ?? [])].sort()
    return { id, titulo, origen, evidencia, nivelMinimo }
  })
}

export function generarFuente(params: MetadatoParametro[]): string {
  const ids = params.map((p) => p.id)
  const entradas = params.map((p) => `  ${JSON.stringify(p.id)}: ${JSON.stringify(p)},`).join('\n')
  return [
    '// GENERADO por scripts/generar-metadatos.ts desde docs/evidencia/parametros.md. No editar a mano.',
    "import type { MetadatoParametro } from './niveles'",
    '',
    `export const PARAMETRO_IDS = ${JSON.stringify(ids)} as const`,
    'export type ParametroId = (typeof PARAMETRO_IDS)[number]',
    '',
    'export const METADATOS: Record<ParametroId, MetadatoParametro<ParametroId>> = {',
    entradas,
    '}',
    '',
  ].join('\n')
}
