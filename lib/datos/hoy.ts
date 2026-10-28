// Lo que muestra la pantalla Hoy. Puro.
import { estadoAtleta, motivosNoEncaja, ZONAS, type Molestia, type Zona } from '../../motor'
import { sumarDias } from '../fecha'
import type { DatosAtleta, FilaIntento, FilaRegistro, FilaSesion } from './filas'
import { historialMotor, seguimientoMotor } from './mapeo'

export interface Tarjeta {
  fila: FilaSesion
  registro?: FilaRegistro
  intentos: FilaIntento[]
  molestiasChequeo: Molestia[]   // las del chequeo de su día: el registro sale con ellas
  noEncaja: string[]             // con cómo llega hoy, por qué el entrenador ya no la propondría (solo hoy, aceptadas, sin registrar)
}

export interface VistaHoy {
  hoy: Tarjeta[]
  pendientes: Tarjeta[]          // días anteriores sin registro
  recientes: Tarjeta[]           // registradas en los 7 días anteriores a hoy (se pueden corregir)
  proximas: Tarjeta[]
  zonasRojo: Zona[]
  zonasAmbar: Zona[]
  pedirChequeo: boolean          // hay una sesión de hoy sin registrar y aún no hay chequeo de hoy
}

// Un registro se puede corregir durante 7 días: desde hoy-7 hasta hoy, ambos incluidos.
export const DIAS_CORRECCION = 7

export function corregible(fecha: string, hoy: string): boolean {
  return fecha >= sumarDias(hoy, -DIAS_CORRECCION) && fecha <= hoy
}

export function vistaHoy(d: DatosAtleta, fecha: string): VistaHoy {
  const registros = new Map(d.registros.map((r) => [r.sesion_id, r]))
  const historial = historialMotor(d.sesiones)
  const porId = new Map(d.sesiones.map((s) => [s.id, s]))
  const chequeo = new Map(d.chequeos.map((c) => [c.fecha, c.molestias]))
  const estado = estadoAtleta(historial, seguimientoMotor(d), fecha)
  const tarjetas: Tarjeta[] = historial.map((s) => {
    const fila = porId.get(s.id)!
    const registro = registros.get(s.id)
    const intentos = d.intentos.filter((i) => i.sesion_id === s.id)
    const molestiasChequeo = chequeo.get(s.fecha) ?? []
    const noEncaja = s.fecha === fecha && fila.propuesta && !registro ? motivosNoEncaja(s, estado) : []
    return registro ? { fila, registro, intentos, molestiasChequeo, noEncaja } : { fila, intentos, molestiasChequeo, noEncaja }
  })
  const desde = sumarDias(fecha, -DIAS_CORRECCION)
  return {
    hoy: tarjetas.filter((t) => t.fila.fecha === fecha),
    pendientes: tarjetas.filter((t) => t.fila.fecha < fecha && !t.registro),
    recientes: tarjetas.filter((t) => t.fila.fecha >= desde && t.fila.fecha < fecha && t.registro),
    proximas: tarjetas.filter((t) => t.fila.fecha > fecha),
    zonasRojo: ZONAS.filter((z) => estado.zonas[z] === 'rojo'),
    zonasAmbar: ZONAS.filter((z) => estado.zonas[z] === 'ambar'),
    pedirChequeo: tarjetas.some((t) => t.fila.fecha === fecha && !t.registro) && !d.chequeos.some((c) => c.fecha === fecha),
  }
}

// Días con un test de dedos registrado (hasta hoy) sin una evaluación de esa fecha. Ordenados, sin repetir.
export function testsSinResultado(d: DatosAtleta, hoy: string): string[] {
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const conResultado = new Set(d.evaluaciones.map((e) => e.fecha))
  const fechas = d.sesiones
    .filter((s) => s.sesion.tipo === 'evaluacion-dedos' && s.fecha <= hoy && registradas.has(s.id) && !conResultado.has(s.fecha))
    .map((s) => s.fecha)
  return [...new Set(fechas)].sort()
}
