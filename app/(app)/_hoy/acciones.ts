'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { TIPOS_SESION, validarSesion, ZONAS, type TipoSesion, type Zona } from '@/motor'
import { conAlta, conChequeo, conRegistro, conRegistroCorregido, conSesion, filaSesionLibre, sinSesion } from '@/lib/datos/cambios'
import type { DatosAtleta, FilaChequeo, FilaEscalada, FilaRegistro, FilaSesion } from '@/lib/datos/filas'
import { escaladasDelRegistro } from '@/lib/escaladas/formulario'
import { proyectos } from '@/lib/escaladas/nivel'
import { corregible, vistaHoy } from '@/lib/datos/hoy'
import { historialMotor, perfilMotor } from '@/lib/datos/mapeo'
import { validarDatos } from '@/lib/datos/validar'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid } from '@/lib/fecha'
import { detalleRegleta, encadene, entero, fecha as leerFecha, freno, hora, mensajeDe, molestias, opcion, texto } from '@/lib/formulario'
import { TIPOS_AL_LIMITE, TIPOS_CON_REGLETA } from '@/lib/nombres'
import {
  borrarSesionBd, borrarSesionRegistradaBd, corregirRegistroBd, guardarChequeo, insertarAlta, insertarRegistro, insertarSesionRegistrada, requerirDatos, sustituirSesion,
} from '@/lib/servidor/consultas'

const TIPOS_LIBRES = TIPOS_SESION.filter((t): t is Exclude<TipoSesion, 'descanso'> => t !== 'descanso')

// RPE, minutos, molestias y, en las sesiones al límite, qué frenó y si se encadenó (el mismo formulario para registrar
// y para corregir).
function leerRegistro(fd: FormData, fila: FilaSesion): FilaRegistro {
  const alLimite = TIPOS_AL_LIMITE.includes(fila.sesion.tipo)
  return {
    sesion_id: fila.id,
    rpe: entero(fd, 'rpe', 'El esfuerzo', 0, 10),
    duracion_min: entero(fd, 'minutos', 'Los minutos', 1, 1440),
    molestias: molestias(fd),
    registrado_en: new Date().toISOString(),
    freno: alLimite ? freno(fd) : null,
    encadene: alLimite && encadene(fd),
  }
}

// Los encadenes y los pegues a un proyecto de una sesión al límite. Los proyectos abiertos, sin contar lo ya apuntado en
// esta misma sesión (al corregir, se sustituye). Si cayó un proyecto, el registro cuenta como «encadené».
function leerEscaladas(fd: FormData, fila: FilaSesion, datos: DatosAtleta, hoy: string, r: FilaRegistro): { registro: FilaRegistro; escaladas: FilaEscalada[] } {
  if (!TIPOS_AL_LIMITE.includes(fila.sesion.tipo)) return { registro: r, escaladas: [] }
  const otras = (datos.escaladas ?? []).filter((e) => e.sesion_id !== fila.id)
  const abiertos = proyectos(otras, hoy).filter((p) => p.encadenado === null)
  const escaladas = escaladasDelRegistro(fd, fila, abiertos)
  const encadenado = escaladas.some((e) => e.estilo !== 'pegues')
  return { registro: { ...r, encadene: r.encadene || encadenado }, escaladas }
}

function sesionDe(fd: FormData, datos: DatosAtleta): FilaSesion | null {
  const id = texto(fd, 'sesion_id', 'La sesión')
  return datos.sesiones.find((s) => s.id === id) ?? null
}

export async function registrar(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let leido: FilaRegistro
  let escaladas: FilaEscalada[]
  try {
    const fila = sesionDe(fd, datos)
    if (!fila) return { error: 'Esa sesión ya no existe.' }
    if (fila.fecha > hoy) return { error: 'No puedes registrar una sesión de un día futuro.' }
    const leidas = leerEscaladas(fd, fila, datos, hoy, leerRegistro(fd, fila))
    leido = leidas.registro
    escaladas = leidas.escaladas
    validarDatos(conRegistro(datos, leido))
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await insertarRegistro(sql, leido, escaladas)
  } catch (e) {
    return { error: `No se ha podido guardar el registro: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  // Fuera de los try/catch (redirect lanza una excepción de control de flujo): tras registrar se celebra la chapa.
  redirect(`/chapa/${leido.sesion_id}`)
}

// Corrige el RPE, los minutos, las molestias y qué te frenó de una sesión registrada en los últimos 7 días.
export async function corregirRegistro(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let leido: FilaRegistro
  let escaladas: FilaEscalada[]
  try {
    const fila = sesionDe(fd, datos)
    if (!fila) return { error: 'Esa sesión ya no existe.' }
    if (!datos.registros.some((r) => r.sesion_id === fila.id)) return { error: 'Esa sesión todavía no está registrada.' }
    if (!corregible(fila.fecha, hoy)) return { error: 'Solo puedes corregir registros de los últimos 7 días.' }
    const leidas = leerEscaladas(fd, fila, datos, hoy, leerRegistro(fd, fila))
    leido = leidas.registro
    escaladas = leidas.escaladas
    validarDatos(conRegistroCorregido(datos, leido))
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await corregirRegistroBd(sql, leido, escaladas)
  } catch (e) {
    return { error: `No se ha podido corregir el registro: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  return { ok: 'Registro corregido.' }
}

const YA_REGISTRADA = 'Esa sesión ya está registrada: no se puede cambiar ni borrar.'

// Borra una sesión registrada de los últimos 7 días con todo lo apuntado (p. ej. un entrenamiento apuntado sin querer).
export async function borrarRegistrada(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let id: string
  try {
    id = texto(fd, 'sesion_id', 'La sesión')
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  const s = datos.sesiones.find((x) => x.id === id)
  if (!s || !datos.registros.some((r) => r.sesion_id === id)) return { error: 'Esa sesión no está registrada.' }
  if (!corregible(s.fecha, hoy)) return { error: 'Solo puedes borrar lo registrado en los últimos 7 días.' }
  try {
    if (!(await borrarSesionRegistradaBd(sql, id))) return { error: 'Esa sesión ya no existe.' }
  } catch (e) {
    return { error: `No se ha podido borrar: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  revalidatePath('/semana')
  return { ok: 'Sesión borrada.' }
}

export async function noLaHice(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const { sql, datos } = await requerirDatos()
  let id: string
  try {
    id = texto(fd, 'sesion_id', 'La sesión')
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  if (datos.registros.some((r) => r.sesion_id === id)) return { error: YA_REGISTRADA }
  try {
    // La consulta solo borra si sigue sin registro (por si se ha registrado en otra pestaña).
    if (!(await borrarSesionBd(sql, id))) return { error: YA_REGISTRADA }
  } catch (e) {
    return { error: `No se ha podido borrar: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  return { ok: 'Sesión borrada.' }
}

// Sustituye la sesión por lo que se hizo de verdad. Las reglas de seguridad solo avisan (lo hecho, hecho está): si
// hay avisos, se muestran y hace falta confirmarlos para guardar.
export async function otraCosa(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let libre: FilaSesion
  let idViejo: string
  try {
    idViejo = texto(fd, 'sesion_id', 'La sesión')
    const vieja = datos.sesiones.find((s) => s.id === idViejo)
    if (!vieja) return { error: 'Esa sesión ya no existe.' }
    if (datos.registros.some((r) => r.sesion_id === idViejo)) return { error: YA_REGISTRADA }
    if (vieja.fecha > hoy) return { error: 'Solo puedes cambiar sesiones de hoy o de días pasados.' }
    const tipo = opcion(fd, 'tipo', 'Lo que hiciste', TIPOS_LIBRES)
    libre = filaSesionLibre({
      id: crypto.randomUUID(),
      tipo,
      intensidad: opcion(fd, 'intensidad', 'La intensidad', ['alta', 'suave']),
      fecha: vieja.fecha,
      horaInicio: hora(fd, 'hora', 'La hora'),
      duracionMin: entero(fd, 'minutos', 'Los minutos', 1, 1440),
      ...(TIPOS_CON_REGLETA.includes(tipo) ? { detalle: detalleRegleta(fd) } : {}),
    })
    const sinVieja = sinSesion(datos, idViejo)
    validarDatos(conSesion(sinVieja, libre), libre.id)
    const avisos = validarSesion(libre.sesion, historialMotor(sinVieja.sesiones), perfilMotor(datos.perfil)).map((v) => v.mensaje)
    if (avisos.length > 0 && fd.get('confirmar') !== 'on') {
      return { error: 'El entrenador no habría propuesto esto. Revisa los avisos y confirma si lo hiciste así.', avisos }
    }
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    // La consulta solo sustituye si la vieja sigue sin registro (por si se ha registrado en otra pestaña).
    if (!(await sustituirSesion(sql, idViejo, libre))) return { error: YA_REGISTRADA }
  } catch (e) {
    return { error: `No se ha podido guardar: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  return { ok: 'Guardado. Ahora registra cómo fue.' }
}

export async function alta(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const { sql, datos } = await requerirDatos()
  const fecha = ahoraMadrid(new Date()).fecha
  let zona: Zona
  try {
    zona = opcion(fd, 'zona', 'La zona', ZONAS)
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  // El motor coloca las altas al empezar su día: la de hoy no levanta un rojo apuntado hoy. Se comprueba antes de guardar.
  try {
    const tras = vistaHoy(conAlta(datos, { id: crypto.randomUUID(), zona, fecha }), fecha)
    if (tras.zonasRojo.includes(zona)) {
      return {
        error: 'Esta alta no levanta el rojo: tiene que ser posterior al día en que apuntaste el dolor. Regístrala el día en que te la dé el fisio (si el rojo es de hoy, a partir de mañana).',
      }
    }
    await insertarAlta(sql, { zona, fecha })
  } catch (e) {
    return { error: `No se ha podido guardar el alta: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  return { ok: 'Alta registrada.' }
}

// El chequeo de hoy desde Hoy (el mismo que guarda Entrenar al preparar): con él, las sesiones de hoy aceptadas
// avisan si ya no encajan.
export async function guardarChequeoHoy(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let chequeo: FilaChequeo
  try {
    chequeo = {
      fecha: hoy,
      sueno: entero(fd, 'sueno', 'El sueño', 1, 5),
      fatiga: entero(fd, 'fatiga', 'La fatiga', 1, 5),
      ganas: entero(fd, 'ganas', 'Las ganas', 1, 5),
      molestias: molestias(fd),
    }
    validarDatos(conChequeo(datos, chequeo))
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await guardarChequeo(sql, chequeo)
  } catch (e) {
    return { error: `No se ha podido guardar el chequeo: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  return { ok: 'Chequeo guardado.' }
}

// Un entrenamiento que no estaba planeado, de hoy o de los 7 días anteriores: la sesión libre y su registro, guardados
// juntos. Como en «Hice otra cosa», las reglas de seguridad solo avisan y hay que confirmarlas.
export async function apuntarEntrenamiento(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let libre: FilaSesion
  let leido: FilaRegistro
  try {
    const dia = leerFecha(fd, 'fecha', 'El día')
    if (!corregible(dia, hoy)) return { error: 'Solo puedes apuntar entrenamientos de hoy o de los 7 días anteriores.' }
    const tipo = opcion(fd, 'tipo', 'Lo que hiciste', TIPOS_LIBRES)
    libre = filaSesionLibre({
      id: crypto.randomUUID(),
      tipo,
      intensidad: opcion(fd, 'intensidad', 'La intensidad', ['alta', 'suave']),
      fecha: dia,
      horaInicio: hora(fd, 'hora', 'La hora'),
      // La duración de la sesión y los minutos reales son el mismo dato: un solo campo `minutos`.
      duracionMin: entero(fd, 'minutos', 'Los minutos', 1, 1440),
      ...(TIPOS_CON_REGLETA.includes(tipo) ? { detalle: detalleRegleta(fd) } : {}),
    })
    leido = leerRegistro(fd, libre)
    validarDatos(conRegistro(conSesion(datos, libre), leido), libre.id)
    const avisos = validarSesion(libre.sesion, historialMotor(datos.sesiones), perfilMotor(datos.perfil)).map((v) => v.mensaje)
    if (avisos.length > 0 && fd.get('confirmar') !== 'on') {
      return { error: 'El entrenador no habría propuesto esto. Revisa los avisos y confirma si lo hiciste así.', avisos }
    }
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await insertarSesionRegistrada(sql, libre, leido)
  } catch (e) {
    return { error: `No se ha podido guardar el entrenamiento: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  return { ok: 'Entrenamiento apuntado.' }
}
