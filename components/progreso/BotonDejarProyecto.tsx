'use client'

import { useActionState } from 'react'
import type { EstadoAccion } from '@/lib/estado'
import { dejarProyecto } from '@/app/(app)/progreso/acciones'

// Cierra un proyecto sin encadenarlo. Se puede deshacer borrando «lo dejé» en «Últimas escaladas».
export function BotonDejarProyecto({ clave, nombre }: { clave: string; nombre: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(dejarProyecto, null)
  return (
    <form
      action={accion}
      onSubmit={(e) => { if (!confirm(`¿Dejar el proyecto «${nombre}»? Deja de salir como abierto; puedes deshacerlo borrándolo en «Últimas escaladas».`)) e.preventDefault() }}
      className="shrink-0 text-right"
    >
      <input type="hidden" name="clave" value={clave} />
      <button className="inline-flex min-h-11 items-center text-sm text-texto-2 underline" disabled={pendiente} aria-label={`Dejar el proyecto ${nombre}`}>
        {pendiente ? 'Dejando…' : 'Dejarlo'}
      </button>
      {estado?.error && <p role="alert" className="text-xs text-rojo">{estado.error}</p>}
    </form>
  )
}
