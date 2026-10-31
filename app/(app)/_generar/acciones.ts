'use server'

import { revalidatePath } from 'next/cache'
import { NOMBRE_TIPO, TIPOS_SESION, validarSesion, type Explicacion, type TipoSesion } from '@/motor'
import { HORA_FRANJA, type Franja } from '@/lib/datos/agenda'
import { conChequeo, conSesion, filaSesionAceptada, sinSesion } from '@/lib/datos/cambios'
import type { DatosAtleta, FilaChequeo, FilaSesion } from '@/lib/datos/filas'
import { conflictoFranja, elegirGenerado, otraOpcion } from '@/lib/datos/generar'
import { historialMotor, perfilMotor } from '@/lib/datos/mapeo'
import { prepararPropuesta, type EntradaPeticion } from '@/lib/datos/peticion'
import { validarDatos } from '@/lib/datos/validar'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid } from '@/lib/fecha'
import { contexto, entero, fecha, mensajeDe, molestias, opcion, opcionOpcional, texto } from '@/lib/formulario'
import { guardarChequeo, insertarSesion, requerirDatos, sustituirSesion } from '@/lib/servidor/consultas'

export type EstadoGenerar =
  | null
  | { error: string }
  | { ok: string }
  | { descanso: { motivo: Explicacion; alternativas: { tipo: TipoSesion; nombre: string; minutos: number }[] } }

const FRANJAS = ['manana', 'tarde'] as const satisfies readonly Franja[]
const TEXTO_FRANJA: Record<Franja, string> = { manana: 'mañana', tarde: 'tarde' }

// «Generar entreno»: el motor propone y la sesión queda aceptada directamente. Si toca descansar no se guarda nada y se
// devuelven las alternativas (la primera, «Core y movilidad», P-72), que se generan pasando su `tipo`.
export async function generar(_previo: EstadoGenerar, fd: FormData): Promise<EstadoGenerar> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let entrada: EntradaPeticion
  let f: Franja
  let tipo: TipoSesion | null
  let chequeo: FilaChequeo | null = null
  try {
    f = opcion(fd, 'franja', 'Cuándo', FRANJAS)
    entrada = { fecha: fecha(fd, 'fecha', 'El día'), horaInicio: HORA_FRANJA[f], contexto: contexto(fd) }
    tipo = opcionOpcional(fd, 'tipo', 'El tipo de sesión', TIPOS_SESION)
    if (entrada.fecha < hoy) return { error: 'Solo puedes generar entrenos para hoy o días futuros.' }
    const choque = conflictoFranja(datos, entrada.fecha, f)
    if (choque) return { error: choque }
    // Hoy sin chequeo guardado, la hoja lo pide (P-65) y se guarda con la sesión.
    if (entrada.fecha === hoy && fd.has('sueno')) {
      chequeo = {
        fecha: hoy,
        sueno: entero(fd, 'sueno', 'El sueño', 1, 5),
        fatiga: entero(fd, 'fatiga', 'La fatiga', 1, 5),
        ganas: entero(fd, 'ganas', 'Las ganas', 1, 5),
        molestias: molestias(fd),
      }
    }
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  const base: DatosAtleta = chequeo ? conChequeo(datos, chequeo) : datos
  let fila: FilaSesion
  try {
    const r = elegirGenerado(prepararPropuesta(base, entrada), tipo ?? undefined)
    if (r.tipo === 'error') return { error: r.mensaje }
    if (r.tipo === 'descanso') {
      return {
        descanso: {
          motivo: r.motivo,
          alternativas: r.alternativas.map((a) => ({ tipo: a.sesion.tipo, nombre: NOMBRE_TIPO[a.sesion.tipo], minutos: a.sesion.duracionMin })),
        },
      }
    }
    fila = filaSesionAceptada(r.plan, crypto.randomUUID(), entrada.contexto)
    const violaciones = validarSesion(fila.sesion, historialMotor(base.sesiones), perfilMotor(base.perfil))
    if (violaciones.length > 0) return { error: `La sesión no es válida: ${violaciones.map((v) => v.mensaje).join(' ')}` }
    validarDatos(conSesion(base, fila), fila.id)
  } catch (e) {
    return { error: `No se ha podido generar: ${mensajeDe(e)}` }
  }
  try {
    if (chequeo) await guardarChequeo(sql, chequeo)
    await insertarSesion(sql, fila, [])
  } catch (e) {
    return { error: `No se ha podido guardar: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  revalidatePath('/semana')
  return { ok: `Listo: ${NOMBRE_TIPO[fila.sesion.tipo]} · ${TEXTO_FRANJA[f]} · ${fila.sesion.duracionMin} min` }
}

// Cambia una sesión aceptada, sin registrar, de hoy o futura, por la siguiente opción del motor con su mismo contexto.
export async function otraOpcionAccion(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let nueva: FilaSesion
  let idViejo: string
  try {
    idViejo = texto(fd, 'sesion_id', 'La sesión')
    const vieja = datos.sesiones.find((s) => s.id === idViejo)
    const ctx = vieja?.propuesta?.contexto
    if (!vieja || !ctx) return { error: 'Esa sesión no se puede cambiar desde aquí.' }
    if (vieja.fecha < hoy) return { error: 'Solo puedes cambiar sesiones de hoy o de días futuros.' }
    if (datos.registros.some((r) => r.sesion_id === idViejo)) return { error: 'Esa sesión ya está registrada.' }
    const base = sinSesion(datos, idViejo)
    const plan = otraOpcion(prepararPropuesta(base, { fecha: vieja.fecha, horaInicio: vieja.sesion.horaInicio, contexto: ctx }), vieja.sesion.tipo)
    if (!plan) return { error: 'No hay otra opción para ese día.' }
    nueva = filaSesionAceptada(plan, crypto.randomUUID(), ctx)
    validarDatos(conSesion(base, nueva), nueva.id)
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    if (!(await sustituirSesion(sql, idViejo, nueva))) return { error: 'Esa sesión ya está registrada o ya no existe.' }
  } catch (e) {
    return { error: `No se ha podido cambiar: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  revalidatePath('/semana')
  return { ok: `Cambiada por ${NOMBRE_TIPO[nueva.sesion.tipo]}.` }
}
