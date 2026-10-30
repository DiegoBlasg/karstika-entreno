import Link from 'next/link'
import { FICHAS, GRUPOS } from '@/lib/biblioteca/fichas'

export default function PaginaBiblioteca() {
  return (
    <div className="space-y-5 text-sm">
      <h1 className="text-xl font-semibold">Biblioteca de ejercicios</h1>
      <p className="text-stone-600">Cómo se hace cada ejercicio que te propone el entrenador.</p>
      {GRUPOS.map((g) => (
        <section key={g.id} className="space-y-2">
          <h2 className="font-medium">{g.titulo}</h2>
          <ul className="space-y-1">
            {g.fichas.map((id) => (
              <li key={id}>
                <Link href={`/biblioteca/${id}`} className="text-sky-800 underline">{FICHAS[id].titulo}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
