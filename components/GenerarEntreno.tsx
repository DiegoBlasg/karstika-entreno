'use client'

import { useActionState, useRef } from 'react'
import { generar, type EstadoGenerar } from '@/app/(app)/_generar/acciones'
import { CamposChequeo } from '@/components/CamposChequeo'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, BOTON_SECUNDARIO, CAMPO } from '@/components/estilos'
import { PorQue } from '@/components/PorQue'
import { Hoja } from '@/components/ui/Hoja'
import { Opciones } from '@/components/ui/Opciones'
import type { InicialGenerar } from '@/lib/datos/agenda'
import { MINUTOS_DISPONIBLES, type ChequeoInicial } from '@/lib/formulario'

// «Generar entreno» de un día: 4 preguntas y la sesión queda aceptada. Si toca descansar, lo dice y ofrece las
// alternativas suaves (primero «Core y movilidad», P-72). Hoy sin chequeo guardado, también pide el chequeo (P-65).
export function GenerarEntreno({ fecha, titulo, inicial, pedirChequeo, chequeoInicial, principal }: {
  fecha: string
  titulo: string            // «jueves 6» u «hoy»
  inicial: InicialGenerar
  pedirChequeo: boolean
  chequeoInicial?: ChequeoInicial
  principal: boolean
}) {
  const [estado, accion, pendiente] = useActionState<EstadoGenerar, FormData>(generar, null)
  // enviarSinVaciar no lleva el botón pulsado: cada botón deja aquí el tipo que pide (vacío = lo que proponga el motor).
  const tipo = useRef<HTMLInputElement>(null)
  const pedir = (t: string) => (): void => { if (tipo.current) tipo.current.value = t }
  return (
    <Hoja
      disparador="Generar entreno"
      titulo={`Generar entreno · ${titulo}`}
      claseDisparador={`${principal ? BOTON : BOTON_SECUNDARIO} w-full`}
      cerrar={estado !== null && 'ok' in estado}
    >
      <form onSubmit={enviarSinVaciar(accion)} className="space-y-4">
        <input type="hidden" name="fecha" value={fecha} />
        <input ref={tipo} type="hidden" name="tipo" defaultValue="" />
        <Opciones nombre="compania" leyenda="¿Con quién?" requerido valor={inicial.compania} columnas={2}
          opciones={[{ valor: 'solo', texto: 'Solo' }, { valor: 'con-gente', texto: 'Con gente' }]} />
        <Opciones nombre="lugar" leyenda="¿Dónde?" requerido valor={inicial.lugar}
          opciones={[{ valor: 'rocodromo', texto: 'Rocódromo' }, { valor: 'roca', texto: 'Roca' }, { valor: 'casa', texto: 'Casa' }]} />
        <Opciones nombre="franja" leyenda="¿Cuándo?" requerido valor={inicial.franja} columnas={2}
          opciones={[{ valor: 'manana', texto: 'Mañana' }, { valor: 'tarde', texto: 'Tarde' }]} />
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
        {estado !== null && 'descanso' in estado && (
          <div className="space-y-3 rounded-2xl border border-borde bg-superficie-2 p-4">
            <h3 className="font-titular text-xl font-bold uppercase">Toca descansar</h3>
            <p className="text-sm">{estado.descanso.motivo.motivo}</p>
            <PorQue explicaciones={[estado.descanso.motivo]} />
            {estado.descanso.alternativas.length > 0 && <p className="text-sm text-texto-2">Si quieres moverte:</p>}
            {estado.descanso.alternativas.map((a, i) => (
              <button key={a.tipo} onClick={pedir(a.tipo)} disabled={pendiente} className={`${i === 0 ? BOTON : BOTON_SECUNDARIO} w-full`}>
                Generar {a.nombre} · {a.minutos} min
              </button>
            ))}
          </div>
        )}
        {/* Con descanso, «Generar» sigue ahí (en secundario) por si cambias el sitio o los minutos. */}
        <button onClick={pedir('')} className={`${estado !== null && 'descanso' in estado ? BOTON_SECUNDARIO : BOTON} w-full`} disabled={pendiente}>
          {pendiente ? 'Generando…' : 'Generar'}
        </button>
        {estado !== null && 'error' in estado && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
      </form>
    </Hoja>
  )
}
