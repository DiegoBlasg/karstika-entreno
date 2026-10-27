'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { planificarTemporada } from '@/motor'
import type { PerfilNuevo } from '@/lib/datos/filas'
import type { EstadoAccion } from '@/lib/estado'
import { fecha, mensajeDe, numero, texto, textoOpcional } from '@/lib/formulario'
import { bd } from '@/lib/servidor/bd'
import { cargarDatos, guardarPerfilBd } from '@/lib/servidor/consultas'

export async function guardarPerfil(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sql = await bd()
  const previo = await cargarDatos(sql)
  let fila: PerfilNuevo
  try {
    fila = {
      peso_kg: numero(fd, 'peso_kg', 'El peso', 30, 200),
      anos_escalando: numero(fd, 'anos_escalando', 'Los años escalando', 0, 80),
      lesiones: (textoOpcional(fd, 'lesiones') ?? '').split('\n').map((l) => l.trim()).filter((l) => l !== ''),
      grado_actual: texto(fd, 'grado_actual', 'El grado actual'),
      grado_objetivo: texto(fd, 'grado_objetivo', 'El grado objetivo'),
      inicio_temporada: fecha(fd, 'inicio_temporada', 'El inicio de la temporada'),
      objetivo_temporada: fecha(fd, 'objetivo_temporada', 'La fecha objetivo'),
    }
    if (fila.grado_actual.length > 10 || fila.grado_objetivo.length > 10) return { error: 'Los grados tienen como mucho 10 caracteres.' }
    if (!previo && fd.get('aviso') !== 'on') return { error: 'Para empezar tienes que leer y aceptar el aviso.' }
    planificarTemporada(fila.inicio_temporada, fila.objetivo_temporada) // lanza si las fechas no dan una temporada
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await guardarPerfilBd(sql, fila)
  } catch (e) {
    return { error: `No se ha podido guardar el perfil: ${mensajeDe(e)}` }
  }
  revalidatePath('/', 'layout')
  if (!previo) redirect('/evaluacion')
  return { ok: 'Perfil guardado.' }
}
