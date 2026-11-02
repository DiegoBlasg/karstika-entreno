// Tu nivel con lo que apuntas: máximos encadenado y a vista por lugar, distancia al objetivo, proyectos y la pista de
// lectura y táctica (P-75). Puro. Solo informa: el motor no lo usa (no hay umbrales de grado con estudio para prescribir).
import { diaNumero, VALORES } from '../../motor'
import type { FilaEscalada } from '../datos/filas'
import { distanciaGrados, esGradoValido, GRADOS_BLOQUE, GRADOS_VIA, maxGrado, type TipoEscalada } from './grados'

type Lugar = FilaEscalada['lugar']

export interface NivelLugar {
  lugar: Lugar
  encadenado: string | null          // máximo encadenado (cualquier estilo menos pegues), últimos 90 días
  encadenadoSiempre: string | null
  aVista: string | null              // máximo a vista o flash, últimos 90 días
  aVistaSiempre: string | null
}

export interface Proyecto {
  clave: string                      // nombre normalizado|tipo|lugar: identifica al proyecto abierto
  nombre: string
  tipo: FilaEscalada['tipo']
  lugar: Lugar
  grado: string | null               // el del último registro que lo tenga
  pegues: number                     // todos los pegues apuntados, incluido el día que cayó
  ultimo: string                     // fecha del último día apuntado
  encadenado: string | null          // fecha del encadene
  abandonado: string | null          // fecha en que lo dejaste; abierto = ni encadenado ni abandonado
}

export interface VistaNivel {
  vias: NivelLugar[]                 // roca primero; solo los lugares con alguna vía encadenada
  bloque: string | null              // máximo encadenado en bloque, últimos 90 días
  // `escalones`: los grados que faltan hasta el objetivo, en orden (vacío si ya llegaste; null si un grado no es de la escala).
  objetivo: { grado: string; actual: string; desde: Lugar | 'perfil'; escalones: string[] | null }
  abiertos: Proyecto[]
  encadenados: Proyecto[]            // proyectos encadenados en los últimos 90 días
}

const { ventanaDias: VENTANA, escalones: ESCALONES } = VALORES['P-75']
const LUGARES: readonly Lugar[] = ['roca', 'rocodromo']

export const esEncadene = (e: Pick<FilaEscalada, 'estilo' | 'grado'>): boolean =>
  (e.estilo === 'a-vista' || e.estilo === 'flash' || e.estilo === 'encadenada') && e.grado !== null
const encadene = esEncadene
const aVista = (e: FilaEscalada): boolean => (e.estilo === 'a-vista' || e.estilo === 'flash') && e.grado !== null
const enVentana = (hoy: string) => (e: FilaEscalada): boolean => diaNumero(e.fecha) > diaNumero(hoy) - VENTANA && e.fecha <= hoy
const grados = (xs: readonly FilaEscalada[]): string[] => xs.flatMap((e) => (e.grado === null ? [] : [e.grado]))

// «Ojo de Pez» y « ojo  de pez » son el mismo proyecto.
export const claveNombre = (nombre: string): string => nombre.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')

export const claveProyecto = (e: Pick<FilaEscalada, 'tipo' | 'lugar'> & { nombre: string }): string => `${claveNombre(e.nombre)}|${e.tipo}|${e.lugar}`

// Los proyectos en orden: un proyecto se cierra al encadenarlo o al dejarlo, y el mismo nombre después abre otro. El
// de actividad más reciente primero.
export function proyectos(escaladas: readonly FilaEscalada[], hoy: string): Proyecto[] {
  const grupos: FilaEscalada[][] = []
  const abiertos = new Map<string, FilaEscalada[]>()
  // El mismo día, el abandono va después de los pegues (al corregir un registro, sus filas se reinsertan más tarde).
  const ultimoSiAbandono = (e: FilaEscalada): number => (e.estilo === 'abandonado' ? 1 : 0)
  const ordenadas = [...escaladas]
    .filter((x) => x.proyecto && x.nombre !== null && x.fecha <= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || ultimoSiAbandono(a) - ultimoSiAbandono(b))
  for (const e of ordenadas) {
    const clave = claveProyecto({ ...e, nombre: e.nombre! })
    let grupo = abiertos.get(clave)
    // Un abandono sin proyecto abierto (repetido) no cierra nada ni crea un proyecto vacío.
    if (!grupo && e.estilo === 'abandonado') continue
    if (!grupo) {
      grupo = []
      grupos.push(grupo)
      abiertos.set(clave, grupo)
    }
    grupo.push(e)
    if (encadene(e) || e.estilo === 'abandonado') abiertos.delete(clave)
  }
  return grupos.map((xs): Proyecto => {
    const ultima = xs.at(-1)!
    return {
      clave: claveProyecto({ ...ultima, nombre: ultima.nombre! }),
      nombre: xs[0]!.nombre!.trim(),   // como se escribió la primera vez
      tipo: ultima.tipo,
      lugar: ultima.lugar,
      grado: [...xs].reverse().find((e) => e.grado !== null)?.grado ?? null,
      pegues: xs.reduce((a, e) => a + (e.estilo === 'abandonado' ? 0 : e.pegues), 0),
      ultimo: ultima.fecha,
      encadenado: xs.find(encadene)?.fecha ?? null,
      abandonado: xs.find((e) => e.estilo === 'abandonado')?.fecha ?? null,
    }
  }).sort((a, b) => b.ultimo.localeCompare(a.ultimo))
}

// Los grados de referencia para los botones de grado: tu nivel en vía (como en «Tu nivel») y tu mejor bloque reciente.
export function gradosReferencia(
  escaladas: readonly FilaEscalada[], perfil: { grado_actual: string; grado_objetivo: string }, hoy: string,
): { via: string; bloque: string } {
  const v = vistaNivel(escaladas, perfil, hoy)
  return { via: esGradoValido('via', v.objetivo.actual) ? v.objetivo.actual : '6b', bloque: v.bloque ?? '6A' }
}

export const estaAbierto = (p: Proyecto): boolean => p.encadenado === null && p.abandonado === null

// Los proyectos abiertos (los que se pueden elegir al apuntar pegues).
export const proyectosAbiertos = (escaladas: readonly FilaEscalada[], hoy: string): Proyecto[] => proyectos(escaladas, hoy).filter(estaAbierto)

// Los grados que se ofrecen como botones: 3 por debajo y 2 por encima del de referencia, dentro de la escala.
export function ventanaGrados(tipo: TipoEscalada, referencia: string): string[] {
  const escala = tipo === 'via' ? GRADOS_VIA : GRADOS_BLOQUE
  const i = Math.max(0, escala.indexOf(referencia))
  const desde = Math.min(Math.max(0, i - 3), escala.length - 6)
  return escala.slice(desde, desde + 6)
}

// El grado del perfil es texto libre: «6B » vale como 6b.
const gradoPerfil = (g: string): string => g.trim().toLowerCase()

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
  // El objetivo se mide desde la roca; sin vías en roca, desde lo mayor entre el rocódromo y el grado del perfil (unas
  // vías fáciles de rocódromo no bajan el grado que dijiste).
  const roca = vias.find((n) => n.lugar === 'roca')
  const rocodromo = vias.find((n) => n.lugar === 'rocodromo')
  const delPerfil = gradoPerfil(perfil.grado_actual)
  const meta = esGradoValido('via', gradoPerfil(perfil.grado_objetivo)) ? gradoPerfil(perfil.grado_objetivo) : perfil.grado_objetivo
  let actual: string
  let desde: Lugar | 'perfil'
  if (roca) [actual, desde] = [roca.encadenadoSiempre!, 'roca']
  else if (rocodromo && (!esGradoValido('via', delPerfil) || distanciaGrados('via', delPerfil, rocodromo.encadenadoSiempre!) > 0)) {
    [actual, desde] = [rocodromo.encadenadoSiempre!, 'rocodromo']
  } else [actual, desde] = [esGradoValido('via', delPerfil) ? delPerfil : perfil.grado_actual, 'perfil']
  const escalones = esGradoValido('via', actual) && esGradoValido('via', meta)
    ? GRADOS_VIA.slice(GRADOS_VIA.indexOf(actual) + 1, Math.max(GRADOS_VIA.indexOf(actual) + 1, GRADOS_VIA.indexOf(meta) + 1))
    : null
  const todos = proyectos(pasadas, hoy)
  return {
    vias,
    bloque: maxGrado('bloque', grados(recientes.filter((e) => e.tipo === 'bloque' && encadene(e)))),
    objetivo: { grado: meta, actual, desde, escalones },
    abiertos: todos.filter(estaAbierto),
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
