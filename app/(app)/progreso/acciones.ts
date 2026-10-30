'use server'

import { revalidatePath } from 'next/cache'
import { validarEvaluacion } from '@/motor'
import { conEvaluacion } from '@/lib/datos/cambios'
import type { FilaEvaluacion } from '@/lib/datos/filas'
import { evaluacionMotor } from '@/lib/datos/mapeo'
import { validarDatos } from '@/lib/datos/validar'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid } from '@/lib/fecha'
import { fecha, mensajeDe, numero, numeroOpcional, texto } from '@/lib/formulario'
import { borrarEvaluacionBd, insertarEvaluacion, requerirDatos } from '@/lib/servidor/consultas'

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
