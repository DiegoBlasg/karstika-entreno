import type { Explicacion } from '@/motor'

export function PorQue({ explicaciones, titulo = '¿Por qué?' }: { explicaciones: Explicacion[]; titulo?: string }) {
  if (explicaciones.length === 0) return null
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-sky-800">{titulo}</summary>
      <ul className="mt-2 space-y-2">
        {explicaciones.map((x, i) => (
          <li key={`${x.regla}-${i}`}>
            <p>{x.motivo}</p>
            {x.parametros.length > 0 && (
              <p className="text-xs text-stone-500">
                {x.parametros.join(', ')} · evidencia: {x.nivelMinimo}
                {x.origen === 'diseno' ? ' · incluye decisiones de diseño' : ''}
              </p>
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}
