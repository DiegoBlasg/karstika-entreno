// Arma la Peticion del motor a partir de los datos guardados y devuelve la propuesta con sus consejos. Puro.
import {
  ajusteCiclo2, diagnosticar, elegirConsejos, estadoAtleta, faseEnFecha, planificarTemporada, proponerSesion,
  type Consejo, type Contexto, type Fase, type Peticion, type Propuesta, type SesionPlan, type Temporada,
} from '../../motor'
import { fechaLarga } from '../fecha'
import type { DatosAtleta } from './filas'
import { huecosPosteriores } from './huecos'
import {
  consejosMostradosMotor, evaluacionesMotor, evaluacionParaFecha, historialMotor, intentosMotor, perfilMotor, seguimientoMotor,
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
  const ajuste = ajusteCiclo2(diagnosticar(evaluacionesMotor(d.evaluaciones), intentosMotor(d.intentos), ciclo2.lunes))
  return planificarTemporada(inicio, objetivo, { ajuste })
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
  const diagnostico = diagnosticar(evaluaciones, intentosMotor(d.intentos), e.fecha)
  const evaluacion = evaluacionParaFecha(evaluaciones, e.fecha)
  const huecos = huecosPosteriores(d, e)
  const peticion: Peticion = {
    fecha: e.fecha,
    horaInicio: e.horaInicio,
    contexto: { ...e.contexto, multipresaEnCasa: d.perfil.multipresa_en_casa },
    perfil: perfilMotor(d.perfil),
    historial,
    fase,
    seguimiento,
    consejosMostrados: consejosMostradosMotor(d.consejos),
    ...(huecos ? { huecos: huecos.map((h) => ({ ...h, contexto: { ...h.contexto, multipresaEnCasa: d.perfil.multipresa_en_casa } })) } : {}),
    ...(diagnostico.limitantes[0] ? { limitantePrincipal: diagnostico.limitantes[0] } : {}),
    ...(evaluacion ? { evaluacion } : {}),
  }
  const propuesta = proponerSesion(peticion)
  return { tipo: 'propuesta', propuesta, consejos: elegirConsejos(peticion, propuesta), fase }
}

export function opcionElegida(p: Propuesta, indice: number): SesionPlan | undefined {
  return indice === 0 ? (p.principal ?? undefined) : p.alternativas[indice - 1]
}
