import { neon } from '@neondatabase/serverless'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NOMBRE_COOKIE, sesionValida } from './acceso'
import { variable } from './entorno'

export type Sql = ReturnType<typeof neon<false, false>>

// Toda lectura o escritura pasa por aquí: vuelve a comprobar la cookie aunque proxy.ts ya lo haya hecho.
export async function bd(): Promise<Sql> {
  const valor = (await cookies()).get(NOMBRE_COOKIE)?.value
  if (!(await sesionValida(valor, variable('SECRETO_SESION'), Date.now() / 1000))) redirect('/entrar')
  return neon(variable('DATABASE_URL'))
}
