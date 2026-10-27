// Valida el conjunto de datos con los validadores del motor antes de escribir nada. Lanza con el mensaje del motor.
import { diagnosticar, finHoras, inicioHoras, validarEntrada, validarSeguimiento } from '../../motor'
import type { DatosAtleta } from './filas'
import { evaluacionesMotor, historialMotor, intentosMotor, seguimientoMotor } from './mapeo'

export function validarDatos(d: DatosAtleta): void {
  const historial = historialMotor(d.sesiones)
  validarEntrada(historial)
  validarSeguimiento(historial, seguimientoMotor(d))
  // El motor no comprueba solapes: dos sesiones no pueden pisarse en el tiempo (acabar justo cuando empieza otra vale).
  const porInicio = [...historial].sort((a, b) => inicioHoras(a) - inicioHoras(b))
  for (let k = 1; k < porInicio.length; k++) {
    const previa = porInicio[k - 1]!
    const actual = porInicio[k]!
    if (inicioHoras(actual) < finHoras(previa)) {
      throw new Error(`La sesión del ${actual.fecha} a las ${hhmm(actual.horaInicio)} se solapa con otra sesión de ese día.`)
    }
  }
  const fechaDe = new Map(d.sesiones.map((s) => [s.id, s.fecha]))
  for (const i of d.intentos) {
    const fecha = fechaDe.get(i.sesion_id)
    if (fecha === undefined) throw new Error(`El intento ${i.id} no tiene sesión`)
    if (fecha !== i.fecha) throw new Error(`El intento ${i.id} no tiene la fecha de su sesión`)
  }
  // diagnosticar valida todas las evaluaciones y todos los intentos (fechas repetidas, rangos) antes de calcular;
  // la fecha solo decide qué cuenta en el cálculo, que aquí no se usa.
  const fechas = [...d.evaluaciones.map((e) => e.fecha), ...d.intentos.map((i) => i.fecha)].sort()
  const ultima = fechas.at(-1)
  if (ultima !== undefined) diagnosticar(evaluacionesMotor(d.evaluaciones), intentosMotor(d.intentos), ultima)
}

function hhmm(h: number): string {
  const min = Math.round(h * 60)
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}
