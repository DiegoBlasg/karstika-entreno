'use server'

import { revalidatePath } from 'next/cache'
import type { FilaHueco } from '@/lib/datos/filas'
import { MAX_HUECOS_DIA, MAX_HUECOS_SEMANA, validarHuecoNuevo } from '@/lib/datos/huecos'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid, lunesDe } from '@/lib/fecha'
import { contexto, fecha, hora, mensajeDe, texto } from '@/lib/formulario'
import { borrarHuecoBd, insertarHueco, requerirDatos } from '@/lib/servidor/consultas'

export async function anadirHueco(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let fila: FilaHueco
  try {
    const c = contexto(fd)
    fila = {
      id: crypto.randomUUID(),
      fecha: fecha(fd, 'fecha', 'El día'),
      inicio_min: Math.round(hora(fd, 'hora', 'La hora') * 60),
      compania: c.compania,
      lugar: c.lugar,
      minutos: c.minutosDisponibles,
    }
    validarHuecoNuevo(datos, fila, hoy)
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    const hecho = await insertarHueco(sql, fila, lunesDe(fila.fecha), { semana: MAX_HUECOS_SEMANA, dia: MAX_HUECOS_DIA })
    if (!hecho) return { error: 'Ese hueco ya no cabe: vuelve a cargar la página.' }
  } catch (e) {
    return { error: `No se ha podido guardar el hueco: ${mensajeDe(e)}` }
  }
  revalidatePath('/semana')
  revalidatePath('/')
  return { ok: 'Hueco añadido.' }
}

// Borrar un hueco no borra la sesión que haya en él.
export async function borrarHueco(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const { sql } = await requerirDatos()
  try {
    await borrarHuecoBd(sql, texto(fd, 'hueco_id', 'El hueco'))
  } catch (e) {
    return { error: `No se ha podido borrar el hueco: ${mensajeDe(e)}` }
  }
  revalidatePath('/semana')
  revalidatePath('/')
  return { ok: 'Hueco borrado.' }
}
