import type { DatosAtleta } from './filas'

// Los tres pasos del primer uso. El perfil no cuenta: sin perfil, `requerirDatos` ya manda a /perfil.
export interface PasosArranque {
  huecos: boolean // ha declarado al menos un hueco alguna vez
  sesion: boolean // tiene al menos una sesión registrada
  test: boolean // tiene al menos una evaluación
  completo: boolean // los tres
}

export function pasosArranque(d: DatosAtleta): PasosArranque {
  const huecos = d.huecos.length > 0
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const sesion = d.sesiones.some((s) => registradas.has(s.id))
  const test = d.evaluaciones.length > 0
  return { huecos, sesion, test, completo: huecos && sesion && test }
}
