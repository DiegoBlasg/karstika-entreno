'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { CamposMolestias } from '@/components/CamposMolestias'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO } from '@/components/estilos'
import { fechaLarga } from '@/lib/fecha'
import { MINUTOS_DISPONIBLES } from '@/lib/formulario'
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

// Se envía sin vaciar los campos (enviarSinVaciar): tras proponer, el formulario conserva lo rellenado, así que volver
// a preparar no sustituye el chequeo de hoy por uno sin molestias.
export function FormularioEntrenar({ hoy, hora, inicioTemporada }: { hoy: string; hora: string; inicioTemporada: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoProponer, FormData>(proponer, null)
  const antesDeTemporada = hoy < inicioTemporada
  const primerDia = antesDeTemporada ? inicioTemporada : hoy
  const [dia, setDia] = useState(primerDia)
  const resultado = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (estado) resultado.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [estado])
  return (
    <div className="space-y-6">
      {antesDeTemporada && (
        <p className="rounded bg-amber-50 p-3 text-sm">
          La temporada empieza el {fechaLarga(inicioTemporada)}. Puedes preparar sesiones desde ese día.
        </p>
      )}
      <form onSubmit={enviarSinVaciar(accion)} className="space-y-4">
        <div className="flex gap-3">
          <label className="block flex-1">Día<input type="date" name="fecha" min={primerDia} value={dia} onChange={(e) => setDia(e.target.value)} required className={CAMPO} /></label>
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
        <label className="block">Minutos disponibles<input type="number" name="minutos" min={MINUTOS_DISPONIBLES.min} max={MINUTOS_DISPONIBLES.max} step={5} defaultValue={90} required className={CAMPO} /></label>
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
      <div ref={resultado} className="scroll-mt-4 space-y-6">
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
    </div>
  )
}
