'use client'

import { useActionState, useState } from 'react'
import { CamposMolestias } from '@/components/CamposMolestias'
import { BOTON, CAMPO } from '@/components/estilos'
import { proponer, type EstadoProponer } from './acciones'
import { ResultadoPropuesta } from './ResultadoPropuesta'

const ESCALAS = [
  { nombre: 'sueno', etiqueta: 'Sueño', bajo: 'muy mal', alto: 'muy bien' },
  { nombre: 'fatiga', etiqueta: 'Fatiga', bajo: 'muy cansado', alto: 'nada cansado' },
  { nombre: 'ganas', etiqueta: 'Ganas', bajo: 'ninguna', alto: 'muchas' },
] as const

function Radio({ nombre, valor, texto, marcado = false }: { nombre: string; valor: string; texto: string; marcado?: boolean }) {
  return (
    <label className="mr-4 inline-flex items-center gap-1">
      <input type="radio" name={nombre} value={valor} defaultChecked={marcado} required /> {texto}
    </label>
  )
}

export function FormularioEntrenar({ hoy, hora }: { hoy: string; hora: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoProponer, FormData>(proponer, null)
  const [dia, setDia] = useState(hoy)
  return (
    <div className="space-y-6">
      <form action={accion} className="space-y-4">
        <div className="flex gap-3">
          <label className="block flex-1">Día<input type="date" name="fecha" min={hoy} value={dia} onChange={(e) => setDia(e.target.value)} required className={CAMPO} /></label>
          <label className="block w-32">Hora<input type="time" name="hora" defaultValue={hora} required className={CAMPO} /></label>
        </div>
        <fieldset>
          <legend className="font-medium">¿Con quién?</legend>
          <Radio nombre="compania" valor="con-gente" texto="Con gente" marcado />
          <Radio nombre="compania" valor="solo" texto="Solo" />
        </fieldset>
        <fieldset>
          <legend className="font-medium">¿Dónde?</legend>
          <Radio nombre="lugar" valor="rocodromo" texto="Rocódromo" marcado />
          <Radio nombre="lugar" valor="roca" texto="Roca" />
          <Radio nombre="lugar" valor="casa" texto="Casa" />
        </fieldset>
        <label className="block">Minutos disponibles<input type="number" name="minutos" min={10} max={600} step={5} defaultValue={90} required className={CAMPO} /></label>
        {dia === hoy && (
          <fieldset className="space-y-3">
            <legend className="font-medium">¿Cómo llegas hoy?</legend>
            {ESCALAS.map((e) => (
              <label key={e.nombre} className="block">
                {e.etiqueta} <span className="text-xs text-stone-500">(1 = {e.bajo}, 5 = {e.alto})</span>
                <select name={e.nombre} defaultValue="3" className={CAMPO}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            ))}
            <CamposMolestias />
          </fieldset>
        )}
        <button className={BOTON} disabled={pendiente}>{pendiente ? 'Preparando…' : 'Preparar sesión'}</button>
      </form>
      {estado && 'error' in estado && (
        <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm">
          <p>{estado.error}</p>
          {estado.detalle && (
            <details>
              <summary className="cursor-pointer">Detalle</summary>
              <p className="mt-1 whitespace-pre-wrap">{estado.detalle}</p>
            </details>
          )}
        </div>
      )}
      {estado && 'prep' in estado && <ResultadoPropuesta entrada={estado.entrada} prep={estado.prep} />}
    </div>
  )
}
