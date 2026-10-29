// Lo que muestra la pantalla «Plan»: los próximos días (esta semana y la siguiente), el año por semanas y lo que ha
// cambiado por tus resultados. Puro: no guarda nada y las sesiones planeadas solo viven en memoria.
import {
  ajusteCiclo2, diagnosticar, estadoAtleta, evaluacionVigente, FASE_OBJETIVO, FASES, FRACCION_INICIAL_REPEATERS, fuerzaRelativa, lastreRepeaters, ZONAS,
  type Compania, type Explicacion, type FaseId, type Limitante, type Lugar, type Semaforo, type Sesion, type Zona,
} from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import { mensajeDe } from '../formulario'
import type { DatosAtleta, FilaHueco, FilaSesion } from './filas'
import { evaluacionesMotor, evaluacionParaFecha, historialMotor, intentosMotor, seguimientoMotor } from './mapeo'
import { temporadaDe } from './peticion'
import { huecoPasado, vistaSemana } from './semana'

// La semana habitual de Diego, para orientar las semanas sin huecos declarados (dia: 0 = lunes).
export const PATRON_HABITUAL: readonly { dia: number; inicioMin: number; lugar: Lugar; compania: Compania; minutos: number }[] = [
  { dia: 0, inicioMin: 9 * 60, lugar: 'casa', compania: 'solo', minutos: 60 },
  { dia: 0, inicioMin: 19 * 60, lugar: 'rocodromo', compania: 'solo', minutos: 90 },
  { dia: 1, inicioMin: 9 * 60, lugar: 'casa', compania: 'solo', minutos: 60 },
  { dia: 1, inicioMin: 19 * 60, lugar: 'rocodromo', compania: 'con-gente', minutos: 120 },
  { dia: 2, inicioMin: 9 * 60, lugar: 'casa', compania: 'solo', minutos: 60 },
  { dia: 3, inicioMin: 9 * 60, lugar: 'casa', compania: 'solo', minutos: 60 },
  { dia: 3, inicioMin: 19 * 60, lugar: 'rocodromo', compania: 'solo', minutos: 90 },
]

// Los huecos del patrón en una semana. Ids propios que no chocan con los uuid de la base ni con los reservados del motor.
export function huecosDelPatron(lunes: string): FilaHueco[] {
  return PATRON_HABITUAL.map((p) => {
    const fecha = sumarDias(lunes, p.dia)
    return { id: `patron-${fecha}-${p.inicioMin}`, fecha, inicio_min: p.inicioMin, compania: p.compania, lugar: p.lugar, minutos: p.minutos }
  })
}

export type EstadoPlan = 'aceptada' | 'planeada' | 'libre' | 'sin-plan' | 'pasado'

export interface HuecoPlan {
  hueco: FilaHueco
  estado: EstadoPlan
  sesion?: Sesion
  cargaAlta?: boolean
  registrada?: boolean      // solo en las aceptadas
}

export interface SemanaPlanVista {
  lunes: string
  orientativo: boolean      // huecos del patrón habitual, no declarados
  huecos: HuecoPlan[]
  aviso?: string
}

const delaSemana = (d: DatosAtleta, lunes: string): FilaHueco[] => {
  const domingo = sumarDias(lunes, 6)
  return d.huecos.filter((h) => h.fecha >= lunes && h.fecha <= domingo)
}

// Una semana con la misma lógica que «Mi semana» (vistaSemana); sin huecos declarados, con los del patrón.
function semanaPlan(d: DatosAtleta, lunes: string, ahora: { fecha: string; minutos: number }): SemanaPlanVista {
  const orientativo = delaSemana(d, lunes).length === 0
  const datos = orientativo ? { ...d, huecos: [...d.huecos, ...huecosDelPatron(lunes)] } : d
  let v: ReturnType<typeof vistaSemana>
  try {
    v = vistaSemana(datos, lunes, ahora)
  } catch (e) {
    const huecos = delaSemana(datos, lunes)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio_min - b.inicio_min)
      .map((hueco): HuecoPlan => ({ hueco, estado: huecoPasado(hueco, ahora) ? 'pasado' : 'sin-plan' }))
    return { lunes, orientativo, huecos, aviso: `No se ha podido calcular el plan de la semana: ${mensajeDe(e)}` }
  }
  const huecos = v.huecos.map(({ fila: hueco, estado: e }): HuecoPlan => {
    switch (e.tipo) {
      case 'pasado': return { hueco, estado: 'pasado', ...(e.sesion ? { sesion: e.sesion.sesion } : {}) }
      case 'ocupado': return { hueco, estado: 'aceptada', sesion: e.sesion.sesion, registrada: e.registrada }
      case 'planeado': return { hueco, estado: 'planeada', sesion: e.sesion, cargaAlta: e.cargaAlta }
      case 'libre': return { hueco, estado: 'libre' }
      case 'sin-plan': return { hueco, estado: 'sin-plan' }
    }
  })
  return { lunes, orientativo, huecos, ...(v.aviso ? { aviso: v.aviso } : {}) }
}

// Las sesiones planeadas de una semana como si ya estuvieran hechas (sin registro), para planear la siguiente.
// Ids «plan-…»: no son uuid de la base ni los reservados del motor («propuesta-», «semana-»).
function planeadasComoHechas(s: SemanaPlanVista): FilaSesion[] {
  return s.huecos.flatMap(({ hueco, estado, sesion }) => {
    if (estado !== 'planeada' || !sesion) return []
    const id = `plan-${hueco.fecha}-${hueco.inicio_min}`
    return [{ id, fecha: hueco.fecha, sesion: { ...sesion, id, fecha: hueco.fecha, horaInicio: hueco.inicio_min / 60 }, propuesta: null, origen: 'propuesta' }]
  })
}

export function proximosDias(d: DatosAtleta, ahora: { fecha: string; minutos: number }): { semanas: SemanaPlanVista[] } {
  const lunes = lunesDe(ahora.fecha)
  const esta = semanaPlan(d, lunes, ahora)
  const siguiente = semanaPlan({ ...d, sesiones: [...d.sesiones, ...planeadasComoHechas(esta)] }, sumarDias(lunes, 7), ahora)
  return { semanas: [esta, siguiente] }
}

export interface SemanaAno {
  lunes: string
  ciclo: 1 | 2
  faseId: FaseId
  fase: string
  descarga: boolean
  reevaluar: boolean
  actual: boolean
  objetivo: boolean         // la semana del viaje, al final
}

// El calendario de la temporada (descargas programadas; las adelantadas salen en «Qué ha cambiado»).
export function vistaAno(d: DatosAtleta, hoy: string): { semanas: SemanaAno[]; aviso?: string } {
  try {
    const t = temporadaDe(d)
    const actual = lunesDe(hoy)
    const semanas: SemanaAno[] = t.semanas.map((s) => ({
      lunes: s.lunes, ciclo: s.ciclo, faseId: s.faseId, fase: FASES[s.faseId].nombre, descarga: s.descarga, reevaluar: s.reevaluar,
      actual: s.lunes === actual, objetivo: false,
    }))
    const ultima = t.semanas.at(-1)
    if (ultima) {
      semanas.push({
        lunes: t.objetivo, ciclo: ultima.ciclo, faseId: FASE_OBJETIVO.id, fase: FASE_OBJETIVO.nombre, descarga: false, reevaluar: false,
        actual: t.objetivo === actual, objetivo: true,
      })
    }
    return { semanas }
  } catch (e) {
    return { semanas: [], aviso: `No se ha podido calcular el año: ${mensajeDe(e)}` }
  }
}

export type Ciclo2Vista =
  | { tipo: 'pendiente'; fecha: string; limitante: Limitante; explicacion: Explicacion }   // lo que saldría con lo sabido hoy
  | { tipo: 'fijado'; fuerza: number; resistencia: number; refuerzoTecnica: boolean; explicacion: Explicacion }

export interface CambiosResultados {
  ultimoTest: { fecha: string; lastreKg: number; pesoKg: number; fuerzaRelativa: number; vigente: boolean } | null
  // Lastre de los repeaters con el último test (si está vigente): al empezar (70 %) y como mucho (80 %, P-06). Qué
  // escalón toca lo decide el motor en cada sesión de multipresa con las sesiones válidas.
  repeaters: { lastreInicial: number; lastreMaximo: number } | null
  sinSubida: boolean
  zonas: { zona: Zona; semaforo: Semaforo }[]
  descargasAdelantadas: { desde: string; hasta: string; motivo: 'rpe' | 'bienestar' }[]
  ciclo2: Ciclo2Vista | null
  aviso?: string
}

export function cambiosPorResultados(d: DatosAtleta, hoy: string): CambiosResultados {
  try {
    const evaluaciones = evaluacionesMotor(d.evaluaciones)
    const intentos = intentosMotor(d.intentos)
    const e = evaluacionParaFecha(evaluaciones, hoy)
    const vigente = evaluacionVigente(e, hoy)
    const estado = estadoAtleta(historialMotor(d.sesiones), seguimientoMotor(d), hoy)
    const t = temporadaDe(d)
    const lunesCiclo2 = t.semanas.find((s) => s.ciclo === 2)?.lunes
    let ciclo2: Ciclo2Vista | null = null
    if (lunesCiclo2 && hoy < lunesCiclo2) {
      const diagnostico = diagnosticar(evaluaciones, intentos, hoy)
      ciclo2 = { tipo: 'pendiente', fecha: lunesCiclo2, limitante: diagnostico.limitantes[0]!, explicacion: ajusteCiclo2(diagnostico).explicacion }
    } else if (lunesCiclo2) {
      const a = ajusteCiclo2(diagnosticar(evaluaciones, intentos, lunesCiclo2))
      ciclo2 = { tipo: 'fijado', fuerza: a.fuerza, resistencia: a.resistencia, refuerzoTecnica: a.refuerzoTecnica, explicacion: a.explicacion }
    }
    return {
      ultimoTest: e ? { fecha: e.fecha, lastreKg: e.lastreKg, pesoKg: e.pesoCorporalKg, fuerzaRelativa: fuerzaRelativa(e), vigente } : null,
      repeaters: e && vigente ? { lastreInicial: lastreRepeaters(e, FRACCION_INICIAL_REPEATERS), lastreMaximo: lastreRepeaters(e) } : null,
      sinSubida: estado.sinSubida,
      zonas: ZONAS.filter((z) => estado.zonas[z] !== 'verde').map((zona) => ({ zona, semaforo: estado.zonas[zona] })),
      descargasAdelantadas: estado.descargasAdelantadas,
      ciclo2,
    }
  } catch (err) {
    return {
      ultimoTest: null, repeaters: null, sinSubida: false, zonas: [], descargasAdelantadas: [], ciclo2: null,
      aviso: `No se ha podido calcular lo que ha cambiado: ${mensajeDe(err)}`,
    }
  }
}
