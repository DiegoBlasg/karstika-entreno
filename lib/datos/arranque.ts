import type { DatosAtleta } from './filas'

// Los tres pasos del primer uso. El perfil no cuenta: sin perfil, `requerirDatos` ya manda a /perfil.
export interface PasosArranque {
  generado: boolean // ha generado al menos un entreno
  sesion: boolean // tiene al menos una sesión registrada
  test: boolean // tiene al menos una evaluación
  completo: boolean // los tres
}

export function pasosArranque(d: DatosAtleta): PasosArranque {
  const generado = d.sesiones.some((s) => s.origen === 'propuesta')
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const sesion = d.sesiones.some((s) => registradas.has(s.id))
  const test = d.evaluaciones.length > 0
  return { generado, sesion, test, completo: generado && sesion && test }
}
