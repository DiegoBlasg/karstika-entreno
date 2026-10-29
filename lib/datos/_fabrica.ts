import type { Sesion } from '../../motor'
import type { DatosAtleta, FilaHueco, FilaPerfil, FilaSesion } from './filas'

export const PERFIL: FilaPerfil = {
  peso_kg: 70,
  anos_escalando: 1.5,
  lesiones: [],
  grado_actual: '6b',
  grado_objetivo: '7a',
  inicio_temporada: '2026-11-02',
  objetivo_temporada: '2027-10-04',
  multipresa_en_casa: false,
  aviso_aceptado_en: '2026-10-27 10:00:00+00',
}

export function datosVacios(extra: Partial<DatosAtleta> = {}): DatosAtleta {
  return { perfil: PERFIL, evaluaciones: [], sesiones: [], registros: [], chequeos: [], altas: [], consejos: [], intentos: [], huecos: [], ...extra }
}

export const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export function sesionFila(id: string, fecha: string, extra: Partial<Sesion> = {}): FilaSesion {
  const sesion: Sesion = { id, tipo: 'tecnica', intensidad: 'suave', fecha, horaInicio: 19, duracionMin: 60, ...extra }
  return { id, fecha, sesion, propuesta: null, origen: 'libre' }
}

export function huecoFila(id: string, fecha: string, hhmm: string, extra: Partial<FilaHueco> = {}): FilaHueco {
  const [h, m] = hhmm.split(':').map(Number)
  return { id, fecha, inicio_min: h! * 60 + m!, compania: 'solo', lugar: 'casa', minutos: 60, ...extra }
}
