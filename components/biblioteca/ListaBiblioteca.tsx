'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { Dibujo } from '@/components/dibujos'
import { IconoCima, IconoMultipresa, IconoPresa } from '@/components/iconos/Escalada'
import { ETIQUETA } from '@/components/estilos'
import { FICHAS, GRUPOS, type Grupo } from '@/lib/biblioteca/fichas'

// Sin tildes ni mayúsculas, para que «rotacion» encuentre «Rotación».
const normaliza = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

// Para las fichas sin dibujo.
const ICONO_GRUPO: Record<Grupo['id'], ReactNode> = {
  suspensiones: <IconoMultipresa size={26} />,
  escalada: <IconoPresa size={26} />,
  barra: <IconoMultipresa size={26} />,
  hombro: <IconoCima size={26} />,
  movilidad: <IconoCima size={26} />,
}

// Primer elemento del material: «Multipresa, regleta de 20 mm» → «Multipresa».
const resumen = (material: string): string => material.split(/[,;]/)[0]!.trim()

const CHIP = 'inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progreso'

export function ListaBiblioteca() {
  const [texto, setTexto] = useState('')
  const [grupo, setGrupo] = useState<Grupo['id'] | 'todos'>('todos')
  const q = normaliza(texto)
  const secciones = GRUPOS.filter((g) => grupo === 'todos' || g.id === grupo)
    .map((g) => ({ g, ids: g.fichas.filter((id) => q === '' || normaliza(FICHAS[id].titulo).includes(q)) }))
    .filter((s) => s.ids.length > 0)

  return (
    <div className="space-y-4">
      <input
        type="search" aria-label="Buscar ejercicio" placeholder="Buscar ejercicio" value={texto} onChange={(e) => setTexto(e.target.value)}
        autoComplete="off" enterKeyHint="search"
        className="min-h-11 w-full rounded-xl border border-borde bg-superficie-2 px-3 text-base text-texto placeholder:text-texto-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progreso"
      />
      <div role="group" aria-label="Filtrar por grupo" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {[{ id: 'todos' as const, titulo: 'Todos' }, ...GRUPOS].map((g) => (
          <button
            key={g.id} type="button" aria-pressed={grupo === g.id} onClick={() => setGrupo(g.id)}
            className={`${CHIP} ${grupo === g.id ? 'bg-progreso font-semibold text-fondo' : 'bg-superficie-2 text-texto'}`}
          >
            {g.titulo}
          </button>
        ))}
      </div>
      {secciones.length === 0 ? (
        <p role="status" className="py-6 text-center text-texto-2">Ningún ejercicio con «{texto.trim()}»</p>
      ) : (
        secciones.map(({ g, ids }) => (
          <section key={g.id} className="space-y-1.5">
            <h2 className={ETIQUETA}>{g.titulo} · {ids.length}</h2>
            <ul className="space-y-1.5">
              {ids.map((id) => {
                const f = FICHAS[id]
                return (
                  <li key={id}>
                    <Link
                      href={`/biblioteca/${id}`}
                      className="flex min-h-14 items-center gap-3 rounded-2xl border border-borde bg-superficie p-2 pr-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progreso"
                    >
                      <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fondo text-texto-2">
                        {f.dibujo ? <Dibujo id={f.dibujo} className="p-1 text-texto" /> : ICONO_GRUPO[g.id]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-titular text-base font-bold uppercase leading-tight">{f.titulo}</span>
                        <span className="block truncate text-xs text-texto-2">{resumen(f.material)}</span>
                      </span>
                      <span aria-hidden className="text-xl text-texto-2">›</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
