// Arma la Peticion del motor a partir de los datos guardados y devuelve la propuesta con sus consejos. Puro.
import {
  ajusteCiclo2, diagnosticar, elegirConsejos, estadoAtleta, faseEnFecha, planificarTemporada, proponerSesion,
  type Consejo, type Contexto, type Diagnostico, type Fase, type Peticion, type Propuesta, type SesionPlan, type Temporada,
} from '../../motor'
import { fechaLarga } from '../fecha'
import type { DatosAtleta } from './filas'
import {
  consejosMostradosMotor, evaluacionesMotor, evaluacionParaFecha, historialMotor, frenosMotor, perfilMotor, seguimientoMotor,
} from './mapeo'
import { validarDatos } from './validar'

export interface EntradaPeticion {
  fecha: string
  horaInicio: number
  contexto: Contexto
}

export type Preparacion =
  | { tipo: 'fuera-temporada'; mensaje: string }
  | { tipo: 'propuesta'; propuesta: Propuesta; consejos: Consejo[]; fase: Fase }

// La temporada no se guarda: se recalcula. El reparto del ciclo 2 sale del diagnóstico con lo sabido el lunes en
// que empieza el ciclo 2 (el ciclo 1 no depende del ajuste), así no cambia a mitad de ciclo cuando llegan tests nuevos.
export function temporadaDe(d: DatosAtleta): Temporada {
  const { inicio_temporada: inicio, objetivo_temporada: objetivo } = d.perfil
  const sinAjuste = planificarTemporada(inicio, objetivo)
  const ciclo2 = sinAjuste.semanas.find((s) => s.ciclo === 2)
  if (!ciclo2) return sinAjuste
  const ajuste = ajusteCiclo2(diagnosticoCiclo2(d, ciclo2.lunes))
  return planificarTemporada(inicio, objetivo, { ajuste })
}

// El diagnóstico con el que se fija el ciclo 2: solo con lo que ya estaba guardado al empezar su lunes (tests por
// `creada_en`, registros por `registrado_en`; el corte es a las 0:00 UTC, una hora no cambia nada). Así un test o una
// respuesta apuntados más tarde con fecha anterior no cambian hacia atrás semanas ya entrenadas. Lo que no tiene
// marca de tiempo legible (datos construidos a mano) cuenta como ya guardado.
export function diagnosticoCiclo2(d: DatosAtleta, lunes: string): Diagnostico {
  const corte = Date.parse(`${lunes}T00:00:00Z`)
  const guardadoAntes = (t: string | undefined): boolean => {
    if (t === undefined) return true
    const ms = Date.parse(t.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'))
    return Number.isNaN(ms) || ms < corte
  }
  const conocido: DatosAtleta = {
    ...d,
    evaluaciones: d.evaluaciones.filter((e) => guardadoAntes(e.creada_en)),
    registros: d.registros.filter((r) => guardadoAntes(r.registrado_en)),
  }
  return diagnosticar(evaluacionesMotor(conocido.evaluaciones), frenosMotor(conocido), lunes)
}

export function prepararPropuesta(d: DatosAtleta, e: EntradaPeticion): Preparacion {
  validarDatos(d)
  const t = temporadaDe(d)
  if (e.fecha < t.inicio) return { tipo: 'fuera-temporada', mensaje: `La temporada empieza el ${fechaLarga(t.inicio)}.` }
  const historial = historialMotor(d.sesiones)
  const seguimiento = seguimientoMotor(d)
  const { descargasAdelantadas } = estadoAtleta(historial, seguimiento, e.fecha)
  let fase: Fase
  try {
    fase = faseEnFecha(t, e.fecha, { descargasAdelantadas })
  } catch (err) {
    if (e.fecha > t.objetivo) {
      return { tipo: 'fuera-temporada', mensaje: 'La temporada ya ha terminado. Para planificar otra, cambia las fechas en Perfil.' }
    }
    throw err
  }
  const evaluaciones = evaluacionesMotor(d.evaluaciones)
  const diagnostico = diagnosticar(evaluaciones, frenosMotor(d), e.fecha)
  const evaluacion = evaluacionParaFecha(evaluaciones, e.fecha)
  const peticion: Peticion = {
    fecha: e.fecha,
    horaInicio: e.horaInicio,
    contexto: { ...e.contexto, multipresaEnCasa: d.perfil.multipresa_en_casa },
    perfil: perfilMotor(d.perfil),
    historial,
    fase,
    seguimiento,
    consejosMostrados: consejosMostradosMotor(d.consejos),
    ...(diagnostico.limitantes[0] ? { limitantePrincipal: diagnostico.limitantes[0] } : {}),
    ...(evaluacion ? { evaluacion } : {}),
  }
  const propuesta = proponerSesion(peticion)
  return { tipo: 'propuesta', propuesta, consejos: elegirConsejos(peticion, propuesta), fase }
}

export function opcionElegida(p: Propuesta, indice: number): SesionPlan | undefined {
  return indice === 0 ? (p.principal ?? undefined) : p.alternativas[indice - 1]
}
