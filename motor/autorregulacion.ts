import {
  ZONAS, type Chequeo, type EstadoAtleta, type Molestia, type RegistroSesion, type Restricciones, type Seguimiento, type Semaforo, type Zona,
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
  orden: number              // el alta y el chequeo al empezar el día (se hacen al pedir la sesión); los registros, por hora
  fuente: 'registro' | 'chequeo' | 'alta'
  molestias: readonly Molestia[]
}

interface EstadoZona {
  nivel: Semaforo
  porPersistencia: boolean   // el rojo vino de P-45
  levantado?: number         // último día en que se levantó un rojo (alta o 7 días sin dolor)
}

// Semáforo de una zona (P-43 a P-46) recorriendo los eventos en orden. Un alta posterior al último rojo lo levanta;
// si la zona seguía en ámbar, la cuenta de P-45 vuelve a empezar desde el alta.
function semaforoZona(zona: Zona, eventos: readonly Evento[], hoy: number): EstadoZona {
  const { registrosAmbarSeguidos, diasAmbarMax } = VALORES['P-45']
  let ultimoRojo: number | undefined
  let porPersistencia = false
  let ambarDesde: number | undefined
  let ambarRegistros = 0             // días distintos con un registro en ámbar (P-45)
  let diaRegistroAmbar: number | undefined
  let ultimo: Semaforo = 'verde'
  let levantado: number | undefined
  let verdeDesde: number | undefined   // primer dato sin dolor tras un rojo por persistencia
  const rojo = (dia: number, persistencia: boolean): void => {
    // Un rojo que exige alta (dolor 4 o más, o alarma) no se convierte en «por persistencia» porque luego se
    // repita el ámbar: sigue exigiendo alta.
    porPersistencia = persistencia && (ultimoRojo === undefined || porPersistencia)
    ultimoRojo = dia
    ambarDesde = undefined
    ambarRegistros = 0
    diaRegistroAmbar = undefined
    verdeDesde = undefined
  }
  const persistente = (dia: number): boolean => ultimo === 'ambar' && ambarDesde !== undefined && dia - ambarDesde > diasAmbarMax
  // P-46: un rojo que vino de un ámbar persistente se levanta solo tras 7 días seguidos con dolor 0-1, y hace falta
  // un dato sin dolor al final de esos 7 días (sin datos no se supone que no duele: falla cerrado, como P-45).
  const sinDolor = VALORES['P-46'].diasSinDolorTrasPersistencia
  const levantarSiSinDolor = (dia: number): void => {
    if (ultimoRojo !== undefined && porPersistencia && verdeDesde !== undefined && dia - verdeDesde >= sinDolor) {
      levantado = dia
      ultimoRojo = undefined
      porPersistencia = false
      verdeDesde = undefined
    }
  }
  for (const e of eventos) {
    if (e.fuente === 'alta') {
      if (e.molestias[0]?.zona !== zona) continue
      // Si el ámbar ya pasa a rojo justo el día del alta, ese rojo es del mismo día y el alta no lo levanta (hace
      // falta una posterior). Decisión conservadora, coherente con la regla general del alta.
      if (persistente(e.dia)) rojo(ambarDesde! + diasAmbarMax + 1, true)
      if (ultimoRojo !== undefined && e.dia > ultimoRojo) {
        levantado = e.dia
        ultimoRojo = undefined
        porPersistencia = false
        if (ultimo === 'rojo') ultimo = 'verde'
        ambarDesde = ultimo === 'ambar' ? e.dia : undefined
        ambarRegistros = 0
      diaRegistroAmbar = undefined
        diaRegistroAmbar = undefined
    diaRegistroAmbar = undefined
      }
      continue
    }
    const nivel = nivelDe(e.molestias.find((m) => m.zona === zona))
    ultimo = nivel
    if (nivel === 'rojo') {
      rojo(e.dia, false)
    } else if (nivel === 'ambar') {
      ambarDesde ??= e.dia
      // Con dos sesiones el mismo día, un ámbar en las dos no cuenta doble: P-45 pide ámbar en 2 días distintos.
      if (e.fuente === 'registro' && e.dia !== diaRegistroAmbar) {
        ambarRegistros++
        diaRegistroAmbar = e.dia
      }
      if (ambarRegistros >= registrosAmbarSeguidos || e.dia - ambarDesde > diasAmbarMax) rojo(e.dia, true)
    } else {
      ambarDesde = undefined
      ambarRegistros = 0
      diaRegistroAmbar = undefined
    diaRegistroAmbar = undefined
      if (ultimoRojo !== undefined && porPersistencia) {
        verdeDesde ??= e.dia
        levantarSiSinDolor(e.dia)
      }
    }
    if (nivel !== 'verde') verdeDesde = undefined
  }
  if (persistente(hoy)) rojo(ambarDesde! + diasAmbarMax + 1, true)
  const extra = levantado !== undefined ? { levantado } : {}
  if (ultimoRojo !== undefined) return { nivel: 'rojo', porPersistencia, ...extra }
  return { nivel: ultimo, porPersistencia: false, ...extra }
}

export function estadoAtleta(historial: readonly Sesion[], s: Seguimiento, fecha: string): EstadoAtleta {
  validarSeguimiento(historial, s)
  const hoy = diaNumero(fecha)
  const sesiones = new Map(historial.map((h) => [h.id, h]))
  const registros = s.registros.filter((r) => diaNumero(r.fecha) <= hoy)
  const chequeos = s.chequeos.filter((c) => diaNumero(c.fecha) <= hoy).sort((a, b) => diaNumero(a.fecha) - diaNumero(b.fecha))
  const registroDe = new Map(registros.map((r) => [r.sesionId, r]))
  // Una zona que no aparece en un registro toma el valor del chequeo de ese día (decisión del usuario del 2026-10-27):
  // con dos sesiones el mismo día, la de la mañana sin apuntar los dedos no pone en verde un ámbar.
  const chequeoDe = new Map(chequeos.map((c) => [c.fecha, c]))
  const molestiasDe = (r: RegistroSesion): readonly Molestia[] => {
    const c = chequeoDe.get(r.fecha)
    if (!c) return r.molestias
    const listadas = new Set(r.molestias.map((m) => m.zona))
    return [...r.molestias, ...c.molestias.filter((m) => !listadas.has(m.zona))]
  }

  const eventos: Evento[] = [
    ...registros.map((r): Evento => ({ dia: diaNumero(r.fecha), orden: sesiones.get(r.sesionId)!.horaInicio, fuente: 'registro', molestias: molestiasDe(r) })),
    ...chequeos.map((c): Evento => ({ dia: diaNumero(c.fecha), orden: -1, fuente: 'chequeo', molestias: c.molestias })),
  ].sort((a, b) => a.dia - b.dia || a.orden - b.orden)
  // Las altas van al principio de su día: un rojo de ese mismo día no queda levantado (tiene que ser posterior).
  const conAltas: Evento[] = [
    ...s.altas
      .filter((a) => diaNumero(a.fecha) <= hoy)
      .map((a): Evento => ({ dia: diaNumero(a.fecha), orden: -2, fuente: 'alta', molestias: [{ zona: a.zona, dolor: 0 }] })),
    ...eventos,
  ].sort((a, b) => a.dia - b.dia || a.orden - b.orden)

  const estadosZona = Object.fromEntries(ZONAS.map((z) => [z, semaforoZona(z, conAltas, hoy)])) as Record<Zona, EstadoZona>
  const zonas = Object.fromEntries(ZONAS.map((z) => [z, estadosZona[z].nivel])) as Record<Zona, Semaforo>

  // Sesiones pasadas con objetivo y registro, en orden.
  const pasadas = historial
    .filter((h) => diaNumero(h.fecha) <= hoy)
    .sort((a, b) => inicioHoras(a) - inicioHoras(b) || (a.id < b.id ? -1 : 1))
  // P-63: por encima si el RPE pasa del máximo o si la carga (RPE × minutos reales) pasa de la prevista.
  const porEncima = (h: Sesion): boolean => {
    const r = registroDe.get(h.id)!
    const max = objetivoRpe(h)!
    return r.rpe > max || r.rpe * r.duracionMin > max * h.duracionMin
  }
  // P-11: para subir, la sesión tiene que haberse completado (al menos P-63.fraccionCompletada de lo previsto).
  const incompleta = (h: Sesion): boolean => registroDe.get(h.id)!.duracionMin < VALORES['P-63'].fraccionCompletada * h.duracionMin
  const conObjetivo = pasadas.filter((h) => objetivoRpe(h) !== undefined && registroDe.has(h.id))
  const molestiaP46 = (ms: readonly Molestia[]): boolean => ms.some((m) => ZONAS_P46.includes(m.zona) && nivelDe(m) !== 'verde')

  const sesionesNoValidas = pasadas
    .filter((h) => {
      const r = registroDe.get(h.id)
      if (!r) return true
      if (objetivoRpe(h) !== undefined && porEncima(h)) return true
      if (incompleta(h)) return true
      return molestiaP46(molestiasDe(r))
    })
    .map((h) => h.id)
  const sesionesSinRegistro = pasadas.filter((h) => !registroDe.has(h.id)).map((h) => h.id)

  // P-46: cada episodio de molestia en dedos o muñeca (racha de datos con dolor 2 o más, o alarma) cuenta una vez,
  // en la fecha en que aparece.
  const molestiasP46: { fecha: string; orden: number }[] = []
  let enEpisodio = false
  for (const e of eventos) {
    const con = molestiaP46(e.molestias)
    if (con && !enEpisodio) molestiasP46.push({ fecha: fechaDesdeDia(e.dia), orden: e.orden })
    enEpisodio = con
  }

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
  const descargasAdelantadas = [...disparos]
    .sort((a, b) => a.desde - b.desde)
    .map((d) => ({ desde: fechaDesdeDia(d.desde), hasta: fechaDesdeDia(d.desde + duracion - 1), motivo: d.motivo }))
  const activo = disparos
    .filter((d) => hoy >= d.desde && hoy <= d.desde + duracion - 1)
    .sort((a, b) => b.desde - a.desde || (a.motivo < b.motivo ? 1 : -1))[0]
  const descargaAdelantada = activo
    ? { desde: fechaDesdeDia(activo.desde), hasta: fechaDesdeDia(activo.desde + duracion - 1), motivo: activo.motivo }
    : undefined

  const levantados = (['dedos', 'muneca', 'codo'] as const).flatMap((z) => (estadosZona[z].levantado !== undefined ? [estadosZona[z].levantado!] : []))
  const retestDesde = levantados.length > 0 ? fechaDesdeDia(Math.max(...levantados)) : undefined

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
  const testDespues = historial.some((h) => h.tipo === 'evaluacion-dedos' && retestDesde !== undefined && h.fecha >= retestDesde && diaNumero(h.fecha) <= hoy)
  if (retestDesde && !testDespues) {
    explicaciones.push(
      explicar(
        'autorregulacion.retest',
        ['P-46'],
        `Desde el ${retestDesde} se levantó un rojo en dedos, muñeca o codo: los tests de dedos anteriores ya no valen para fijar la carga. Repite el test antes de volver a cargar por porcentaje; mientras, la multipresa va por esfuerzo percibido.`,
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
    descargasAdelantadas,
    ...(retestDesde ? { retestDesde } : {}),
    chequeoBajoHoy,
    sesionesNoValidas,
    sesionesSinRegistro,
    molestiasP46,
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
    hombroSinCarga: z.hombro === 'ambar' || z.codo === 'ambar' || soloHombro,
    sinDominadas: ZONAS_CARGA.some((x) => z[x] !== 'verde') || ZONAS.some((x) => z[x] === 'rojo') || e.chequeoBajoHoy,
  }
}
