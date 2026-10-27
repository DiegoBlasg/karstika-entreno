// Lo que muestra la pantalla Hoy. Puro.
import { estadoAtleta, ZONAS, type Zona } from '../../motor'
import type { DatosAtleta, FilaRegistro, FilaSesion } from './filas'
import { historialMotor, seguimientoMotor } from './mapeo'

export interface Tarjeta {
  fila: FilaSesion
  registro?: FilaRegistro
}

export interface VistaHoy {
  hoy: Tarjeta[]
  pendientes: Tarjeta[]          // días anteriores sin registro
  proximas: Tarjeta[]
  zonasRojo: Zona[]
  zonasAmbar: Zona[]
}

export function vistaHoy(d: DatosAtleta, fecha: string): VistaHoy {
  const registros = new Map(d.registros.map((r) => [r.sesion_id, r]))
  const historial = historialMotor(d.sesiones)
  const porId = new Map(d.sesiones.map((s) => [s.id, s]))
  const tarjetas: Tarjeta[] = historial.map((s) => {
    const fila = porId.get(s.id)!
    const registro = registros.get(s.id)
    return registro ? { fila, registro } : { fila }
  })
  const estado = estadoAtleta(historial, seguimientoMotor(d), fecha)
  return {
    hoy: tarjetas.filter((t) => t.fila.fecha === fecha),
    pendientes: tarjetas.filter((t) => t.fila.fecha < fecha && !t.registro),
    proximas: tarjetas.filter((t) => t.fila.fecha > fecha),
    zonasRojo: ZONAS.filter((z) => estado.zonas[z] === 'rojo'),
    zonasAmbar: ZONAS.filter((z) => estado.zonas[z] === 'ambar'),
  }
}
