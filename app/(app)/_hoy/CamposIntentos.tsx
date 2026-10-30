'use client'

import { useState } from 'react'
import type { FilaIntento } from '@/lib/datos/filas'
import { MAX_INTENTOS } from '@/lib/formulario'
import { MOTIVOS_CAIDA, NOMBRE_MOTIVO } from '@/lib/nombres'

// Los intentos al límite: una fila por intento (`intento_<n>`), con «+ intento» para añadir otra. Con `previos`, precargados.
export function CamposIntentos({ previos }: { previos?: readonly FilaIntento[] }) {
  const [filas, setFilas] = useState(previos?.length ?? 0)
  const previo = (i: number): string => {
    const p = previos?.[i]
    return p === undefined ? '' : p.encadenado ? 'encadenado' : (p.motivo_caida ?? '')
  }
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">Intentos al límite</legend>
      {Array.from({ length: filas }, (_, i) => (
        <label key={i} className="flex items-center gap-3 text-sm">
          <span className="w-20">Intento {i + 1}</span>
          <select name={`intento_${i}`} defaultValue={previo(i)} className="flex-1 rounded border border-borde px-2 py-1">
            <option value="">—</option>
            <option value="encadenado">Encadenado</option>
            {MOTIVOS_CAIDA.map((m) => <option key={m} value={m}>{NOMBRE_MOTIVO[m]}</option>)}
          </select>
        </label>
      ))}
      <button type="button" onClick={() => setFilas((n) => Math.min(n + 1, MAX_INTENTOS))} disabled={filas >= MAX_INTENTOS} className="text-sm underline disabled:opacity-50">
        + intento
      </button>
    </fieldset>
  )
}
