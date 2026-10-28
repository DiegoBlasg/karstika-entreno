'use client'

import { useState } from 'react'
import type { Intento } from '@/lib/cronometro/test'

const fmt = (n: number): string => String(n).replace('.', ',')

// Lo apuntado en un intento de fuerza máxima. El signo se elige con «Lastre / Descarga»: en iPhone el teclado decimal
// no tiene signo menos. Se monta uno por intento (key = n), así que el texto y el signo locales empiezan de cero.
// Escribir los kilos o cambiar el signo no decide nada: el intento solo cuenta tras pulsar «Sí» (y no tras «No»).
export function FormularioIntento({ n, de, valor, alCambiar }: {
  n: number; de: number; valor: Intento | null; alCambiar: (i: Intento) => void
}) {
  // El signo va aparte del número: con 0 kg «Descarga» no se distinguiría de «Lastre» por el signo.
  const [descarga, setDescarga] = useState(() => (valor?.lastreKg ?? 0) < 0)
  const [texto, setTexto] = useState(() => (valor ? fmt(Math.abs(valor.lastreKg)) : ''))
  const kg = Math.abs(valor?.lastreKg ?? 0)
  const poner = (cambios: Partial<{ kg: number; descarga: boolean; completado: boolean }>): void => {
    const d = cambios.descarga ?? descarga
    // Los mismos topes que la evaluación (−100 a 150 kg): fuera de ellos no se podría recuperar al recargar.
    const tope = d ? 100 : 150
    const pedido = cambios.kg ?? kg
    const k = Math.min(pedido, tope)
    if (k < pedido) setTexto(fmt(k))
    alCambiar({ lastreKg: d && k > 0 ? -k : k, completado: cambios.completado ?? valor?.completado ?? null })
  }
  return (
    <fieldset className="space-y-2 rounded border border-stone-200 bg-white p-3">
      <legend className="font-medium">Intento {n} de {de}</legend>
      <div className="flex gap-4 text-sm">
        <label className="inline-flex items-center gap-1">
          <input type="radio" name={`signo-${n}`} checked={!descarga} onChange={() => { setDescarga(false); poner({ descarga: false }) }} /> Lastre
        </label>
        <label className="inline-flex items-center gap-1">
          <input type="radio" name={`signo-${n}`} checked={descarga} onChange={() => { setDescarga(true); poner({ descarga: true }) }} /> Descarga
        </label>
      </div>
      <label className="block text-sm">
        Kilos
        <input
          type="text" inputMode="decimal" value={texto}
          onChange={(e) => {
            const t = e.target.value
            setTexto(t)
            const v = t.trim() === '' ? 0 : Number(t.replace(',', '.'))
            if (Number.isFinite(v) && v >= 0) poner({ kg: v })
          }}
          className="mt-1 block w-full rounded border border-stone-300 px-3 py-2"
        />
      </label>
      <p className="text-sm">¿Aguantaste los 10 s?</p>
      <div className="flex gap-3">
        <button type="button" aria-pressed={valor?.completado === true} onClick={() => poner({ completado: true })}
          className={`rounded px-4 py-2 ${valor?.completado === true ? 'bg-emerald-700 text-white' : 'border border-stone-300'}`}>Sí</button>
        <button type="button" aria-pressed={valor?.completado === false} onClick={() => poner({ completado: false })}
          className={`rounded px-4 py-2 ${valor?.completado === false ? 'bg-red-700 text-white' : 'border border-stone-300'}`}>No</button>
      </div>
    </fieldset>
  )
}
