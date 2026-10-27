'use client'

import type { Zona } from '@/motor'
import { NOMBRE_ZONA } from '@/lib/nombres'
import { alta } from './acciones'

export function BotonAlta({ zona }: { zona: Zona }) {
  return (
    <form
      action={alta}
      onSubmit={(e) => {
        if (!confirm(`¿Confirmas que el fisioterapeuta te ha dado el alta de ${NOMBRE_ZONA[zona].toLowerCase()}?`)) e.preventDefault()
      }}
    >
      <input type="hidden" name="zona" value={zona} />
      <button className="rounded border border-red-300 bg-white px-3 py-1 text-sm">Me ha dado el alta el fisio ({NOMBRE_ZONA[zona]})</button>
    </form>
  )
}
