// «Tus tests» de Progreso: una fila por prueba (fuerza, colgado, power slap, dominadas, cadera) con el último valor, el
// cambio desde el anterior y si es un cambio real (P-19). Puro.
import { fuerzaRelativa, VALORES } from '../../motor'
import type { DatosAtleta } from './filas'
import { evaluacionMotor } from './mapeo'

export type IdTest = 'fuerza' | 'colgado' | 'power-slap' | 'dominadas' | 'cadera'

export interface FilaTest {
  id: IdTest
  nombre: string
  unidad: string
  ultimo: number
  fecha: string
  cambio: number | null              // desde el anterior, en la unidad de la prueba; null con una sola medida
  cambioPct: number | null           // el mismo cambio en % del anterior
  real: 'mejora' | 'empeora' | null  // supera el umbral de P-19 o 3 medidas seguidas en la misma dirección
  umbral: string                     // el margen del test, para mostrarlo («10 %», «2»)
  medidas: number
  conDescarga?: boolean              // colgado con descarga: se compara solo con otros con descarga
}

export interface VistaTests {
  filas: FilaTest[]
  antiguos73: { fecha: string; segundos: number }[]   // el 7:3 al 60 % de antes de 2026-11: otra prueba, aparte
}

interface Medida { fecha: string; valor: number }
interface Prueba {
  id: IdTest; nombre: string; unidad: string; umbral: number; relativo: boolean; menosEsMejor: boolean; medidas: Medida[]
  umbralPct?: number   // además del absoluto, también vale este % (power slap)
  conDescarga?: boolean
}

const U = VALORES['P-19']

function filaDe(p: Prueba): FilaTest | null {
  const ultima = p.medidas.at(-1)
  if (!ultima) return null
  const anterior = p.medidas.at(-2)
  const cambio = anterior ? ultima.valor - anterior.valor : null
  const cambioPct = anterior && cambio !== null && anterior.valor !== 0 ? (cambio / anterior.valor) * 100 : null
  const signo = (d: number): number => (p.menosEsMejor ? -Math.sign(d) : Math.sign(d))
  let sentido = 0
  if (anterior && cambio !== null) {
    const tamano = p.relativo ? Math.abs(cambioPct ?? 0) : Math.abs(cambio)
    const porPct = p.umbralPct !== undefined && cambioPct !== null && Math.abs(cambioPct) >= p.umbralPct - 1e-9
    if (tamano >= p.umbral - 1e-9 || porPct) sentido = signo(cambio)
    // O la misma dirección en 3 medidas seguidas (P-19).
    const tres = p.medidas.slice(-3).map((m) => m.valor)
    if (sentido === 0 && tres.length === 3) {
      const a = Math.sign(tres[1]! - tres[0]!)
      const b = Math.sign(tres[2]! - tres[1]!)
      if (a !== 0 && a === b) sentido = signo(b)
    }
  }
  return {
    id: p.id, nombre: p.nombre, unidad: p.unidad, ultimo: ultima.valor, fecha: ultima.fecha, cambio, cambioPct,
    real: sentido > 0 ? 'mejora' : sentido < 0 ? 'empeora' : null,
    umbral: `${p.umbral}${p.relativo ? ' %' : p.unidad === 'cm' ? ' cm' : ''}${p.umbralPct !== undefined ? ` o ${p.umbralPct} %` : ''}`,
    medidas: p.medidas.length,
    ...(p.conDescarga ? { conDescarga: true } : {}),
  }
}

const medidas = <T extends { fecha: string }>(xs: readonly T[], v: (x: T) => number | null | undefined): Medida[] =>
  xs.flatMap((x) => {
    const valor = v(x)
    return valor === null || valor === undefined ? [] : [{ fecha: x.fecha, valor }]
  })

export function vistaTests(d: DatosAtleta, hoy: string): VistaTests {
  const evs = d.evaluaciones.filter((e) => e.fecha <= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const casa = (d.pruebasCasa ?? []).filter((c) => c.fecha <= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))
  // El colgado sigue el protocolo del último (con o sin descarga): los dos no se comparan.
  const colgados = evs.filter((e) => e.colgado_30_s != null)
  const conDescarga = colgados.at(-1)?.colgado_con_descarga === true
  const pruebas: Prueba[] = [
    { id: 'fuerza', nombre: 'Fuerza de dedos', unidad: '% del peso', umbral: U.fuerzaPct, relativo: true, menosEsMejor: false, medidas: medidas(evs, (e) => fuerzaRelativa(evaluacionMotor(e))) },
    {
      id: 'colgado', nombre: 'Colgado en 30 mm', unidad: 's', umbral: U.colgadoPct, relativo: true, menosEsMejor: false, conDescarga,
      medidas: medidas(colgados.filter((e) => (e.colgado_con_descarga === true) === conDescarga), (e) => e.colgado_30_s),
    },
    {
      id: 'power-slap', nombre: 'Power slap', unidad: 'cm', umbral: U.powerSlapCm, umbralPct: U.powerSlapPct, relativo: false, menosEsMejor: false,
      medidas: medidas(evs, (e) => e.power_slap_cm),
    },
    { id: 'dominadas', nombre: 'Dominadas máximas', unidad: 'dominadas', umbral: U.dominadas, relativo: false, menosEsMejor: false, medidas: medidas(casa, (c) => c.dominadas) },
    { id: 'cadera', nombre: 'Apertura de cadera', unidad: 'cm', umbral: U.caderaCm, relativo: false, menosEsMejor: true, medidas: medidas(casa, (c) => c.cadera_cm) },
  ]
  return {
    filas: pruebas.flatMap((p) => filaDe(p) ?? []),
    antiguos73: evs.flatMap((e) => (e.resistencia_s === null ? [] : [{ fecha: e.fecha, segundos: e.resistencia_s }])),
  }
}
