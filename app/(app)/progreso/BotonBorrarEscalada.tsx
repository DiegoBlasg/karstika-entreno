'use client'

import { useActionState } from 'react'
import type { EstadoAccion } from '@/lib/estado'
import { borrarEscalada } from './acciones'

export function BotonBorrarEscalada({ id, texto }: { id: string; texto: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(borrarEscalada, null)
  return (
    <form action={accion} onSubmit={(e) => { if (!confirm(`¿Borrar ${texto}?`)) e.preventDefault() }} className="text-right">
      <input type="hidden" name="id" value={id} />
      <button className="inline-flex min-h-11 items-center text-rojo" disabled={pendiente}>{pendiente ? 'Borrando…' : 'Borrar'}</button>
      {estado?.error && <p role="alert" className="mt-1 text-sm text-rojo">{estado.error}</p>}
    </form>
  )
}
