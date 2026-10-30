import { NextResponse, type NextRequest } from 'next/server'
import { NOMBRE_COOKIE, sesionValida } from '@/lib/servidor/acceso'

// Sin sesión válida, las páginas van a /entrar; con sesión, /entrar va a Hoy. Esto NO protege las Server Actions por
// sí solo: una acción se puede enviar por POST con su id a cualquier ruta, incluida /entrar, que no exige sesión. La
// protección real es que todo acceso a datos pasa por bd() (lib/servidor/bd.ts), que vuelve a comprobar la cookie.
export async function proxy(request: NextRequest) {
  const secreto = process.env.SECRETO_SESION
  if (!secreto) return new NextResponse('Falta SECRETO_SESION', { status: 500 })
  let valida: boolean
  try {
    valida = await sesionValida(request.cookies.get(NOMBRE_COOKIE)?.value, secreto, Date.now() / 1000)
  } catch {
    return new NextResponse('SECRETO_SESION debe tener al menos 32 caracteres', { status: 500 })
  }
  const enEntrar = request.nextUrl.pathname === '/entrar'
  if (!valida && !enEntrar) return NextResponse.redirect(new URL('/entrar', request.url))
  if (valida && enEntrar) return NextResponse.redirect(new URL('/', request.url))
  return NextResponse.next()
}

export const config = {
  // Fuera del control de acceso: estáticos de Next, favicon, manifest e iconos (el navegador los pide sin cookies).
  // Los ficheros públicos van anclados con $: solo esa ruta exacta queda libre, nunca algo que empiece igual.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest$|icon\\.svg$|apple-icon\\.png$|icono-[a-z0-9-]+\\.png$).*)'],
}
