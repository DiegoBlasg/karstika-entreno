'use client'

import { useActionState, useRef } from 'react'
import { generar, type EstadoGenerar } from '@/app/(app)/_generar/acciones'
import { CamposChequeo } from '@/components/CamposChequeo'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, BOTON_SECUNDARIO, CAMPO } from '@/components/estilos'
import { PorQue } from '@/components/PorQue'
import { Hoja } from '@/components/ui/Hoja'
import { Opciones } from '@/components/ui/Opciones'
import type { Franja, InicialGenerar } from '@/lib/datos/agenda'
import { MINUTOS_DISPONIBLES, type ChequeoInicial } from '@/lib/formulario'

const TEXTO_FRANJA: Record<Franja, string> = { manana: 'Mañana', tarde: 'Tarde' }
const SIN_ALTERNATIVA = {
  rojo: 'Con una zona en rojo, hoy toca descansar del todo.',
  minutos: 'Con al menos 20 minutos puedes hacer Core y movilidad.',
} as const

// «Generar entreno» de un día: 4 preguntas y la sesión queda aceptada. Si toca descansar, lo dice y ofrece las
// alternativas suaves (primero «Core y movilidad», P-72). Hoy sin chequeo guardado, también pide el chequeo (P-65).
// `compacto`: un enlace «+ Otra sesión» en los días que ya tienen algo. `libres`: las franjas sin sesión ese día.
export function GenerarEntreno({ fecha, titulo, inicial, libres, pedirChequeo, chequeoInicial, principal = false, compacto = false }: {
  fecha: string
  titulo: string            // «jueves 6» u «hoy»
  inicial: InicialGenerar
  libres: readonly Franja[]
  pedirChequeo: boolean
  chequeoInicial?: ChequeoInicial
  principal?: boolean
  compacto?: boolean
}) {
  const [estado, accion, pendiente] = useActionState<EstadoGenerar, FormData>(generar, null)
  const form = useRef<HTMLFormElement>(null)
  // enviarSinVaciar no lleva el botón pulsado: cada botón deja aquí el tipo que pide (vacío = lo que proponga el motor).
  const tipo = useRef<HTMLInputElement>(null)
  const pedir = (t: string): void => { if (tipo.current) tipo.current.value = t }
  const descanso = estado !== null && 'descanso' in estado ? estado.descanso : null
  return (
    <div>
      <Hoja
        disparador={compacto ? '+ Otra sesión' : 'Generar entreno'}
        titulo={`Generar entreno · ${titulo}`}
        claseDisparador={compacto ? 'inline-flex min-h-11 items-center text-sm text-progreso underline' : `${principal ? BOTON : BOTON_SECUNDARIO} w-full`}
        cerrar={estado !== null && 'ok' in estado ? estado : null}
      >
        <form ref={form} onSubmit={enviarSinVaciar(accion)} className="space-y-4">
          <input type="hidden" name="fecha" value={fecha} />
          <input ref={tipo} type="hidden" name="tipo" defaultValue="" />
          <Opciones nombre="compania" leyenda="¿Con quién?" requerido valor={inicial.compania} columnas={2}
            opciones={[{ valor: 'solo', texto: 'Solo' }, { valor: 'con-gente', texto: 'Con gente' }]} />
          <Opciones nombre="lugar" leyenda="¿Dónde?" requerido valor={inicial.lugar}
            opciones={[{ valor: 'rocodromo', texto: 'Rocódromo' }, { valor: 'roca', texto: 'Roca' }, { valor: 'casa', texto: 'Casa' }]} />
          <Opciones nombre="franja" leyenda="¿Cuándo?" requerido valor={inicial.franja} columnas={2}
            opciones={libres.map((f) => ({ valor: f, texto: TEXTO_FRANJA[f] }))} />
          <label className="block">
            Minutos disponibles
            <input type="number" name="minutos" inputMode="numeric" min={MINUTOS_DISPONIBLES.min} max={MINUTOS_DISPONIBLES.max} step={1}
              defaultValue={inicial.minutos} required className={CAMPO} />
          </label>
          {pedirChequeo && (
            <fieldset className="space-y-3">
              <legend className="font-medium">¿Cómo llegas hoy?</legend>
              <CamposChequeo {...(chequeoInicial ? { inicial: chequeoInicial } : {})} />
            </fieldset>
          )}
          {/* «Generar» va primero en el formulario: Enter en un campo nunca elige una alternativa sin querer. */}
          {descanso?.sinAlternativa !== 'rojo' && (
            <button onClick={() => pedir('')} className={`${descanso ? BOTON_SECUNDARIO : BOTON} w-full`} disabled={pendiente}>
              {pendiente ? 'Generando…' : descanso ? 'Volver a generar' : 'Generar'}
            </button>
          )}
          {descanso && (
            <div className="space-y-3 rounded-2xl border border-borde bg-superficie-2 p-4">
              <h3 className="font-titular text-xl font-bold uppercase">Toca descansar</h3>
              <p className="text-sm">{descanso.motivo.motivo}</p>
              <PorQue explicaciones={[descanso.motivo]} />
              {descanso.sinAlternativa && <p className="text-sm">{SIN_ALTERNATIVA[descanso.sinAlternativa]}</p>}
              {descanso.alternativas.length > 0 && <p className="text-sm text-texto-2">Si quieres moverte:</p>}
              {descanso.alternativas.map((a, i) => (
                <button
                  key={a.tipo}
                  type="button"
                  onClick={() => { pedir(a.tipo); form.current?.requestSubmit() }}
                  disabled={pendiente}
                  className={`${i === 0 ? BOTON : BOTON_SECUNDARIO} w-full`}
                >
                  Generar {a.nombre} · {a.minutos} min
                </button>
              ))}
            </div>
          )}
          {estado !== null && 'error' in estado && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
        </form>
      </Hoja>
      {estado !== null && 'ok' in estado && <p role="status" className="text-sm text-progreso">{estado.ok}</p>}
    </div>
  )
}
