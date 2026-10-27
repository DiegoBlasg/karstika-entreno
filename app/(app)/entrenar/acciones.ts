'use server'

import { redirect } from 'next/navigation'
import { validarSesion, type Consejo } from '@/motor'
import { conChequeo, conSesion, filaSesionAceptada } from '@/lib/datos/cambios'
import type { FilaChequeo, FilaSesion } from '@/lib/datos/filas'
import { historialMotor, perfilMotor } from '@/lib/datos/mapeo'
import { opcionElegida, prepararPropuesta, type EntradaPeticion, type Preparacion } from '@/lib/datos/peticion'
import { validarDatos } from '@/lib/datos/validar'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid } from '@/lib/fecha'
import { contexto, entero, fecha, hora, mensajeDe, molestias, texto } from '@/lib/formulario'
import { guardarChequeo, insertarSesion, requerirDatos } from '@/lib/servidor/consultas'

export type EstadoProponer = { error: string; detalle?: string } | { entrada: EntradaPeticion; prep: Preparacion } | null

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
  const { sql, datos } = await requerirDatos()
  let prep: Preparacion
  try {
    // El chequeo se valida con el resto de datos (dentro de prepararPropuesta) antes de guardarlo.
    prep = prepararPropuesta(chequeo ? conChequeo(datos, chequeo) : datos, entrada)
  } catch (e) {
    return { error: 'No se ha podido preparar la sesión.', detalle: mensajeDe(e) }
  }
  if (chequeo) {
    try {
      await guardarChequeo(sql, chequeo)
    } catch (e) {
      return { error: `No se ha podido guardar el chequeo: ${mensajeDe(e)}` }
    }
  }
  return { entrada, prep }
}

// Vuelve a ejecutar el motor con los datos actuales (no se fía de lo que manda el navegador) y guarda la opción
// elegida si sigue siendo la misma y es válida.
export async function aceptar(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  let entrada: EntradaPeticion
  let indice: number
  let tipo: string
  try {
    entrada = JSON.parse(texto(fd, 'entrada', 'La petición')) as EntradaPeticion
    indice = entero(fd, 'indice', 'La opción', 0, 10)
    tipo = texto(fd, 'tipo', 'El tipo de sesión')
  } catch {
    return { error: 'Petición no válida: vuelve a preparar la sesión.' }
  }
  if (typeof entrada?.fecha !== 'string' || entrada.fecha < ahoraMadrid(new Date()).fecha) {
    return { error: 'Solo puedes aceptar sesiones para hoy o para días futuros.' }
  }
  const { sql, datos } = await requerirDatos()
  let fila: FilaSesion
  let consejos: Consejo[]
  try {
    const prep = prepararPropuesta(datos, entrada)
    if (prep.tipo !== 'propuesta') return { error: prep.mensaje }
    const plan = opcionElegida(prep.propuesta, indice)
    if (!plan || plan.sesion.tipo !== tipo) return { error: 'La propuesta ha cambiado desde que la pediste: vuelve a prepararla.' }
    fila = filaSesionAceptada(plan, crypto.randomUUID())
    const violaciones = validarSesion(fila.sesion, historialMotor(datos.sesiones), perfilMotor(datos.perfil))
    if (violaciones.length > 0) return { error: `La sesión ya no es válida: ${violaciones.map((v) => v.mensaje).join(' ')}` }
    validarDatos(conSesion(datos, fila))
    consejos = prep.consejos
  } catch (e) {
    return { error: `No se ha podido aceptar la sesión: ${mensajeDe(e)}` }
  }
  try {
    await insertarSesion(sql, fila, consejos.map((c) => ({ consejo_id: c.id, fecha: entrada.fecha })))
  } catch (e) {
    return { error: `No se ha podido guardar la sesión: ${mensajeDe(e)}` }
  }
  redirect('/')
}
