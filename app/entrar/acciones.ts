'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { EstadoAccion } from '@/lib/estado'
import { claveCorrecta, DURACION_SESION_S, firmarSesion, NOMBRE_COOKIE } from '@/lib/servidor/acceso'
import { variable } from '@/lib/servidor/entorno'
import { crearLimitador } from '@/lib/servidor/limite'

const limitador = crearLimitador()

export async function entrar(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const ahora = Date.now()
  if (limitador.bloqueado(ip, ahora)) return { error: 'Demasiados intentos fallidos. Espera un minuto.' }
  const recibida = fd.get('clave')
  if (typeof recibida !== 'string' || !(await claveCorrecta(recibida, variable('CLAVE_ACCESO')))) {
    limitador.fallo(ip, ahora)
    return { error: 'Contraseña incorrecta.' }
  }
  limitador.exito(ip)
  ;(await cookies()).set(NOMBRE_COOKIE, await firmarSesion(variable('SECRETO_SESION'), ahora / 1000), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURACION_SESION_S,
  })
  redirect('/')
}
