'use client'

import { useId, useState } from 'react'
import { ZONAS, type Molestia } from '@/motor'
import { NOMBRE_ZONA } from '@/lib/nombres'
import { Opciones } from '@/components/ui/Opciones'

// Campos dolor_<zona> y alarma_<zona> que lee molestias() de lib/formulario.ts. `iniciales` precarga lo ya apuntado.
// Con `plegable`, primero «¿Alguna molestia?»: con «No» se envían todos los dolor_<zona> a 0 y ninguna alarma, que
// molestias() lee igual que todo a 0.
export function CamposMolestias({ iniciales = [], plegable = false }: { iniciales?: readonly Molestia[]; plegable?: boolean }) {
  const prefijo = useId()
  const [abierto, setAbierto] = useState(iniciales.length > 0)
  const campos = (
    <fieldset className="space-y-2">
      <legend className="font-medium">Molestias (0 = nada, 10 = máximo)</legend>
      {ZONAS.map((z) => {
        const previa = iniciales.find((m) => m.zona === z)
        return (
          <div key={z} className="flex items-center gap-3 text-sm">
            <label htmlFor={`${prefijo}dolor_${z}`} className="w-40">{NOMBRE_ZONA[z]}</label>
            <select id={`${prefijo}dolor_${z}`} name={`dolor_${z}`} defaultValue={String(previa?.dolor ?? 0)} className="rounded border border-borde px-2 py-1">
              {Array.from({ length: 11 }, (_, n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <label className="flex items-center gap-1">
              <input type="checkbox" name={`alarma_${z}`} defaultChecked={previa?.alarma === true} /> alarma
            </label>
          </div>
        )
      })}
      <p className="text-xs text-texto-2">Alarma: chasquido, hinchazón, pérdida de fuerza o de movilidad.</p>
    </fieldset>
  )
  if (!plegable) return campos
  return (
    <div className="space-y-2">
      <Opciones nombre="hay_molestia" leyenda="¿Alguna molestia?" columnas={2} valor={abierto ? 'si' : 'no'} onCambio={(v) => setAbierto(v === 'si')}
        opciones={[{ valor: 'no', texto: 'No' }, { valor: 'si', texto: 'Sí' }]} />
      {abierto ? campos : ZONAS.map((z) => <input key={z} type="hidden" name={`dolor_${z}`} value="0" />)}
    </div>
  )
}
