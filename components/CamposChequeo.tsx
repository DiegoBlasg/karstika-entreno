'use client'

import type { Molestia } from '@/motor'
import { CamposMolestias } from '@/components/CamposMolestias'
import type { ChequeoInicial } from '@/lib/formulario'

const ESCALAS = [
  { nombre: 'sueno', etiqueta: 'Sueño', bajo: 'muy mal', alto: 'muy bien' },
  { nombre: 'fatiga', etiqueta: 'Fatiga', bajo: 'muy cansado', alto: 'nada cansado' },
  { nombre: 'ganas', etiqueta: 'Ganas', bajo: 'ninguna', alto: 'muchas' },
] as const

// Campos del chequeo del día (sueno, fatiga, ganas y molestias plegables) que leen proponer y guardarChequeoHoy.
// `inicial` es el chequeo ya guardado: las escalas arrancan con sus valores y, si hay dolor, las molestias en «Sí».
export function CamposChequeo({ iniciales, inicial }: { iniciales?: readonly Molestia[]; inicial?: ChequeoInicial }) {
  return (
    <>
      {ESCALAS.map((e) => (
        <fieldset key={e.nombre} className="space-y-1.5">
          <legend>
            {e.etiqueta} <span className="text-xs text-texto-2">(1 = {e.bajo}, 5 = {e.alto})</span>
          </legend>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="relative block">
                <input
                  type="radio" name={e.nombre} value={n} defaultChecked={n === (inicial?.[e.nombre] ?? 3)}
                  aria-label={`${e.etiqueta} ${n}`} className="peer absolute inset-0 cursor-pointer opacity-0"
                />
                <span className="flex min-h-11 items-center justify-center rounded-xl border border-borde bg-superficie-2 font-titular text-lg font-bold transition-colors peer-checked:border-progreso peer-checked:bg-progreso peer-checked:text-fondo peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-progreso">
                  {n}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <CamposMolestias iniciales={inicial?.molestias ?? iniciales} plegable />
    </>
  )
}
