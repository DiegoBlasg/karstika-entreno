'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { MOTIVO_DESCANSO, TIPOS_SESION, type Sesion, type TipoSesion } from '@/motor'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { ContextoTemporada } from '@/components/ContextoTemporada'
import { BOTON, CAMPO, TARJETA } from '@/components/estilos'
import { PlanSesion } from '@/components/PlanSesion'
import type { FilaRegistro, FilaSesion } from '@/lib/datos/filas'
import { corregible, type Tarjeta } from '@/lib/datos/hoy'
import type { PosicionTemporada } from '@/lib/datos/temporada'
import type { EstadoAccion } from '@/lib/estado'
import { fechaLarga, hhmmDeMinutos } from '@/lib/fecha'
import {
  AGARRES, NOMBRE_AGARRE, NOMBRE_TIPO, NOMBRE_ZONA, TIPOS_CON_REGLETA,
} from '@/lib/nombres'
import { FormularioRegistro } from './FormularioRegistro'
import { noLaHice, otraCosa } from './acciones'

// Hora decimal a HH:MM con dos dígitos (redondeando a minutos enteros, para que 9,9999 no dé «09:60»).
const hhmm = (h: number): string => hhmmDeMinutos(Math.round(h * 60))

// Entrenar con el mismo día, hora y minutos, para cambiar esta sesión por otra (no se borra hasta aceptar la nueva).
const enlaceCambiar = (f: FilaSesion): string =>
  `/entrenar?${new URLSearchParams({ fecha: f.fecha, hora: hhmm(f.sesion.horaInicio), minutos: String(f.sesion.duracionMin), reemplaza: f.id })}`

// Borra la sesión: «No la hice» (hoy y pasadas) o «Quitar» / «Quitarla» (futuras y las que ya no encajan).
function BotonNoLaHice({ id, etiqueta = 'No la hice', confirmacion = '¿Borrar esta sesión?', clase = 'text-rojo' }: {
  id: string
  etiqueta?: string
  confirmacion?: string
  clase?: string
}) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(noLaHice, null)
  return (
    <form action={accion} onSubmit={(e) => { if (!confirm(confirmacion)) e.preventDefault() }}>
      <input type="hidden" name="sesion_id" value={id} />
      <button className={clase} disabled={pendiente}>{etiqueta}</button>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
    </form>
  )
}

// Lo que se hizo de verdad. Se envía sin vaciar los campos: tras los avisos, «Lo hice así de todos modos» guarda lo
// que el usuario ha escrito, no la sesión propuesta.
function FormularioOtraCosa({ sesion }: { sesion: Sesion }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(otraCosa, null)
  const [tipo, setTipo] = useState<TipoSesion>(sesion.tipo === 'descanso' ? 'tecnica' : sesion.tipo)
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="space-y-3 border-t border-borde pt-3">
      <input type="hidden" name="sesion_id" value={sesion.id} />
      <label className="block">
        ¿Qué hiciste?
        <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoSesion)} className={CAMPO}>
          {TIPOS_SESION.filter((t) => t !== 'descanso').map((t) => <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>)}
        </select>
      </label>
      <label className="block">
        Intensidad
        <select name="intensidad" defaultValue={sesion.intensidad} className={CAMPO}>
          <option value="alta">Alta</option>
          <option value="suave">Suave</option>
        </select>
      </label>
      <div className="flex gap-3">
        <label className="block flex-1">Hora de inicio<input type="time" name="hora" defaultValue={hhmm(sesion.horaInicio)} required className={CAMPO} /></label>
        <label className="block flex-1">Minutos<input type="number" name="minutos" min={1} max={1440} defaultValue={sesion.duracionMin} required className={CAMPO} /></label>
      </div>
      {TIPOS_CON_REGLETA.includes(tipo) && (
        <div className="flex gap-3">
          <label className="block flex-1">
            Regleta (mm)
            <input
              type="text" inputMode="decimal" name="regleta_mm"
              defaultValue={sesion.detalle?.regletaMm ?? ''} className={CAMPO}
            />
          </label>
          <label className="block flex-1">
            Agarre
            <select name="agarre" defaultValue={sesion.detalle?.agarre ?? ''} className={CAMPO}>
              <option value="">—</option>
              {AGARRES.map((a) => <option key={a} value={a}>{NOMBRE_AGARRE[a]}</option>)}
            </select>
          </label>
        </div>
      )}
      {estado?.avisos && (
        <div className="space-y-2 rounded border border-ambar/40 bg-ambar/10 p-3 text-sm">
          <ul className="list-disc pl-5">{estado.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
          <label className="flex items-center gap-2"><input type="checkbox" name="confirmar" /> Lo hice así de todos modos</label>
        </div>
      )}
      <button className={BOTON} disabled={pendiente}>Guardar lo que hice</button>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
    </form>
  )
}

function Registrada({ tarjeta, hoy }: { tarjeta: Tarjeta & { registro: FilaRegistro }; hoy: string }) {
  const { fila, registro, intentos } = tarjeta
  const [corrigiendo, setCorrigiendo] = useState(false)
  const cerrar = (): void => setCorrigiendo(false)
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-progreso">
          Hecha · RPE {registro.rpe} · {registro.duracion_min} min
          {registro.molestias.length > 0 ? ` · molestias: ${registro.molestias.map((m) => `${NOMBRE_ZONA[m.zona]} ${m.dolor}`).join(', ')}` : ''}
        </p>
        {corregible(fila.fecha, hoy) && (
          <button type="button" onClick={() => setCorrigiendo(!corrigiendo)} className="text-sm underline">
            {corrigiendo ? 'Cancelar' : 'Corregir'}
          </button>
        )}
      </div>
      {corrigiendo && <FormularioRegistro sesion={fila.sesion} previo={{ registro, intentos }} alTerminar={cerrar} />}
    </>
  )
}

// `posicion`: dónde cae el día de la sesión en la temporada (se calcula en el servidor); solo se muestra si hay plan.
export function TarjetaSesion({ tarjeta, hoy, posicion }: { tarjeta: Tarjeta; hoy: string; posicion?: PosicionTemporada | null }) {
  const { fila, registro } = tarjeta
  const s = fila.sesion
  const pasada = fila.fecha <= hoy
  const [cambiando, setCambiando] = useState(false)
  const [terminando, setTerminando] = useState(false)
  const cerrarRegistro = (): void => setTerminando(false)
  return (
    <article className={TARJETA}>
      {fila.fecha !== hoy && <p className="text-sm text-texto-2">{fechaLarga(fila.fecha)}</p>}
      {tarjeta.noEncaja.length > 0 && (
        <div className="space-y-1 rounded border border-ambar/40 bg-ambar/10 p-3 text-sm">
          <p className="font-medium">Con cómo llegas hoy, el entrenador ya no te propondría esta sesión:</p>
          <ul className="list-disc pl-5">{tarjeta.noEncaja.map((m) => <li key={m}>{m}</li>)}</ul>
          {tarjeta.noEncaja.includes(MOTIVO_DESCANSO)
            ? <BotonNoLaHice id={s.id} etiqueta="Quitarla" confirmacion="¿Quitar esta sesión?" clase="underline" />
            : <Link href={enlaceCambiar(fila)} className="inline-block underline">Cambiarla por otra</Link>}
        </div>
      )}
      {fila.propuesta ? (
        <>
          {posicion && <ContextoTemporada posicion={posicion} />}
          <PlanSesion plan={fila.propuesta} />
        </>
      ) : (
        <h3 className="font-semibold">{NOMBRE_TIPO[s.tipo]} · {s.duracionMin} min (lo que hiciste)</h3>
      )}
      {s.tipo === 'evaluacion-dedos' && (
        <p className="text-sm">Al terminar el test, apunta el resultado en <Link href="/progreso" className="underline">Progreso</Link>.</p>
      )}
      {registro ? (
        <Registrada tarjeta={{ ...tarjeta, registro }} hoy={hoy} />
      ) : (
        <>
          {fila.fecha === hoy && fila.propuesta && (
            <Link href={`/sesion/${fila.id}`} className="inline-block rounded bg-progreso px-3 py-2 text-sm font-medium text-fondo">
              Empezar con cronómetro
            </Link>
          )}
          {pasada && !cambiando && !terminando && (
            <button type="button" onClick={() => setTerminando(true)} className={BOTON}>Terminar</button>
          )}
          {pasada && !cambiando && terminando && (
            <>
              <FormularioRegistro sesion={s} iniciales={tarjeta.molestiasChequeo} alTerminar={cerrarRegistro} />
              <button type="button" onClick={cerrarRegistro} className="text-sm underline">Cancelar</button>
            </>
          )}
          <div className="flex gap-4 text-sm">
            {pasada
              ? <BotonNoLaHice id={s.id} />
              : <BotonNoLaHice id={s.id} etiqueta="Quitar" confirmacion="¿Quitar esta sesión?" />}
            {pasada && (
              <button type="button" onClick={() => setCambiando(!cambiando)} className="underline">
                {cambiando ? 'Cancelar' : 'Hice otra cosa'}
              </button>
            )}
          </div>
          {cambiando && <FormularioOtraCosa sesion={s} />}
        </>
      )}
    </article>
  )
}
