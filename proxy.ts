import { NextResponse, type NextRequest } from 'next/server'
import { NOMBRE_COOKIE, sesionValida } from '@/lib/servidor/acceso'

// Sin sesión válida, todo va a /entrar; con sesión, /entrar va a Hoy. Las Server Actions se invocan en la ruta de su
// página, así que también pasan por aquí (y además cada acceso a datos vuelve a comprobar la sesión).
export async function proxy(request: NextRequest) {
  const secreto = process.env.SECRETO_SESION
  if (!secreto) return new NextResponse('Falta SECRETO_SESION', { status: 500 })
  const valida = await sesionValida(request.cookies.get(NOMBRE_COOKIE)?.value, secreto, Date.now() / 1000)
  const enEntrar = request.nextUrl.pathname === '/entrar'
  if (!valida && !enEntrar) return NextResponse.redirect(new URL('/entrar', request.url))
  if (valida && enEntrar) return NextResponse.redirect(new URL('/', request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
