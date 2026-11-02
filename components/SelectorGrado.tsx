'use client'

import { useState } from 'react'
import { CAMPO } from '@/components/estilos'
import { Opciones } from '@/components/ui/Opciones'
import { ESCALA, type TipoEscalada } from '@/lib/escaladas/grados'
import { ventanaGrados } from '@/lib/escaladas/nivel'

export type ReferenciaGrados = { via: string; bloque: string }
export const REFERENCIA_POR_DEFECTO: ReferenciaGrados = { via: '6b', bloque: '6A' }

// El grado en dos toques: 6 botones alrededor de tu nivel y «Otro grado…» con la escala completa. Un grado ya apuntado
// fuera de esos 6 abre directamente la escala completa.
export function SelectorGrado({ nombre, tipo, referencia = REFERENCIA_POR_DEFECTO, inicial, etiqueta, requerido }: {
  nombre: string; tipo: TipoEscalada; referencia?: ReferenciaGrados; inicial?: string | null; etiqueta: string; requerido?: boolean
}) {
  const ventana = ventanaGrados(tipo, referencia[tipo])
  const valido = inicial && ESCALA[tipo].includes(inicial) ? inicial : ''
  const [lista, setLista] = useState(valido !== '' && !ventana.includes(valido))
  const [valor, setValor] = useState(valido)
  if (lista) {
    return (
      <label className="block">
        {etiqueta}
        <select name={nombre} value={valor} onChange={(e) => setValor(e.target.value)} required={requerido} className={CAMPO}>
          <option value="">—</option>
          {ESCALA[tipo].map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </label>
    )
  }
  return (
    <div className="space-y-1">
      <Opciones nombre={nombre} leyenda={etiqueta} opciones={ventana.map((g) => ({ valor: g, texto: g }))} valor={valor} onCambio={setValor} columnas={3} requerido={requerido} />
      <div className="flex gap-4">
        <button type="button" onClick={() => setLista(true)} className="inline-flex min-h-11 items-center text-sm text-texto-2 underline">Otro grado…</button>
        {!requerido && valor !== '' && (
          <button type="button" onClick={() => setValor('')} className="inline-flex min-h-11 items-center text-sm text-texto-2 underline">Quitar grado</button>
        )}
      </div>
    </div>
  )
}
