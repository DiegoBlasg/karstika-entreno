import Link from 'next/link'
import type { ReactNode } from 'react'
import { salir } from './acciones'

export default function LayoutApp({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 pb-16">
      <nav className="flex flex-wrap items-center gap-4 border-b border-stone-200 py-3 text-sm">
        <Link href="/" className="font-semibold">Hoy</Link>
        <Link href="/entrenar">Entrenar</Link>
        <Link href="/evaluacion">Evaluación</Link>
        <Link href="/perfil">Perfil</Link>
        <form action={salir} className="ml-auto">
          <button className="text-stone-500">Salir</button>
        </form>
      </nav>
      <main className="pt-4">{children}</main>
    </div>
  )
}
