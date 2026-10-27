import {
  ZONAS, type Chequeo, type EstadoAtleta, type Molestia, type Restricciones, type Seguimiento, type Semaforo, type Zona,
} from './autorregulacion-tipos'
import { explicar, type Explicacion } from './explicacion'
import { VALORES } from './parametros'
import { esCargaAlta } from './seguridad'
import { diaNumero, fechaDesdeDia, inicioHoras } from './tiempo'
import type { Sesion } from './tipos'

const ZONAS_CARGA: readonly Zona[] = ['dedos', 'muneca', 'codo', 'hombro']
const ZONAS_P46: readonly Zona[] = ['dedos', 'muneca']
const NOMBRE_ZONA: Record<Zona, string> = { dedos: 'dedos', muneca: 'muñeca/antebrazo', codo: 'codo', hombro: 'hombro', otra: 'otra zona' }
const MAX_MINUTOS = 24 * 60

// P-63: RPE máximo de la sesión. El test de dedos (esfuerzo máximo a propósito) y el descanso no tienen objetivo.
export function objetivoRpe(s: Sesion): number | undefined {
  if (s.tipo === 'descanso' || s.tipo === 'evaluacion-dedos') return undefined
  return esCargaAlta(s) ? VALORES['P-63'].rpeMaxAlta : VALORES['P-63'].rpeMaxSuave
}

const entero = (x: number, min: number, max: number): boolean => Number.isInteger(x) && x >= min && x <= max

function validarMolestias(molestias: readonly Molestia[], donde: string): void {
  if (!Array.isArray(molestias)) throw new Error(`${donde}: molestias debe ser un array`)
  const vistas = new Set<Zona>()
  for (const m of molestias) {
    if (!ZONAS.includes(m.zona)) throw new Error(`${donde}: zona desconocida: ${String(m.zona)}`)
    if (vistas.has(m.zona)) throw new Error(`${donde}: la zona ${m.zona} aparece dos veces`)
    vistas.add(m.zona)
    if (!entero(m.dolor, 0, 10)) throw new Error(`${donde}: el dolor de ${m.zona} debe ser un entero de 0 a 10: ${m.dolor}`)
    if (m.alarma !== undefined && typeof m.alarma !== 'boolean') throw new Error(`${donde}: alarma debe ser booleano`)
  }
}

export function validarSeguimiento(historial: readonly Sesion[], s: Seguimiento): void {
  if (s == null) throw new Error('seguimiento: es obligatorio')
  if (!Array.isArray(s.registros) || !Array.isArray(s.chequeos) || !Array.isArray(s.altas)) {
    throw new Error('seguimiento: registros, chequeos y altas deben ser arrays')
  }
  const sesiones = new Map(historial.map((h) => [h.id, h]))
  const registradas = new Set<string>()
  for (const r of s.registros) {
    const donde = `registro de ${r.sesionId}`
    diaNumero(r.fecha)
    const sesion = sesiones.get(r.sesionId)
    if (!sesion) throw new Error(`${donde}: la sesión no está en el historial`)
    if (sesion.fecha !== r.fecha) throw new Error(`${donde}: la fecha (${r.fecha}) no es la de la sesión (${sesion.fecha})`)
    if (registradas.has(r.sesionId)) throw new Error(`${donde}: hay dos registros de la misma sesión`)
    registradas.add(r.sesionId)
    if (!(Number.isFinite(r.rpe) && r.rpe >= 0 && r.rpe <= 10)) throw new Error(`${donde}: el RPE debe estar entre 0 y 10: ${r.rpe}`)
    if (!(Number.isFinite(r.duracionMin) && r.duracionMin > 0 && r.duracionMin <= MAX_MINUTOS)) {
      throw new Error(`${donde}: duracionMin debe estar entre 1 y ${MAX_MINUTOS}: ${r.duracionMin}`)
    }
    validarMolestias(r.molestias, donde)
  }
  const { escalaMin, escalaMax } = VALORES['P-65']
  const dias = new Set<string>()
  for (const c of s.chequeos) {
    const donde = `chequeo del ${c.fecha}`
    diaNumero(c.fecha)
    if (dias.has(c.fecha)) throw new Error(`${donde}: hay dos chequeos el mismo día`)
    dias.add(c.fecha)
    for (const [campo, v] of [['sueno', c.sueno], ['fatiga', c.fatiga], ['ganas', c.ganas]] as const) {
      if (!entero(v, escalaMin, escalaMax)) throw new Error(`${donde}: ${campo} debe ser un entero de ${escalaMin} a ${escalaMax}: ${v}`)
    }
    validarMolestias(c.molestias, donde)
  }
  for (const a of s.altas) {
    diaNumero(a.fecha)
    if (!ZONAS.includes(a.zona)) throw new Error(`alta del ${a.fecha}: zona desconocida: ${String(a.zona)}`)
  }
}

const mediaChequeo = (c: Chequeo): number => (c.sueno + c.fatiga + c.ganas) / 3
const chequeoBajo = (c: Chequeo): boolean => mediaChequeo(c) <= VALORES['P-65'].umbralBajo

function nivelDe(m: Molestia | undefined): Semaforo {
  if (!m) return 'verde'
  if (m.alarma || m.dolor > VALORES['P-43'].ambarMax) return 'rojo'
  return m.dolor > VALORES['P-43'].verdeMax ? 'ambar' : 'verde'
}

interface Evento {
  dia: number
  orden: number              // registros por hora de inicio de su sesión; el chequeo, al final del día
  fuente: 'registro' | 'chequeo'
  molestias: readonly Molestia[]
}

interface EstadoZona {
  nivel: Semaforo
  porPersistencia: boolean   // el rojo vino de P-45
}

// Semáforo de una zona (P-43 a P-46) recorriendo los eventos en orden.
function semaforoZona(zona: Zona, eventos: readonly Evento[], altas: readonly number[], hoy: number): EstadoZona {
  const { registrosAmbarSeguidos, diasAmbarMax } = VALORES['P-45']
  let ultimoRojo: number | undefined
  let porPersistencia = false
  let ambarDesde: number | undefined
  let ambarRegistros = 0
  let ultimo: Semaforo = 'verde'
  const rojo = (dia: number, persistencia: boolean): void => {
    ultimoRojo = dia
    porPersistencia = persistencia
    ambarDesde = undefined
    ambarRegistros = 0
  }
  for (const e of eventos) {
    const nivel = nivelDe(e.molestias.find((m) => m.zona === zona))
    ultimo = nivel
    if (nivel === 'rojo') {
      rojo(e.dia, false)
    } else if (nivel === 'ambar') {
      ambarDesde ??= e.dia
      if (e.fuente === 'registro') ambarRegistros++
      if (ambarRegistros >= registrosAmbarSeguidos || e.dia - ambarDesde > diasAmbarMax) rojo(e.dia, true)
    } else {
      ambarDesde = undefined
      ambarRegistros = 0
    }
  }
  if (ultimo === 'ambar' && ambarDesde !== undefined && hoy - ambarDesde > diasAmbarMax) rojo(ambarDesde + diasAmbarMax + 1, true)
  if (ultimoRojo !== undefined && !altas.some((a) => a > ultimoRojo!)) return { nivel: 'rojo', porPersistencia }
  // Con alta, la zona vuelve al nivel de su último dato (si el rojo vino del último dato, ya está levantado).
  return { nivel: ultimo === 'rojo' ? 'verde' : ultimo, porPersistencia: false }
}

export function estadoAtleta(historial: readonly Sesion[], s: Seguimiento, fecha: string): EstadoAtleta {
  validarSeguimiento(historial, s)
  const hoy = diaNumero(fecha)
  const sesiones = new Map(historial.map((h) => [h.id, h]))
  const registros = s.registros.filter((r) => diaNumero(r.fecha) <= hoy)
  const chequeos = s.chequeos.filter((c) => diaNumero(c.fecha) <= hoy).sort((a, b) => diaNumero(a.fecha) - diaNumero(b.fecha))
  const registroDe = new Map(registros.map((r) => [r.sesionId, r]))

  const eventos: Evento[] = [
    ...registros.map((r): Evento => ({ dia: diaNumero(r.fecha), orden: sesiones.get(r.sesionId)!.horaInicio, fuente: 'registro', molestias: r.molestias })),
    ...chequeos.map((c): Evento => ({ dia: diaNumero(c.fecha), orden: 24, fuente: 'chequeo', molestias: c.molestias })),
  ].sort((a, b) => a.dia - b.dia || a.orden - b.orden)

  const estadosZona = Object.fromEntries(
    ZONAS.map((z) => [z, semaforoZona(z, eventos, s.altas.filter((a) => a.zona === z && diaNumero(a.fecha) <= hoy).map((a) => diaNumero(a.fecha)), hoy)]),
  ) as Record<Zona, EstadoZona>
  const zonas = Object.fromEntries(ZONAS.map((z) => [z, estadosZona[z].nivel])) as Record<Zona, Semaforo>

  // Sesiones pasadas con objetivo y registro, en orden.
  const pasadas = historial
    .filter((h) => diaNumero(h.fecha) <= hoy)
    .sort((a, b) => inicioHoras(a) - inicioHoras(b) || (a.id < b.id ? -1 : 1))
  const porEncima = (h: Sesion): boolean => {
    const r = registroDe.get(h.id)!
    return r.rpe * r.duracionMin > objetivoRpe(h)! * h.duracionMin
  }
  const conObjetivo = pasadas.filter((h) => objetivoRpe(h) !== undefined && registroDe.has(h.id))
  const molestiaP46 = (ms: readonly Molestia[]): boolean => ms.some((m) => ZONAS_P46.includes(m.zona) && nivelDe(m) !== 'verde')

  const sesionesNoValidas = pasadas
    .filter((h) => {
      const r = registroDe.get(h.id)
      if (!r) return true
      if (objetivoRpe(h) !== undefined && porEncima(h)) return true
      return molestiaP46(r.molestias)
    })
    .map((h) => h.id)

  const conMolestia = eventos.filter((e) => molestiaP46(e.molestias)).at(-1)
  const retornoP46 = conMolestia ? { fecha: fechaDesdeDia(conMolestia.dia) } : undefined

  const ultimaConObjetivo = conObjetivo.at(-1)
  const frenoRpe = ultimaConObjetivo !== undefined && porEncima(ultimaConObjetivo)
  const hayAmbar = ZONAS.some((z) => zonas[z] === 'ambar')

  // Descarga adelantada (P-50): por RPE desde el día siguiente a la segunda sesión por encima; por bienestar desde
  // el día del tercer chequeo bajo. Dura P-65.diasDescarga días.
  const { sesionesPorEncimaSeguidas, chequeosBajos, ventanaDias } = VALORES['P-50']
  const duracion = VALORES['P-65'].diasDescarga
  const disparos: { desde: number; motivo: 'rpe' | 'bienestar' }[] = []
  let seguidas = 0
  for (const h of conObjetivo) {
    seguidas = porEncima(h) ? seguidas + 1 : 0
    if (seguidas >= sesionesPorEncimaSeguidas) {
      disparos.push({ desde: diaNumero(h.fecha) + 1, motivo: 'rpe' })
      seguidas = 0
    }
  }
  for (let k = chequeosBajos - 1; k < chequeos.length; k++) {
    const grupo = chequeos.slice(k - chequeosBajos + 1, k + 1)
    const dentro = diaNumero(grupo.at(-1)!.fecha) - diaNumero(grupo[0]!.fecha) <= ventanaDias - 1
    if (dentro && grupo.every(chequeoBajo)) disparos.push({ desde: diaNumero(grupo.at(-1)!.fecha), motivo: 'bienestar' })
  }
  const activo = disparos
    .filter((d) => hoy >= d.desde && hoy <= d.desde + duracion - 1)
    .sort((a, b) => b.desde - a.desde || (a.motivo < b.motivo ? 1 : -1))[0]
  const descargaAdelantada = activo
    ? { desde: fechaDesdeDia(activo.desde), hasta: fechaDesdeDia(activo.desde + duracion - 1), motivo: activo.motivo }
    : undefined

  const chequeoHoy = chequeos.find((c) => diaNumero(c.fecha) === hoy)
  const chequeoBajoHoy = chequeoHoy !== undefined && chequeoBajo(chequeoHoy)

  const explicaciones: Explicacion[] = []
  const conMolestias = ZONAS.filter((z) => zonas[z] !== 'verde')
  if (conMolestias.length > 0) {
    const partes = conMolestias.map((z) => {
      const persistencia = estadosZona[z].porPersistencia ? ' (ámbar repetido o de más de 7 días, P-45)' : ''
      return `${NOMBRE_ZONA[z]} en ${zonas[z]}${persistencia}`
    })
    const hayRojo = conMolestias.some((z) => zonas[z] === 'rojo')
    explicaciones.push(
      explicar(
        'autorregulacion.semaforo',
        ['P-43', 'P-44', 'P-45', 'P-46', 'P-64'],
        `Semáforo de dolor: ${partes.join(', ')}. ${
          hayRojo
            ? 'Con un rojo se bloquea la carga de la zona hasta que un fisioterapeuta te dé el alta; consulta con uno.'
            : 'En ámbar no sube la carga y se quita la intensidad que carga la zona; si se repite en 2 sesiones o dura más de 7 días, pasa a rojo.'
        } Los umbrales y lo que bloquea cada zona son decisión de diseño, en la dirección segura. El motor no diagnostica.`,
      ),
    )
  }
  if (frenoRpe) {
    explicaciones.push(
      explicar(
        'autorregulacion.freno',
        ['P-11', 'P-63', 'P-34'],
        'Tu última sesión quedó por encima del esfuerzo previsto (RPE × minutos): la carga no sube en la siguiente. Una sola sesión dura no baja la carga.',
      ),
    )
  }
  if (descargaAdelantada) {
    explicaciones.push(
      explicar(
        'autorregulacion.descarga-adelantada',
        descargaAdelantada.motivo === 'rpe' ? ['P-50', 'P-63', 'P-34'] : ['P-50', 'P-65'],
        `${
          descargaAdelantada.motivo === 'rpe'
            ? `${sesionesPorEncimaSeguidas} sesiones seguidas por encima del esfuerzo previsto`
            : `${chequeosBajos} chequeos seguidos con bienestar bajo en ${ventanaDias} días`
        }: se adelanta una descarga del ${descargaAdelantada.desde} al ${descargaAdelantada.hasta} (mitad de volumen, nada al límite). Los umbrales son decisión de diseño.`,
      ),
    )
  }
  if (chequeoBajoHoy) {
    explicaciones.push(
      explicar(
        'autorregulacion.chequeo-bajo',
        ['P-65'],
        'Tu chequeo de hoy es bajo (sueño, fatiga y ganas con media de 2 o menos): hoy no hay sesiones de intensidad alta, solo técnica o volumen suave. El umbral es decisión de diseño.',
      ),
    )
  }

  return {
    zonas,
    sinSubida: frenoRpe || hayAmbar,
    ...(descargaAdelantada ? { descargaAdelantada } : {}),
    chequeoBajoHoy,
    sesionesNoValidas,
    ...(retornoP46 ? { retornoP46 } : {}),
    explicaciones,
  }
}

// P-64 y P-65: qué impide el estado hoy.
export function restriccionesDe(e: EstadoAtleta): Restricciones {
  const z = e.zonas
  const rojoCarga = (['dedos', 'muneca', 'codo'] as const).some((x) => z[x] === 'rojo')
  const soloDescanso = z.hombro === 'rojo' || z.otra === 'rojo'
  const soloHombro = rojoCarga && !soloDescanso
  return {
    sinCargaAlta: ZONAS_CARGA.some((x) => z[x] === 'ambar') || e.chequeoBajoHoy,
    sinLimite: z.otra === 'ambar',
    soloHombro,
    soloDescanso,
    hombroSinCarga: z.hombro === 'ambar' || soloHombro,
    sinDominadas: ZONAS_CARGA.some((x) => z[x] !== 'verde') || ZONAS.some((x) => z[x] === 'rojo'),
  }
}
