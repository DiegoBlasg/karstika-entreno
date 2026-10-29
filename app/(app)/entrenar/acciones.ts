'use server'

import { redirect } from 'next/navigation'
import { validarSesion, type Consejo } from '@/motor'
import { conChequeo, conSesion, datosSinReemplazada, filaSesionAceptada } from '@/lib/datos/cambios'
import type { FilaChequeo, FilaSesion } from '@/lib/datos/filas'
import { historialMotor, perfilMotor } from '@/lib/datos/mapeo'
import { opcionElegida, prepararPropuesta, type EntradaPeticion, type Preparacion } from '@/lib/datos/peticion'
import { posicionEnTemporada, type PosicionTemporada } from '@/lib/datos/temporada'
import { validarDatos } from '@/lib/datos/validar'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid } from '@/lib/fecha'
import { contexto, entero, fecha, hora, leerEntradaPeticion, mensajeDe, molestias, texto, textoOpcional } from '@/lib/formulario'
import { guardarChequeo, insertarConsejos, insertarSesion, requerirDatos, sustituirSesion } from '@/lib/servidor/consultas'

export type EstadoProponer =
  | { error: string; detalle?: string }
  | { entrada: EntradaPeticion; prep: Preparacion; posicion: PosicionTemporada | null; reemplaza?: string }
  | null

export async function proponer(_previo: EstadoProponer, fd: FormData): Promise<EstadoProponer> {
  const hoy = ahoraMadrid(new Date()).fecha
  let entrada: EntradaPeticion
  let chequeo: FilaChequeo | null = null
  try {
    entrada = { fecha: fecha(fd, 'fecha', 'El día'), horaInicio: hora(fd, 'hora', 'La hora'), contexto: contexto(fd) }
    if (entrada.fecha < hoy) return { error: 'Solo puedes pedir sesiones para hoy o para días futuros.' }
    if (entrada.fecha === hoy) {
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
  const reemplaza = textoOpcional(fd, 'reemplaza')
  const { sql, datos } = await requerirDatos()
  let base = datos
  if (reemplaza) {
    try {
      base = datosSinReemplazada(datos, reemplaza, hoy)
    } catch (e) {
      return { error: mensajeDe(e) }
    }
  }
  let prep: Preparacion
  try {
    // El chequeo se valida con el resto de datos (dentro de prepararPropuesta) antes de guardarlo.
    prep = prepararPropuesta(chequeo ? conChequeo(base, chequeo) : base, entrada)
  } catch (e) {
    return { error: 'No se ha podido preparar la sesión.', detalle: mensajeDe(e) }
  }
  // Solo se guarda el chequeo si de verdad hay propuesta (fuera de temporada no cuenta para nada).
  if (chequeo && prep.tipo === 'propuesta') {
    try {
      await guardarChequeo(sql, chequeo)
    } catch (e) {
      return { error: `No se ha podido guardar el chequeo: ${mensajeDe(e)}` }
    }
  }
  // La descarga es la de la fase aplicada: una adelantada por el bienestar sustituye a la del calendario.
  const enCalendario = prep.tipo === 'propuesta' ? posicionEnTemporada(base, entrada.fecha) : null
  const posicion = enCalendario && prep.tipo === 'propuesta' ? { ...enCalendario, descarga: prep.fase.descarga === true } : null
  return { entrada, prep, posicion, ...(reemplaza ? { reemplaza } : {}) }
}

// Vuelve a ejecutar el motor con los datos actuales (no se fía de lo que manda el navegador) y guarda la opción
// elegida si sigue siendo la misma y es válida.
export async function aceptar(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  let entrada: EntradaPeticion
  let indice: number
  let tipo: string
  try {
    entrada = leerEntradaPeticion(JSON.parse(texto(fd, 'entrada', 'La petición')))
    indice = entero(fd, 'indice', 'La opción', 0, 10)
    tipo = texto(fd, 'tipo', 'El tipo de sesión')
  } catch {
    return { error: 'Petición no válida: vuelve a preparar la sesión.' }
  }
  const hoy = ahoraMadrid(new Date()).fecha
  if (entrada.fecha < hoy) {
    return { error: 'Solo puedes aceptar sesiones para hoy o para días futuros.' }
  }
  const reemplaza = textoOpcional(fd, 'reemplaza')
  const { sql, datos } = await requerirDatos()
  let fila: FilaSesion
  let consejos: Consejo[]
  try {
    const base = reemplaza ? datosSinReemplazada(datos, reemplaza, hoy) : datos
    const prep = prepararPropuesta(base, entrada)
    if (prep.tipo !== 'propuesta') return { error: prep.mensaje }
    const plan = opcionElegida(prep.propuesta, indice)
    if (!plan || plan.sesion.tipo !== tipo) return { error: 'La propuesta ha cambiado desde que la pediste: vuelve a prepararla.' }
    fila = filaSesionAceptada(plan, crypto.randomUUID())
    const violaciones = validarSesion(fila.sesion, historialMotor(base.sesiones), perfilMotor(datos.perfil))
    if (violaciones.length > 0) return { error: `La sesión ya no es válida: ${violaciones.map((v) => v.mensaje).join(' ')}` }
    validarDatos(conSesion(base, fila))
    consejos = prep.consejos
  } catch (e) {
    return { error: `No se ha podido aceptar la sesión: ${mensajeDe(e)}` }
  }
  try {
    const filasConsejos = consejos.map((c) => ({ consejo_id: c.id, fecha: entrada.fecha }))
    if (reemplaza) {
      if (!(await sustituirSesion(sql, reemplaza, fila))) {
        return { error: 'Esa sesión ya está registrada o ya no existe: no se ha cambiado nada.' }
      }
      await insertarConsejos(sql, filasConsejos)
    } else {
      await insertarSesion(sql, fila, filasConsejos)
    }
  } catch (e) {
    return { error: `No se ha podido guardar la sesión: ${mensajeDe(e)}` }
  }
  redirect('/')
}
