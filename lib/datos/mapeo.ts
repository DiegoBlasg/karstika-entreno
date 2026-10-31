// Traducción de filas de la base de datos a los tipos del motor. Puro.
import type { EvaluacionDedos, Perfil, RespuestaFreno, Seguimiento, Sesion } from '../../motor'
import type { DatosAtleta, FilaConsejo, FilaEvaluacion, FilaPerfil, FilaSesion } from './filas'

export function perfilMotor(f: FilaPerfil): Perfil {
  return { pesoKg: f.peso_kg, anosEscalando: f.anos_escalando, lesiones: [...f.lesiones] }
}

export function evaluacionMotor(f: FilaEvaluacion): EvaluacionDedos {
  return {
    fecha: f.fecha,
    pesoCorporalKg: f.peso_corporal_kg,
    lastreKg: f.lastre_kg,
    ...(f.resistencia_s !== null ? { resistenciaS: f.resistencia_s } : {}),
    ...(f.tecnica !== null ? { tecnica: f.tecnica } : {}),
  }
}

export function evaluacionesMotor(filas: readonly FilaEvaluacion[]): EvaluacionDedos[] {
  return filas.map(evaluacionMotor).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// La evaluación que se pasa al motor para una fecha: la última que no sea posterior (`evaluaciones` en orden).
export function evaluacionParaFecha(evaluaciones: readonly EvaluacionDedos[], fecha: string): EvaluacionDedos | undefined {
  return evaluaciones.filter((e) => e.fecha <= fecha).at(-1)
}

// El id y la fecha de la fila mandan (un CHECK de la base de datos ya exige que coincidan con el JSON).
export function historialMotor(filas: readonly FilaSesion[]): Sesion[] {
  return filas
    .map((f) => ({ ...f.sesion, id: f.id, fecha: f.fecha }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio - b.horaInicio || a.id.localeCompare(b.id))
}

export function seguimientoMotor(d: DatosAtleta): Seguimiento {
  const fechaDe = new Map(d.sesiones.map((s) => [s.id, s.fecha]))
  return {
    registros: d.registros.map((r) => {
      const fecha = fechaDe.get(r.sesion_id)
      if (fecha === undefined) throw new Error(`El registro de la sesión ${r.sesion_id} no tiene sesión`)
      return { sesionId: r.sesion_id, fecha, rpe: r.rpe, duracionMin: r.duracion_min, molestias: r.molestias }
    }),
    chequeos: [...d.chequeos]
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((c) => ({ fecha: c.fecha, sueno: c.sueno, fatiga: c.fatiga, ganas: c.ganas, molestias: c.molestias })),
    altas: d.altas.map((a) => ({ zona: a.zona, fecha: a.fecha })),
  }
}

// Las respuestas a «¿Qué te frenó hoy?», con la fecha de la sesión de cada registro.
export function frenosMotor(d: DatosAtleta): RespuestaFreno[] {
  const fechaDe = new Map(d.sesiones.map((s) => [s.id, s.fecha]))
  return d.registros.flatMap((r) => {
    const fecha = fechaDe.get(r.sesion_id)
    return r.freno && fecha !== undefined ? [{ fecha, freno: r.freno }] : []
  })
}

export function consejosMostradosMotor(filas: readonly FilaConsejo[]): { id: string; fecha: string }[] {
  return filas.map((f) => ({ id: f.consejo_id, fecha: f.fecha }))
}
