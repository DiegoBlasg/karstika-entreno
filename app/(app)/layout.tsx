import Link from 'next/link'
import type { ReactNode } from 'react'
import { salir } from './acciones'

export default function LayoutApp({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-[env(safe-area-inset-top)] pb-[max(4rem,env(safe-area-inset-bottom))]">
      <nav className="flex flex-wrap items-center gap-4 border-b border-borde py-3 text-sm">
        <Link href="/" className="font-semibold">Hoy</Link>
        <Link href="/semana">Mi semana</Link>
        <Link href="/plan">Plan</Link>
        <Link href="/entrenar">Entrenar</Link>
        <Link href="/evaluacion">Evaluación</Link>
        <Link href="/biblioteca">Biblioteca</Link>
        <Link href="/perfil">Perfil</Link>
        <form action={salir} className="ml-auto">
          <button className="text-texto-2">Salir</button>
        </form>
      </nav>
      <main className="pt-4">{children}</main>
    </div>
  )
}
