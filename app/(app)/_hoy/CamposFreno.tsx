'use client'

import { useState, type ReactNode } from 'react'
import type { Freno } from '@/motor'
import { Opciones } from '@/components/ui/Opciones'
import { FRENOS, NOMBRE_FRENO } from '@/lib/nombres'

// Al terminar una sesión al límite: una sola pregunta (P-69) y, aparte, si se encadenó algo. Las dos opcionales: una
// respuesta tocada por error se puede quitar. La casilla va como las Opciones: el input real encima y transparente.
// `encadenes`: los campos de qué se encadenó, que aparecen al marcar la casilla; `textoEncadene`, el de la casilla.
export function CamposFreno({ freno, encadene, encadenes, textoEncadene = 'Hoy encadené algo al límite' }: {
  freno?: Freno | null; encadene?: boolean; encadenes?: ReactNode; textoEncadene?: string
}) {
  const [elegido, setElegido] = useState<string>(freno ?? '')
  const [encadenado, setEncadenado] = useState(encadene ?? false)
  return (
    <div className="space-y-2">
      <Opciones
        nombre="freno"
        leyenda="¿Qué te frenó hoy?"
        columnas={2}
        opciones={FRENOS.map((f) => ({ valor: f, texto: NOMBRE_FRENO[f] }))}
        valor={elegido}
        onCambio={setElegido}
      />
      {elegido !== '' && (
        <button type="button" onClick={() => setElegido('')} className="inline-flex min-h-11 items-center text-sm text-texto-2 underline">
          Quitar respuesta
        </button>
      )}
      <label className="relative block">
        <input
          type="checkbox" name="encadene" checked={encadenado} onChange={(e) => setEncadenado(e.target.checked)}
          className="peer absolute inset-0 cursor-pointer opacity-0"
        />
        <span className="flex min-h-11 items-center justify-center rounded-xl border border-borde bg-superficie-2 px-2 text-center transition-colors peer-checked:border-progreso peer-checked:bg-progreso peer-checked:font-bold peer-checked:text-fondo peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-progreso">
          {encadenado ? '✓ ' : ''}{textoEncadene}
        </span>
      </label>
      {encadenado && encadenes}
    </div>
  )
}
