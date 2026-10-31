'use server'

import { revalidatePath } from 'next/cache'
import type { FilaHueco } from '@/lib/datos/filas'
import { MAX_HUECOS_DIA, MAX_HUECOS_SEMANA, validarHuecoNuevo } from '@/lib/datos/huecos'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid, lunesDe } from '@/lib/fecha'
import { contexto, fecha, hora, mensajeDe, texto } from '@/lib/formulario'
import { bd } from '@/lib/servidor/bd'
import { borrarHuecoBd, insertarHueco, requerirDatos } from '@/lib/servidor/consultas'

// Las reglas de lib/datos/huecos.ts hablan de «huecos»; en la interfaz se llaman «ratos para entrenar».
const enRatos = (m: string): string => m.replace(/([Hh])uecos/g, (_, h: string) => `${h === 'H' ? 'R' : 'r'}atos para entrenar`)
  .replace(/([Hh])ueco/g, (_, h: string) => `${h === 'H' ? 'R' : 'r'}ato para entrenar`)

export async function anadirHueco(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const ahora = ahoraMadrid(new Date())
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
    validarHuecoNuevo(datos, fila, { fecha: ahora.fecha, minutos: Math.round(ahora.hora * 60) })
  } catch (e) {
    return { error: enRatos(mensajeDe(e)) }
  }
  try {
    const hecho = await insertarHueco(sql, fila, lunesDe(fila.fecha), { semana: MAX_HUECOS_SEMANA, dia: MAX_HUECOS_DIA })
    if (!hecho) return { error: 'Ese rato para entrenar ya no cabe: vuelve a cargar la página.' }
  } catch (e) {
    return { error: `No se ha podido guardar el rato para entrenar: ${mensajeDe(e)}` }
  }
  revalidatePath('/semana')
  revalidatePath('/')
  return { ok: 'Rato añadido.' }
}

// Borrar un hueco no borra la sesión que haya en él.
export async function borrarHueco(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const ahora = ahoraMadrid(new Date())
  const sql = await bd()
  try {
    const resultado = await borrarHuecoBd(sql, texto(fd, 'hueco_id', 'El rato para entrenar'), { fecha: ahora.fecha, minutos: Math.round(ahora.hora * 60) })
    if (resultado === 'no-existe') return { error: 'Ese rato para entrenar ya no existe.' }
    if (resultado === 'pasado') return { error: 'Ese rato para entrenar ya ha pasado.' }
  } catch (e) {
    return { error: `No se ha podido borrar el rato para entrenar: ${mensajeDe(e)}` }
  }
  revalidatePath('/semana')
  revalidatePath('/')
  return { ok: 'Rato borrado.' }
}
