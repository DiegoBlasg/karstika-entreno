'use client'

import { useId } from 'react'
import { ZONAS, type Molestia } from '@/motor'
import { NOMBRE_ZONA } from '@/lib/nombres'

// Campos dolor_<zona> y alarma_<zona> que lee molestias() de lib/formulario.ts. `iniciales` precarga lo ya apuntado.
export function CamposMolestias({ iniciales = [] }: { iniciales?: readonly Molestia[] }) {
  const prefijo = useId()
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">Molestias (0 = nada, 10 = máximo)</legend>
      {ZONAS.map((z) => {
        const previa = iniciales.find((m) => m.zona === z)
        return (
          <div key={z} className="flex items-center gap-3 text-sm">
            <label htmlFor={`${prefijo}dolor_${z}`} className="w-40">{NOMBRE_ZONA[z]}</label>
            <select id={`${prefijo}dolor_${z}`} name={`dolor_${z}`} defaultValue={String(previa?.dolor ?? 0)} className="rounded border border-stone-300 px-2 py-1">
              {Array.from({ length: 11 }, (_, n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <label className="flex items-center gap-1">
              <input type="checkbox" name={`alarma_${z}`} defaultChecked={previa?.alarma === true} /> alarma
            </label>
          </div>
        )
      })}
      <p className="text-xs text-stone-500">Alarma: chasquido, hinchazón, pérdida de fuerza o de movilidad.</p>
    </fieldset>
  )
}
