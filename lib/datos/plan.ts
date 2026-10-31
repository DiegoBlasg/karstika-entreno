// Lo que muestra la pantalla «Plan»: el año por semanas y lo que ha cambiado por tus resultados. Puro: no guarda nada.
import {
  ajusteCiclo2, diagnosticar, estadoAtleta, evaluacionVigente, FASE_OBJETIVO, FASES, FRACCION_INICIAL_REPEATERS, fuerzaRelativa, lastreRepeaters, ZONAS,
  type Explicacion, type FaseId, type Limitante, type Semaforo, type Zona,
} from '../../motor'
import { lunesDe } from '../fecha'
import { mensajeDe } from '../formulario'
import type { DatosAtleta } from './filas'
import { evaluacionesMotor, evaluacionParaFecha, historialMotor, frenosMotor, seguimientoMotor } from './mapeo'
import { diagnosticoCiclo2, temporadaDe } from './peticion'

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
    const respuestas = frenosMotor(d)
    const e = evaluacionParaFecha(evaluaciones, hoy)
    const vigente = evaluacionVigente(e, hoy)
    const estado = estadoAtleta(historialMotor(d.sesiones), seguimientoMotor(d), hoy)
    const t = temporadaDe(d)
    const lunesCiclo2 = t.semanas.find((s) => s.ciclo === 2)?.lunes
    let ciclo2: Ciclo2Vista | null = null
    if (lunesCiclo2 && hoy < lunesCiclo2) {
      const diagnostico = diagnosticar(evaluaciones, respuestas, hoy)
      ciclo2 = { tipo: 'pendiente', fecha: lunesCiclo2, limitante: diagnostico.limitantes[0]!, explicacion: ajusteCiclo2(diagnostico).explicacion }
    } else if (lunesCiclo2) {
      const a = ajusteCiclo2(diagnosticoCiclo2(d, lunesCiclo2))
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
