'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validarEvaluacion } from '@/motor'
import { conEvaluacion } from '@/lib/datos/cambios'
import type { FilaEvaluacion, FilaPruebaCasa } from '@/lib/datos/filas'
import { evaluacionMotor } from '@/lib/datos/mapeo'
import { validarDatos } from '@/lib/datos/validar'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid } from '@/lib/fecha'
import { entero, fecha, mensajeDe, numero, numeroOpcional, texto, textoOpcional } from '@/lib/formulario'
import { borrarEvaluacionBd, borrarPruebaCasaBd, insertarEvaluacion, insertarPruebaCasa, requerirDatos } from '@/lib/servidor/consultas'

export async function guardarEvaluacion(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const { sql, datos } = await requerirDatos()
  let fila: FilaEvaluacion
  try {
    fila = {
      id: crypto.randomUUID(),
      fecha: fecha(fd, 'fecha', 'La fecha'),
      peso_corporal_kg: numero(fd, 'peso_corporal_kg', 'El peso', 30, 200),
      lastre_kg: numero(fd, 'lastre_kg', 'El lastre', -100, 150),
      resistencia_s: numeroOpcional(fd, 'resistencia_s', 'La resistencia', 1, 3600),
      tecnica: numeroOpcional(fd, 'tecnica', 'La técnica', 1, 7),
      colgado_30_s: numeroOpcional(fd, 'colgado_30_s', 'Los segundos colgado en 30 mm', 1, 3600),
      power_slap_cm: numeroOpcional(fd, 'power_slap_cm', 'El power slap', 0, 300),
    }
    if (fila.fecha > ahoraMadrid(new Date()).fecha) return { error: 'La fecha del test no puede ser futura.' }
    validarEvaluacion(evaluacionMotor(fila))
    validarDatos(conEvaluacion(datos, fila))
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await insertarEvaluacion(sql, fila)
  } catch (e) {
    return { error: `No se ha podido guardar la evaluación: ${mensajeDe(e)}` }
  }
  revalidatePath('/progreso')
  // Fuera de los try/catch (redirect lanza una excepción de control de flujo). Solo desde Progreso: el test guiado del
  // cronómetro no manda `tras` y necesita el `ok` para seguir en su pantalla.
  if (fd.get('tras') === 'reunion') redirect(`/reunion/${fila.id}`)
  return { ok: 'Evaluación guardada.' }
}

export async function borrarEvaluacion(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const { sql } = await requerirDatos()
  try {
    await borrarEvaluacionBd(sql, texto(fd, 'id', 'La evaluación'))
  } catch (e) {
    return { error: `No se ha podido borrar la evaluación: ${mensajeDe(e)}` }
  }
  revalidatePath('/progreso')
  return { ok: 'Evaluación borrada.' }
}

// El test en casa: dominadas máximas y apertura de cadera (al menos una de las dos), uno por día.
export async function guardarPruebaCasa(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const { sql, datos } = await requerirDatos()
  let fila: FilaPruebaCasa
  try {
    fila = {
      id: crypto.randomUUID(),
      fecha: fecha(fd, 'fecha', 'La fecha'),
      dominadas: textoOpcional(fd, 'dominadas') === null ? null : entero(fd, 'dominadas', 'Las dominadas', 0, 100),
      cadera_cm: numeroOpcional(fd, 'cadera_cm', 'La apertura de cadera', 0, 200),
    }
    if (fila.dominadas === null && fila.cadera_cm === null) return { error: 'Apunta las dominadas, la apertura de cadera o las dos.' }
    if (fila.fecha > ahoraMadrid(new Date()).fecha) return { error: 'La fecha del test no puede ser futura.' }
    if ((datos.pruebasCasa ?? []).some((x) => x.fecha === fila.fecha)) {
      return { error: 'Ya tienes un test en casa ese día. Bórralo en Progreso si quieres cambiarlo.' }
    }
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await insertarPruebaCasa(sql, fila)
  } catch (e) {
    return { error: `No se ha podido guardar el test en casa: ${mensajeDe(e)}` }
  }
  revalidatePath('/progreso')
  return { ok: 'Test en casa guardado.' }
}

export async function borrarPruebaCasa(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const { sql } = await requerirDatos()
  try {
    await borrarPruebaCasaBd(sql, texto(fd, 'id', 'El test en casa'))
  } catch (e) {
    return { error: `No se ha podido borrar el test en casa: ${mensajeDe(e)}` }
  }
  revalidatePath('/progreso')
  return { ok: 'Test en casa borrado.' }
}
