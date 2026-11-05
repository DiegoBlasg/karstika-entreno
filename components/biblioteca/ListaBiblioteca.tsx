'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { Dibujo } from '@/components/dibujos'
import { IconoCima, IconoCuerda, IconoMultipresa } from '@/components/iconos/Escalada'
import { ETIQUETA } from '@/components/estilos'
import { FICHAS, FICHAS_TEST, GRUPOS, LUGARES_FICHA, NOMBRE_LUGAR_FICHA, usoFicha, type FichaId, type Grupo, type LugarFicha } from '@/lib/biblioteca/fichas'
import { resumenMaterial } from './material'

// Sin tildes ni mayúsculas, para que «rotacion» encuentre «Rotación».
const normaliza = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

// Para las fichas sin miniatura propia.
const ICONO_GRUPO: Record<Grupo['id'], ReactNode> = {
  fuerza: <IconoMultipresa size={26} />,
  resistencia: <IconoCuerda size={26} />,
  potencia: <IconoMultipresa size={26} />,
  tecnica: <IconoCuerda size={26} />,
  cabeza: <IconoCuerda size={26} />,
  hombro: <IconoCima size={26} />,
  movilidad: <IconoCima size={26} />,
  forma: <IconoCima size={26} />,
}

// Miniatura de cada ficha: su dibujo solo si ninguna otra ficha del grupo lo comparte (cinco suspensiones con el mismo
// dibujo no se distinguirían). Si no, la pauta del título («7:3», «10 s») y, si no tiene, el icono del grupo.
type Miniatura = { tipo: 'dibujo' } | { tipo: 'pauta'; texto: string } | { tipo: 'icono' }
const PAUTA = /\d+:\d+|\d+ s\b/
const MINIATURA: Record<string, Miniatura> = Object.fromEntries(
  GRUPOS.flatMap((g) => g.fichas.map((id): [FichaId, Miniatura] => {
    const f = FICHAS[id]
    if (f.dibujo && g.fichas.filter((otra) => FICHAS[otra].dibujo === f.dibujo).length === 1) return [id, { tipo: 'dibujo' }]
    const pauta = PAUTA.exec(f.titulo)?.[0]
    return [id, pauta ? { tipo: 'pauta', texto: pauta } : { tipo: 'icono' }]
  })),
)

const CHIP = 'inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progreso'

export function ListaBiblioteca() {
  const [texto, setTexto] = useState('')
  const [grupo, setGrupo] = useState<Grupo['id'] | 'todos'>('todos')
  const [lugar, setLugar] = useState<LugarFicha | 'todos'>('todos')
  const q = normaliza(texto)
  const secciones = GRUPOS.filter((g) => grupo === 'todos' || g.id === grupo)
    .map((g) => ({
      g,
      ids: g.fichas.filter((id) => (q === '' || normaliza(FICHAS[id].titulo).includes(q)) && (lugar === 'todos' || LUGARES_FICHA[id].includes(lugar))),
    }))
    .filter((s) => s.ids.length > 0)

  return (
    <div className="space-y-4">
      <input
        type="search" aria-label="Buscar ejercicio" placeholder="Buscar ejercicio" value={texto} onChange={(e) => setTexto(e.target.value)}
        autoComplete="off" enterKeyHint="search"
        className="min-h-11 w-full rounded-xl border border-borde bg-superficie-2 px-3 text-base text-texto placeholder:text-texto-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progreso"
      />
      <div role="group" aria-label="Filtrar por cualidad" className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1">
        <span aria-hidden className="w-14 shrink-0 text-xs font-medium uppercase text-texto-2">Qué</span>
        {[{ id: 'todos' as const, titulo: 'Todos' }, ...GRUPOS].map((g) => (
          <button
            key={g.id} type="button" aria-pressed={grupo === g.id} onClick={() => setGrupo(g.id)}
            className={`${CHIP} ${grupo === g.id ? 'bg-progreso font-semibold text-fondo' : 'bg-superficie-2 text-texto'}`}
          >
            {g.titulo}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Filtrar por lugar" className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1">
        <span aria-hidden className="w-14 shrink-0 text-xs font-medium uppercase text-texto-2">Dónde</span>
        {(['todos', 'rocodromo', 'roca', 'casa'] as const).map((l) => (
          <button
            key={l} type="button" aria-pressed={lugar === l} onClick={() => setLugar(l)}
            className={`${CHIP} ${lugar === l ? 'bg-texto font-semibold text-fondo' : 'border border-borde text-texto'}`}
          >
            {l === 'todos' ? 'Todos' : NOMBRE_LUGAR_FICHA[l]}
          </button>
        ))}
      </div>
      {secciones.length === 0 ? (
        <div role="status" className="space-y-2 py-6 text-center text-texto-2">
          <p>
            Ningún ejercicio
            {texto.trim() !== '' && ` con «${texto.trim()}»`}
            {grupo !== 'todos' && ` de ${GRUPOS.find((g) => g.id === grupo)!.titulo.toLowerCase()}`}
            {lugar !== 'todos' && ` en ${NOMBRE_LUGAR_FICHA[lugar].toLowerCase()}`}
          </p>
          <button type="button" onClick={() => { setTexto(''); setGrupo('todos'); setLugar('todos') }} className="inline-flex min-h-11 items-center text-progreso underline">
            Quitar filtros
          </button>
        </div>
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
                        {MINIATURA[id]?.tipo === 'dibujo' && f.dibujo
                          ? <Dibujo id={f.dibujo} prefijo={`lista-${id}`} className="p-1 text-texto" />
                          : MINIATURA[id]?.tipo === 'pauta'
                            ? <span className="font-titular text-base font-extrabold tabular-nums text-texto">{MINIATURA[id].texto}</span>
                            : ICONO_GRUPO[g.id]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-titular text-base font-bold uppercase leading-tight">
                          {f.titulo}
                          {FICHAS_TEST.has(id) && <span className="ml-2 rounded-full bg-cima/15 px-2 py-0.5 align-middle font-sans text-[10px] font-bold text-cima">Test</span>}
                        </span>
                        <span className="block truncate text-xs text-texto-2">
                          {usoFicha(id) === 'consulta' ? 'De consulta · ' : ''}{resumenMaterial(f.material)}
                        </span>
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
