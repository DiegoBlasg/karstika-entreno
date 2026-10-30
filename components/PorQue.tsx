import Link from 'next/link'
import type { Explicacion } from '@/motor'
import { basesDe } from '@/lib/fuentes'

export function PorQue({ explicaciones, titulo = '¿Por qué?' }: { explicaciones: Explicacion[]; titulo?: string }) {
  if (explicaciones.length === 0) return null
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-progreso">{titulo}</summary>
      <ul className="mt-2 space-y-3">
        {explicaciones.map((x, i) => {
          const bases = basesDe([x])
          return (
            <li key={`${x.regla}-${i}`}>
              <p>{x.motivo}</p>
              {bases.length > 0 && (
                <div className="mt-1 text-xs text-texto-2">
                  <p className="font-medium">En qué se basa:</p>
                  <ul className="mt-1 space-y-1">
                    {bases.map((b) => (
                      <li key={b.parametro}>
                        {b.titulo} · {b.nivelTexto}
                        {b.estudios.length > 0 && (
                          <ul className="ml-3 list-disc">
                            {b.estudios.map((e) => (
                              <li key={e.id}>
                                {e.url ? (
                                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-progreso underline">{e.cita}</a>
                                ) : (
                                  e.cita
                                )}
                                {' · '}
                                <Link href={`/fuentes/${e.id}`} className="text-progreso underline">detalle</Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </details>
  )
}
