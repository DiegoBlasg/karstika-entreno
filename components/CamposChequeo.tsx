'use client'

import type { Molestia } from '@/motor'
import { CamposMolestias } from '@/components/CamposMolestias'
import { CAMPO } from '@/components/estilos'

const ESCALAS = [
  { nombre: 'sueno', etiqueta: 'Sueño', bajo: 'muy mal', alto: 'muy bien' },
  { nombre: 'fatiga', etiqueta: 'Fatiga', bajo: 'muy cansado', alto: 'nada cansado' },
  { nombre: 'ganas', etiqueta: 'Ganas', bajo: 'ninguna', alto: 'muchas' },
] as const

// Campos del chequeo del día (sueno, fatiga, ganas y molestias plegables) que leen proponer y guardarChequeoHoy.
export function CamposChequeo({ iniciales }: { iniciales?: readonly Molestia[] }) {
  return (
    <>
      {ESCALAS.map((e) => (
        <label key={e.nombre} className="block">
          {e.etiqueta} <span className="text-xs text-stone-500">(1 = {e.bajo}, 5 = {e.alto})</span>
          <select name={e.nombre} defaultValue="3" className={CAMPO}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      ))}
      <CamposMolestias iniciales={iniciales} plegable />
    </>
  )
}
