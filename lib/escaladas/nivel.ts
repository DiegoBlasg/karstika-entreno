// Tu nivel con lo que apuntas: máximos encadenado y a vista por lugar, distancia al objetivo, proyectos y la pista de
// lectura y táctica (P-75). Puro. Solo informa: el motor no lo usa (no hay umbrales de grado con estudio para prescribir).
import { diaNumero, VALORES } from '../../motor'
import type { FilaEscalada } from '../datos/filas'
import { distanciaGrados, esGradoValido, maxGrado } from './grados'

type Lugar = FilaEscalada['lugar']

export interface NivelLugar {
  lugar: Lugar
  encadenado: string | null          // máximo encadenado (cualquier estilo menos pegues), últimos 90 días
  encadenadoSiempre: string | null
  aVista: string | null              // máximo a vista o flash, últimos 90 días
  aVistaSiempre: string | null
}

export interface Proyecto {
  nombre: string
  tipo: FilaEscalada['tipo']
  lugar: Lugar
  grado: string | null               // el del último registro que lo tenga
  pegues: number                     // todos los pegues apuntados, incluido el día que cayó
  ultimo: string                     // fecha del último día apuntado
  encadenado: string | null          // fecha del encadene; null = abierto
}

export interface VistaNivel {
  vias: NivelLugar[]                 // roca primero; solo los lugares con alguna vía encadenada
  bloque: string | null              // máximo encadenado en bloque, últimos 90 días
  objetivo: { grado: string; actual: string; desde: Lugar | 'perfil'; faltan: number | null }
  abiertos: Proyecto[]
  encadenados: Proyecto[]            // proyectos encadenados en los últimos 90 días
}

const { ventanaDias: VENTANA, escalones: ESCALONES } = VALORES['P-75']
const LUGARES: readonly Lugar[] = ['roca', 'rocodromo']

const encadene = (e: FilaEscalada): boolean => e.estilo !== 'pegues' && e.grado !== null
const aVista = (e: FilaEscalada): boolean => (e.estilo === 'a-vista' || e.estilo === 'flash') && e.grado !== null
const enVentana = (hoy: string) => (e: FilaEscalada): boolean => diaNumero(e.fecha) > diaNumero(hoy) - VENTANA && e.fecha <= hoy
const grados = (xs: readonly FilaEscalada[]): string[] => xs.flatMap((e) => (e.grado === null ? [] : [e.grado]))

// «Ojo de Pez» y « ojo  de pez » son el mismo proyecto.
export const claveNombre = (nombre: string): string => nombre.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')

export function proyectos(escaladas: readonly FilaEscalada[], hoy: string): Proyecto[] {
  const grupos = new Map<string, FilaEscalada[]>()
  for (const e of [...escaladas].filter((x) => x.proyecto && x.nombre !== null && x.fecha <= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const clave = `${claveNombre(e.nombre!)}|${e.tipo}|${e.lugar}`
    grupos.set(clave, [...(grupos.get(clave) ?? []), e])
  }
  return [...grupos.values()].map((xs) => {
    const ultima = xs.at(-1)!
    return {
      nombre: ultima.nombre!.trim(),
      tipo: ultima.tipo,
      lugar: ultima.lugar,
      grado: [...xs].reverse().find((e) => e.grado !== null)?.grado ?? null,
      pegues: xs.reduce((a, e) => a + e.pegues, 0),
      ultimo: ultima.fecha,
      encadenado: xs.find(encadene)?.fecha ?? null,
    }
  })
}

export function vistaNivel(
  escaladas: readonly FilaEscalada[],
  perfil: { grado_actual: string; grado_objetivo: string },
  hoy: string,
): VistaNivel {
  const pasadas = escaladas.filter((e) => e.fecha <= hoy)
  const recientes = pasadas.filter(enVentana(hoy))
  const vias = LUGARES.flatMap((lugar): NivelLugar[] => {
    const de = (xs: readonly FilaEscalada[]) => xs.filter((e) => e.tipo === 'via' && e.lugar === lugar)
    const encadenadoSiempre = maxGrado('via', grados(de(pasadas).filter(encadene)))
    if (encadenadoSiempre === null) return []
    return [{
      lugar,
      encadenado: maxGrado('via', grados(de(recientes).filter(encadene))),
      encadenadoSiempre,
      aVista: maxGrado('via', grados(de(recientes).filter(aVista))),
      aVistaSiempre: maxGrado('via', grados(de(pasadas).filter(aVista))),
    }]
  })
  // El objetivo se mide desde la roca; sin vías en roca, desde el rocódromo; sin nada, el grado del perfil.
  const base = vias[0]
  const actual = base?.encadenadoSiempre ?? perfil.grado_actual
  const meta = perfil.grado_objetivo
  const faltan = esGradoValido('via', actual) && esGradoValido('via', meta) ? Math.max(0, distanciaGrados('via', actual, meta)) : null
  const todos = proyectos(pasadas, hoy)
  return {
    vias,
    bloque: maxGrado('bloque', grados(recientes.filter((e) => e.tipo === 'bloque' && encadene(e)))),
    objetivo: { grado: meta, actual, desde: base?.lugar ?? 'perfil', faltan },
    abiertos: todos.filter((p) => p.encadenado === null),
    encadenados: todos.filter((p) => p.encadenado !== null && diaNumero(p.encadenado) > diaNumero(hoy) - VENTANA),
  }
}

// P-75: en un mismo lugar, en vías y en los últimos 90 días, el máximo trabajado 4 escalones (2 grados) o más por encima
// del máximo a vista o flash. Necesita los dos.
export function pistaLectura(escaladas: readonly FilaEscalada[], hoy: string): { lugar: Lugar; aVista: string; trabajado: string } | null {
  const recientes = escaladas.filter((e) => e.tipo === 'via' && enVentana(hoy)(e))
  for (const lugar of LUGARES) {
    const de = recientes.filter((e) => e.lugar === lugar)
    const vista = maxGrado('via', grados(de.filter(aVista)))
    const trabajado = maxGrado('via', grados(de.filter((e) => e.estilo === 'encadenada' && e.grado !== null)))
    if (vista !== null && trabajado !== null && distanciaGrados('via', vista, trabajado) >= ESCALONES) return { lugar, aVista: vista, trabajado }
  }
  return null
}
