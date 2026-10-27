'use client'

import { useActionState } from 'react'
import type { EstadoAccion } from '@/lib/estado'
import { fechaLarga } from '@/lib/fecha'
import { borrarEvaluacion } from './acciones'

// Borrar un test cambia las cargas y puede cambiar el reparto del ciclo 2: se pide confirmación.
export function BotonBorrarEvaluacion({ id, fecha }: { id: string; fecha: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(borrarEvaluacion, null)
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!confirm(`¿Borrar el test del ${fechaLarga(fecha)}? Las cargas se recalculan sin él.`)) e.preventDefault()
      }}
      className="text-right"
    >
      <input type="hidden" name="id" value={id} />
      <button className="text-red-700" disabled={pendiente}>{pendiente ? 'Borrando…' : 'Borrar'}</button>
      {estado?.error && <p role="alert" className="mt-1 text-sm text-red-700">{estado.error}</p>}
    </form>
  )
}
