'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { CamposChequeo } from '@/components/CamposChequeo'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO } from '@/components/estilos'
import { Opciones } from '@/components/ui/Opciones'
import { fechaLarga } from '@/lib/fecha'
import { MINUTOS_DISPONIBLES, type ChequeoInicial, type InicialEntrenar } from '@/lib/formulario'
import { proponer, type EstadoProponer } from './acciones'
import { ResultadoPropuesta } from './ResultadoPropuesta'

// Se envía sin vaciar los campos (enviarSinVaciar): tras proponer, el formulario conserva lo rellenado. Y si ya hay
// chequeo de hoy guardado (`chequeoHoy`), los campos arrancan con él, así que preparar no lo pisa con 3/3/3 y sin molestias.
export function FormularioEntrenar({ hoy, hora, inicioTemporada, inicial = {}, chequeoHoy }: { hoy: string; hora: string; inicioTemporada: string; inicial?: InicialEntrenar; chequeoHoy?: ChequeoInicial }) {
  const [estado, accion, pendiente] = useActionState<EstadoProponer, FormData>(proponer, null)
  const antesDeTemporada = hoy < inicioTemporada
  const primerDia = antesDeTemporada ? inicioTemporada : hoy
  const [dia, setDia] = useState(inicial.reemplaza ? hoy : inicial.fecha && inicial.fecha >= primerDia ? inicial.fecha : primerDia)
  const resultado = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (estado) resultado.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [estado])
  return (
    <div className="space-y-6">
      {antesDeTemporada && (
        <p className="rounded bg-ambar/10 p-3 text-sm">
          La temporada empieza el {fechaLarga(inicioTemporada)}. Puedes preparar sesiones desde ese día.
        </p>
      )}
      {inicial.reemplaza && (
        <p className="rounded bg-ambar/10 p-3 text-sm">
          Vas a cambiar la sesión de hoy a las {inicial.hora}: no se borrará hasta que aceptes la nueva.
        </p>
      )}
      <form onSubmit={enviarSinVaciar(accion)} className="space-y-4">
        {inicial.reemplaza && <input type="hidden" name="reemplaza" value={inicial.reemplaza} />}
        <div className="flex gap-3">
          <label className="block flex-1">Día<input type="date" name="fecha" min={primerDia} max={inicial.reemplaza ? hoy : undefined} value={dia} onChange={(e) => setDia(e.target.value)} readOnly={Boolean(inicial.reemplaza)} required className={CAMPO} /></label>
          <label className="block w-32">Hora<input type="time" name="hora" defaultValue={inicial.hora ?? hora} required className={CAMPO} /></label>
        </div>
        <Opciones nombre="compania" leyenda="¿Con quién?" requerido valor={inicial.compania ?? 'con-gente'} columnas={2}
          opciones={[{ valor: 'con-gente', texto: 'Con gente' }, { valor: 'solo', texto: 'Solo' }]} />
        <Opciones nombre="lugar" leyenda="¿Dónde?" requerido valor={inicial.lugar ?? 'rocodromo'}
          opciones={[{ valor: 'rocodromo', texto: 'Rocódromo' }, { valor: 'roca', texto: 'Roca' }, { valor: 'casa', texto: 'Casa' }]} />
        <label className="block">Minutos disponibles<input type="number" name="minutos" min={MINUTOS_DISPONIBLES.min} max={MINUTOS_DISPONIBLES.max} step={1} defaultValue={inicial.minutos ?? 90} required className={CAMPO} /></label>
        {dia === hoy && (
          <fieldset className="space-y-3">
            <legend className="font-medium">¿Cómo llegas hoy?</legend>
            {chequeoHoy && <p className="text-sm text-texto-2">Ya hiciste el chequeo de hoy: cámbialo solo si ha cambiado algo.</p>}
            <CamposChequeo inicial={chequeoHoy} />
          </fieldset>
        )}
        <button className={BOTON} disabled={pendiente}>{pendiente ? 'Preparando…' : 'Preparar sesión'}</button>
      </form>
      <div ref={resultado} className="scroll-mt-4 space-y-6">
        {estado && 'error' in estado && (
          <div role="alert" className="rounded border border-rojo/50 bg-rojo/10 p-3 text-sm">
            <p>{estado.error}</p>
            {estado.detalle && (
              <details>
                <summary className="flex min-h-11 cursor-pointer items-center">Detalle</summary>
                <p className="mt-1 whitespace-pre-wrap">{estado.detalle}</p>
              </details>
            )}
          </div>
        )}
        {estado && 'prep' in estado && <ResultadoPropuesta entrada={estado.entrada} prep={estado.prep} posicion={estado.posicion} reemplaza={estado.reemplaza} />}
      </div>
    </div>
  )
}
