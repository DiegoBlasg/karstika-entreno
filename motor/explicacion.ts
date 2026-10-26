import { METADATOS, type ParametroId } from './metadatos'
import { nivelMasBajo, type MetadatoParametro, type NivelMinimo } from './niveles'

export interface Explicacion {
  regla: string
  parametros: ParametroId[]
  evidencias: string[]
  nivelMinimo: NivelMinimo
  origen: 'evidencia' | 'diseno' | 'contexto'
  motivo: string
}

function comprobarTexto(nombre: string, valor: string): void {
  if (valor.trim() === '') throw new Error(`${nombre} no puede estar vacío`)
}

export function explicar(regla: string, parametros: ParametroId[], motivo: string): Explicacion {
  comprobarTexto('La regla', regla)
  comprobarTexto('El motivo', motivo)
  if (parametros.length === 0) throw new Error(`La regla ${regla} no cita ningún parámetro`)
  const tabla = METADATOS as Record<string, MetadatoParametro<ParametroId> | undefined>
  const metas = parametros.map((id) => {
    if (!Object.hasOwn(tabla, id)) throw new Error(`Parámetro desconocido: ${id}`)
    const m = tabla[id]
    if (!m) throw new Error(`Parámetro desconocido: ${id}`)
    return m
  })
  return {
    regla,
    parametros: [...new Set(parametros)].sort(),
    evidencias: [...new Set(metas.flatMap((m) => m.evidencia))].sort(),
    nivelMinimo: nivelMasBajo(metas.map((m) => m.nivelMinimo)),
    origen: metas.some((m) => m.origen === 'diseno') ? 'diseno' : 'evidencia',
    motivo,
  }
}

export function explicarContexto(regla: string, motivo: string): Explicacion {
  comprobarTexto('El motivo', motivo)
  if (!regla.startsWith('contexto.') || regla.length === 'contexto.'.length) throw new Error(`La regla de contexto debe empezar por contexto.: ${regla}`)
  return { regla, parametros: [], evidencias: [], nivelMinimo: 'sinEvidencia', origen: 'contexto', motivo }
}
