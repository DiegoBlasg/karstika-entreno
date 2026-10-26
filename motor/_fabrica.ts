import type { Perfil, Sesion } from './tipos'

export const perfilNovel: Perfil = { pesoKg: 70, anosEscalando: 1.5, lesiones: [] }
export const perfilExperto: Perfil = { pesoKg: 70, anosEscalando: 5, lesiones: [] }

export function ses(id: string, fecha: string, horaInicio: number, extra: Partial<Sesion> = {}): Sesion {
  return { id, tipo: 'bloque-limite', intensidad: 'alta', fecha, horaInicio, duracionMin: 90, ...extra }
}
