import type { ComponentType } from 'react'
import type { Logro } from '@/lib/datos/progreso'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { IconoChapa, IconoCima, IconoCuerda, IconoPresa, IconoReunion } from '@/components/iconos/Escalada'
import { fechaCorta } from './formato'

type Icono = ComponentType<{ size?: number; className?: string }>

function iconoDe(id: string): Icono {
  if (id === 'cima') return IconoCima
  if (id === 'record-fuerza') return IconoReunion
  if (id === 'primer-encadene') return IconoPresa
  if (id.startsWith('largo-')) return IconoCuerda
  return IconoChapa // primera semana y 4 seguidas
}

// Insignia hexagonal: rellena y con borde en color si se consiguió; si no, solo el contorno, apagada.
function Insignia({ logro }: { logro: Logro }) {
  const Icono = iconoDe(logro.id)
  const color = logro.id === 'cima' ? 'text-cima' : 'text-progreso'
  return (
    <span aria-hidden="true" className={`relative flex size-14 items-center justify-center ${logro.conseguido ? color : 'text-texto-2 opacity-40'}`}>
      <svg viewBox="0 0 56 56" className="absolute inset-0 size-full">
        <polygon
          points="28,3 50,15.5 50,40.5 28,53 6,40.5 6,15.5"
          fill="currentColor"
          fillOpacity={logro.conseguido ? 0.12 : 0}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </svg>
      <Icono size={24} className="relative" />
    </span>
  )
}

export function Logros({ lista }: { lista: Logro[] }) {
  const conseguidos = lista.filter((l) => l.conseguido).length
  return (
    <Tarjeta aria-label="Logros">
      <Etiqueta as="h2">{`Logros · ${conseguidos} de ${lista.length}`}</Etiqueta>
      <ul className="grid grid-cols-3 gap-x-2 gap-y-4">
        {lista.map((l) => (
          <li key={l.id} title={l.descripcion} className="flex flex-col items-center gap-1.5 text-center">
            <Insignia logro={l} />
            <span className={`text-xs font-medium leading-tight ${l.conseguido ? 'text-texto' : 'text-texto-2'}`}>{l.titulo}</span>
            <span className="text-xs text-texto-2">
              {l.conseguido && l.fecha ? fechaCorta(l.fecha) : 'Pendiente'}
            </span>
          </li>
        ))}
      </ul>
    </Tarjeta>
  )
}
