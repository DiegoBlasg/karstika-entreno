'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NOMBRE_COOKIE } from '@/lib/servidor/acceso'

export async function salir(): Promise<void> {
  ;(await cookies()).delete(NOMBRE_COOKIE)
  redirect('/entrar')
}
