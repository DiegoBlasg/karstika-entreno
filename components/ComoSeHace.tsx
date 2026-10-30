import Link from 'next/link'
import { fichaDe } from '@/lib/biblioteca/fichas'

// Enlaces «Cómo se hace» a la biblioteca. Un id que no existe (p. ej. en una propuesta guardada antigua) no se muestra.
// Con `conTitulo`, cada enlace lleva el nombre del ejercicio (para un bloque con varios).
export function ComoSeHace({ ids, conTitulo = false, className = '' }: { ids: readonly (string | undefined)[]; conTitulo?: boolean; className?: string }) {
  const fichas = [...new Set(ids)].map(fichaDe).filter((f) => f !== undefined)
  if (fichas.length === 0) return null
  return (
    <span className={`flex flex-wrap gap-x-3 ${className}`}>
      {fichas.map((f) => (
        <Link key={f.id} href={`/biblioteca/${f.id}`} className="underline">
          {conTitulo ? `Cómo se hace: ${f.titulo}` : 'Cómo se hace'}
        </Link>
      ))}
    </span>
  )
}
