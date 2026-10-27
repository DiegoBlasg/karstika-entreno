'use server'

import { revalidatePath } from 'next/cache'
import { TIPOS_SESION, validarSesion, ZONAS, type TipoSesion } from '@/motor'
import { conRegistro, conSesion, filaSesionLibre, sinSesion } from '@/lib/datos/cambios'
import type { FilaIntento, FilaRegistro, FilaSesion } from '@/lib/datos/filas'
import { historialMotor, perfilMotor } from '@/lib/datos/mapeo'
import { validarDatos } from '@/lib/datos/validar'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid } from '@/lib/fecha'
import { entero, hora, intentos, mensajeDe, molestias, opcion, texto } from '@/lib/formulario'
import { TIPOS_CON_INTENTOS } from '@/lib/nombres'
import { borrarSesionBd, insertarAlta, insertarRegistro, requerirDatos, sustituirSesion } from '@/lib/servidor/consultas'

const TIPOS_LIBRES = TIPOS_SESION.filter((t): t is Exclude<TipoSesion, 'descanso'> => t !== 'descanso')

export async function registrar(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let registro: FilaRegistro
  let filasIntentos: FilaIntento[]
  try {
    const sesionId = texto(fd, 'sesion_id', 'La sesión')
    const fila = datos.sesiones.find((s) => s.id === sesionId)
    if (!fila) return { error: 'Esa sesión ya no existe.' }
    if (fila.fecha > hoy) return { error: 'No puedes registrar una sesión de un día futuro.' }
    registro = {
      sesion_id: sesionId,
      rpe: entero(fd, 'rpe', 'El esfuerzo', 0, 10),
      duracion_min: entero(fd, 'minutos', 'Los minutos', 1, 1440),
      molestias: molestias(fd),
      registrado_en: new Date().toISOString(),
    }
    filasIntentos = TIPOS_CON_INTENTOS.includes(fila.sesion.tipo)
      ? intentos(fd).map((i) => ({
          id: crypto.randomUUID(), sesion_id: sesionId, fecha: fila.fecha, encadenado: i.encadenado, motivo_caida: i.motivoCaida ?? null,
        }))
      : []
    validarDatos(conRegistro(datos, registro, filasIntentos))
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await insertarRegistro(sql, registro, filasIntentos)
  } catch (e) {
    return { error: `No se ha podido guardar el registro: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  return { ok: 'Sesión registrada.' }
}

export async function noLaHice(fd: FormData): Promise<void> {
  const { sql } = await requerirDatos()
  await borrarSesionBd(sql, texto(fd, 'sesion_id', 'La sesión'))
  revalidatePath('/')
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
    if (vieja.fecha > hoy) return { error: 'Solo puedes cambiar sesiones de hoy o de días pasados.' }
    libre = filaSesionLibre({
      id: crypto.randomUUID(),
      tipo: opcion(fd, 'tipo', 'Lo que hiciste', TIPOS_LIBRES),
      intensidad: opcion(fd, 'intensidad', 'La intensidad', ['alta', 'suave']),
      fecha: vieja.fecha,
      horaInicio: hora(fd, 'hora', 'La hora'),
      duracionMin: entero(fd, 'minutos', 'Los minutos', 1, 1440),
    })
    const sinVieja = sinSesion(datos, idViejo)
    validarDatos(conSesion(sinVieja, libre))
    const avisos = validarSesion(libre.sesion, historialMotor(sinVieja.sesiones), perfilMotor(datos.perfil)).map((v) => v.mensaje)
    if (avisos.length > 0 && fd.get('confirmar') !== 'on') {
      return { error: 'El entrenador no habría propuesto esto. Revisa los avisos y confirma si lo hiciste así.', avisos }
    }
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await sustituirSesion(sql, idViejo, libre)
  } catch (e) {
    return { error: `No se ha podido guardar: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  return { ok: 'Guardado. Ahora registra cómo fue.' }
}

export async function alta(fd: FormData): Promise<void> {
  const { sql } = await requerirDatos()
  const zona = opcion(fd, 'zona', 'La zona', ZONAS)
  await insertarAlta(sql, { zona, fecha: ahoraMadrid(new Date()).fecha })
  revalidatePath('/')
}
