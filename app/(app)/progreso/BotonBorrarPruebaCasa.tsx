'use client'

import { useActionState } from 'react'
import type { EstadoAccion } from '@/lib/estado'
import { fechaLarga } from '@/lib/fecha'
import { borrarPruebaCasa } from './acciones'

export function BotonBorrarPruebaCasa({ id, fecha }: { id: string; fecha: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(borrarPruebaCasa, null)
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!confirm(`¿Borrar el test en casa del ${fechaLarga(fecha)}?`)) e.preventDefault()
      }}
      className="text-right"
    >
      <input type="hidden" name="id" value={id} />
      <button className="inline-flex min-h-11 items-center text-rojo" disabled={pendiente}>{pendiente ? 'Borrando…' : 'Borrar'}</button>
      {estado?.error && <p role="alert" className="mt-1 text-sm text-rojo">{estado.error}</p>}
    </form>
  )
}
