'use client'

import Link from 'next/link'
import { ChevronDown, Play } from 'lucide-react'
import { useActionState, useState } from 'react'
import { MOTIVO_DESCANSO, TIPOS_SESION, type Sesion, type TipoSesion } from '@/motor'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { ContextoTemporada } from '@/components/ContextoTemporada'
import { BOTON, BOTON_SECUNDARIO, CAMPO, TARJETA, TARJETA_DESTACADA } from '@/components/estilos'
import { PlanSesion } from '@/components/PlanSesion'
import type { FilaEscalada, FilaRegistro, FilaSesion } from '@/lib/datos/filas'
import { corregible, type Tarjeta } from '@/lib/datos/hoy'
import type { PosicionTemporada } from '@/lib/datos/temporada'
import type { EstadoAccion } from '@/lib/estado'
import { fechaLarga, hhmmDeMinutos } from '@/lib/fecha'
import {
  AGARRES, NOMBRE_AGARRE, NOMBRE_TIPO, NOMBRE_ZONA, TIPOS_CON_REGLETA,
} from '@/lib/nombres'
import { OtraOpcion } from '@/components/OtraOpcion'
import { franja } from '@/lib/datos/agenda'
import { FormularioRegistro } from './FormularioRegistro'
import { borrarRegistrada, noLaHice, otraCosa } from './acciones'

// Hora decimal a HH:MM con dos dígitos (redondeando a minutos enteros, para que 9,9999 no dé «09:60»).
const hhmm = (h: number): string => hhmmDeMinutos(Math.round(h * 60))

const TEXTO_FRANJA = { manana: 'Mañana', tarde: 'Tarde' } as const

const TOQUE = 'inline-flex min-h-11 items-center'

// Borra la sesión: «No la hice» (hoy y pasadas) o «Quitar» / «Quitarla» (futuras y las que ya no encajan).
export function BotonNoLaHice({ id, etiqueta = 'No la hice', confirmacion = '¿Borrar esta sesión?', clase = 'text-rojo' }: {
  id: string
  etiqueta?: string
  confirmacion?: string
  clase?: string
}) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(noLaHice, null)
  return (
    <form action={accion} onSubmit={(e) => { if (!confirm(confirmacion)) e.preventDefault() }}>
      <input type="hidden" name="sesion_id" value={id} />
      <button className={`${TOQUE} ${clase}`} disabled={pendiente}>{etiqueta}</button>
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
        <label className="block min-w-0 flex-1">Hora de inicio<input type="time" name="hora" defaultValue={hhmm(sesion.horaInicio)} required className={CAMPO} /></label>
        <label className="block min-w-0 flex-1">Minutos<input type="number" name="minutos" min={1} max={1440} defaultValue={sesion.duracionMin} required className={CAMPO} /></label>
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

// Borra una sesión registrada de los últimos 7 días con todo lo apuntado.
function BotonBorrar({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(borrarRegistrada, null)
  return (
    <form action={accion} onSubmit={(e) => { if (!confirm('¿Borrar esta sesión? Se borra con lo que apuntaste.')) e.preventDefault() }}>
      <input type="hidden" name="sesion_id" value={id} />
      <button className={`${TOQUE} text-sm text-rojo underline`} disabled={pendiente}>Borrar</button>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
    </form>
  )
}

export function Registrada({ tarjeta, hoy, escaladas }: { tarjeta: Tarjeta & { registro: FilaRegistro }; hoy: string; escaladas?: readonly FilaEscalada[] }) {
  const { fila, registro } = tarjeta
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
          <div className="flex gap-4">
            <button type="button" onClick={() => setCorrigiendo(!corrigiendo)} className={`${TOQUE} text-sm underline`}>
              {corrigiendo ? 'Cancelar' : 'Corregir'}
            </button>
            {!corrigiendo && <BotonBorrar id={fila.id} />}
          </div>
        )}
      </div>
      {corrigiendo && <FormularioRegistro sesion={fila.sesion} previo={{ registro }} alTerminar={cerrar} escaladas={escaladas} hoy={hoy} />}
    </>
  )
}

// `posicion`: dónde cae el día de la sesión en la temporada (se calcula en el servidor); solo se muestra si hay plan.
export function TarjetaSesion({ tarjeta, hoy, posicion, destacada, escaladas }: {
  tarjeta: Tarjeta; hoy: string; posicion?: PosicionTemporada | null; destacada?: boolean; escaladas?: readonly FilaEscalada[]
}) {
  const { fila, registro } = tarjeta
  const s = fila.sesion
  const pasada = fila.fecha <= hoy
  const [cambiando, setCambiando] = useState(false)
  const [terminando, setTerminando] = useState(false)
  const cerrarRegistro = (): void => setTerminando(false)
  const hayCronometro = fila.fecha === hoy && fila.propuesta !== null
  return (
    <article className={destacada ? TARJETA_DESTACADA : TARJETA}>
      <p className="text-sm text-texto-2">{fila.fecha !== hoy ? `${fechaLarga(fila.fecha)} · ` : ''}{TEXTO_FRANJA[franja(s.horaInicio)]}</p>
      {tarjeta.noEncaja.length > 0 && (
        <div className="space-y-1 rounded border border-ambar/40 bg-ambar/10 p-3 text-sm">
          <p className="font-medium">Con cómo llegas hoy, el entrenador ya no te propondría esta sesión:</p>
          <ul className="list-disc pl-5">{tarjeta.noEncaja.map((m) => <li key={m}>{m}</li>)}</ul>
          {tarjeta.noEncaja.includes(MOTIVO_DESCANSO) || !fila.propuesta?.contexto
            ? <BotonNoLaHice id={s.id} etiqueta="Quitarla" confirmacion="¿Quitar esta sesión?" clase="underline" />
            : <OtraOpcion id={s.id} />}
        </div>
      )}
      {fila.propuesta && registro ? (
        // Ya registrada: de un vistazo el nombre, lo hecho y «Corregir»; el plan, plegado.
        <h3 className="font-semibold">
          {NOMBRE_TIPO[s.tipo]} · {s.duracionMin} min{s.intensidad === 'alta' ? ' · intensa' : ''}
        </h3>
      ) : fila.propuesta ? (
        <>
          {posicion && <ContextoTemporada posicion={posicion} />}
          <PlanSesion plan={fila.propuesta} />
        </>
      ) : (
        <h3 className="font-semibold">{NOMBRE_TIPO[s.tipo]} · {s.duracionMin} min (lo que hiciste)</h3>
      )}
      {(s.tipo === 'evaluacion-dedos' || s.tipo === 'test-casa') && !(fila.propuesta && registro) && (
        <p className="text-sm">Al terminar el test, apunta el resultado en <Link href="/progreso" className="underline">Progreso</Link>.</p>
      )}
      {registro ? (
        <>
          <Registrada tarjeta={{ ...tarjeta, registro }} hoy={hoy} escaladas={escaladas} />
          {fila.propuesta && (
            <details className="group border-t border-borde pt-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm text-texto-2 [&::-webkit-details-marker]:hidden">
                <ChevronDown size={16} aria-hidden className="transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                Ver el plan
              </summary>
              <div className="space-y-3 pt-2">
                {posicion && <ContextoTemporada posicion={posicion} />}
                <PlanSesion plan={fila.propuesta} />
                {(s.tipo === 'evaluacion-dedos' || s.tipo === 'test-casa') && (
                  <p className="text-sm">Al terminar el test, apunta el resultado en <Link href="/progreso" className="underline">Progreso</Link>.</p>
                )}
              </div>
            </details>
          )}
        </>
      ) : (
        <>
          {hayCronometro && (
            <Link href={`/sesion/${fila.id}`} className={`${destacada ? BOTON : BOTON_SECUNDARIO} w-full`}>
              <Play size={18} aria-hidden /> Empezar sesión
            </Link>
          )}
          {pasada && !cambiando && !terminando && (
            <button type="button" onClick={() => setTerminando(true)} className={hayCronometro ? BOTON_SECUNDARIO : BOTON}>Terminar</button>
          )}
          {pasada && !cambiando && terminando && (
            <>
              {/* Sin alTerminar: registrar redirige a la chapa, así que nunca devuelve ok (solo corregir lo usa). */}
              <FormularioRegistro sesion={s} iniciales={tarjeta.molestiasChequeo} escaladas={escaladas} hoy={hoy} />
              <button type="button" onClick={cerrarRegistro} className={`${TOQUE} text-sm underline`}>Cancelar</button>
            </>
          )}
          <div className="flex flex-wrap items-start gap-x-4 text-sm">
            {fila.fecha >= hoy && fila.propuesta?.contexto && tarjeta.noEncaja.length === 0 && <OtraOpcion id={s.id} />}
            {pasada
              ? <BotonNoLaHice id={s.id} />
              : <BotonNoLaHice id={s.id} etiqueta="Quitar" confirmacion="¿Quitar esta sesión?" />}
            {pasada && (
              <button type="button" onClick={() => setCambiando(!cambiando)} className={`${TOQUE} underline`}>
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
