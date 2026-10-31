import Link from 'next/link'
import { BOTON, BOTON_SECUNDARIO } from '@/components/estilos'
import { Aviso } from '@/components/ui/Aviso'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { enlacePreparar } from '@/lib/datos/huecos'
import { proximosDias, type HuecoPlan } from '@/lib/datos/plan'
import { vistaSemana, type HuecoVista } from '@/lib/datos/semana'
import { ahoraMadrid, hhmmDeMinutos, lunesDe, sumarDias } from '@/lib/fecha'
import { DESCANSO_ACTIVO, NOMBRE_LUGAR, nombreSesion } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'
import { AnadirRato } from './AnadirRato'
import { BotonBorrarHueco } from './BotonBorrarHueco'

const AVISO_SEMANA_VACIA = 'Añade cuándo puedes entrenar esta semana con el + de cada día.'
const AVISO_ORIENTATIVO = ' Mientras tanto, esto es lo que haría el entrenador con tu semana habitual:'
// La agenda ya enseña que todos los ratos han pasado o tienen sesión: este aviso solo repetiría lo que se ve.
const AVISO_REDUNDANTE = 'No te quedan huecos pendientes esta semana.'

const fechaUTC = (fecha: string): Date => new Date(`${fecha}T12:00:00Z`)
const ABREV = new Intl.DateTimeFormat('es-ES', { weekday: 'short', timeZone: 'UTC' })
const NOMBRE = new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: 'UTC' })
const RANGO = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const abrev = (fecha: string): string => ABREV.format(fechaUTC(fecha)).replace(/\./g, '')
const numero = (fecha: string): number => fechaUTC(fecha).getUTCDate()
// «lunes 2»: para el título de la hoja y el nombre del «+».
const nombreDia = (fecha: string): string => `${NOMBRE.format(fechaUTC(fecha))} ${numero(fecha)}`
const rango = (fecha: string): string => RANGO.format(fechaUTC(fecha))

const NAVEGAR = `${BOTON_SECUNDARIO} px-3 text-base`
const PREPARAR_PRINCIPAL = `${BOTON} min-h-11 px-3 py-1.5 text-base`
const PREPARAR = `${BOTON_SECUNDARIO} min-h-11 px-3 py-1.5 text-base`
const ESTRELLA = <span className="text-cima"><span aria-hidden="true">★</span><span className="sr-only">(carga alta)</span></span>

// hora · sitio · minutos
function Cuando({ inicio, lugar, minutos }: { inicio: number; lugar: keyof typeof NOMBRE_LUGAR; minutos: number }) {
  return <p className="text-sm text-texto-2">{hhmmDeMinutos(inicio)} · <span className="capitalize">{NOMBRE_LUGAR[lugar]}</span> · {minutos} min</p>
}

// Un rato declarado, con lo que toca, «Preparar» (si aún se puede) y borrar.
// `atenuado`: ya ha pasado en un día que no va atenuado entero (hoy).
function Rato({ h, principal, atenuado }: { h: HuecoVista; principal: boolean; atenuado: boolean }) {
  const { fila, estado } = h
  const pasado = estado.tipo === 'pasado'
  const preparable = estado.tipo === 'planeado' || estado.tipo === 'libre' || estado.tipo === 'sin-plan'
  return (
    <div className={atenuado ? 'opacity-50' : ''}>
      <Cuando inicio={fila.inicio_min} lugar={fila.lugar} minutos={fila.minutos} />
      {estado.tipo === 'planeado' && <p className="font-semibold">{nombreSesion(estado.sesion)} {estado.cargaAlta && ESTRELLA}</p>}
      {estado.tipo === 'libre' && <p className="text-sm text-texto-2">{estado.descansoActivo ? DESCANSO_ACTIVO : 'Libre: no hace falta entrenar.'}</p>}
      {estado.tipo === 'sin-plan' && <p className="text-texto-2">Sin plan: prepáralo cuando llegue.</p>}
      {estado.tipo === 'ocupado' && (
        <p>
          <span className="font-semibold">{nombreSesion(estado.sesion.sesion)}</span> · {estado.registrada ? 'Registrada' : 'Aceptada'} ·{' '}
          <Link href="/" className="text-progreso underline underline-offset-2">Ver en Hoy</Link>
        </p>
      )}
      {pasado && estado.sesion && <p>{nombreSesion(estado.sesion.sesion)}</p>}
      {!pasado && (
        <div className="mt-1.5 flex items-center gap-2">
          {preparable && <Link href={enlacePreparar(fila)} className={principal ? PREPARAR_PRINCIPAL : PREPARAR}>Preparar</Link>}
          <BotonBorrarHueco id={fila.id} conSesion={estado.tipo === 'ocupado'} />
        </div>
      )}
    </div>
  )
}

// Un rato del plan orientativo (la semana habitual): solo lo que haría el entrenador, sin botones.
function RatoOrientativo({ h }: { h: HuecoPlan }) {
  const { hueco, sesion, estado } = h
  return (
    <div>
      <Cuando inicio={hueco.inicio_min} lugar={hueco.lugar} minutos={hueco.minutos} />
      {sesion
        ? <p className="font-semibold">{nombreSesion(sesion)} {h.cargaAlta && ESTRELLA}</p>
        : <p className="text-sm text-texto-2">{estado === 'libre' ? (h.descansoActivo ? DESCANSO_ACTIVO : 'Libre: no hace falta entrenar.') : 'Sin plan todavía.'}</p>}
    </div>
  )
}

export default async function PaginaSemana({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { datos } = await requerirDatos()
  const ahora = ahoraMadrid(new Date())
  const hoy = ahora.fecha
  const estaSemana = lunesDe(hoy)
  const siguiente = sumarDias(estaSemana, 7)
  const pedido = (await searchParams).lunes
  const lunes = pedido === siguiente ? siguiente : estaSemana
  const momento = { fecha: hoy, minutos: Math.round(ahora.hora * 60) }
  const v = vistaSemana(datos, lunes, momento)
  const vacia = v.huecos.length === 0
  // Sin ratos declarados: lo que haría el entrenador con la semana habitual (lo que ya ha pasado no se enseña).
  const orientativa = vacia ? proximosDias(datos, momento).semanas.find((s) => s.lunes === lunes && s.orientativo) : undefined
  const conPlan = orientativa?.huecos.some((h) => h.estado !== 'pasado') ?? false
  const avisoPlan = vacia ? orientativa?.aviso : v.aviso
  const aviso = avisoPlan === AVISO_REDUNDANTE ? undefined : avisoPlan
  // El primer rato que se puede preparar lleva el único botón principal de la pantalla.
  const primero = v.huecos.find((h) => h.estado.tipo === 'planeado' || h.estado.tipo === 'libre' || h.estado.tipo === 'sin-plan')
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
  const conEstrella = vacia
    ? orientativa?.huecos.some((h) => h.estado !== 'pasado' && h.cargaAlta)
    : v.huecos.some((h) => h.estado.tipo === 'planeado' && h.estado.cargaAlta)
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-titular text-4xl font-extrabold uppercase leading-none">Tu <span className="text-progreso">semana</span></h1>
        <p>
          <Etiqueta>
            {rango(v.lunes)} – {rango(v.domingo)}
            {v.fase ? ` · ${v.fase.nombre}${v.fase.descarga ? ' (descarga)' : ''}` : ''}
          </Etiqueta>
        </p>
        <nav aria-label="Cambiar de semana" className="flex justify-between gap-2">
          {lunes === estaSemana
            ? <span aria-disabled="true" className={`${NAVEGAR} opacity-40`}>‹ Anterior</span>
            : <Link href="/semana" className={NAVEGAR}>‹ Anterior</Link>}
          {lunes === estaSemana
            ? <Link href={`/semana?lunes=${siguiente}`} className={NAVEGAR}>Siguiente ›</Link>
            : <span aria-disabled="true" className={`${NAVEGAR} opacity-40`}>Siguiente ›</span>}
        </nav>
      </header>
      {vacia && <Aviso tono="info">{AVISO_SEMANA_VACIA}{conPlan && AVISO_ORIENTATIVO}</Aviso>}
      {aviso && <Aviso tono="ambar">{aviso}</Aviso>}
      <ol className="border-t border-borde">
        {dias.map((fecha) => {
          const esHoy = fecha === hoy
          const pasadoDia = fecha < hoy
          const ratos = v.huecos.filter((h) => h.fila.fecha === fecha)
          const plan = orientativa?.huecos.filter((h) => h.hueco.fecha === fecha && h.estado !== 'pasado') ?? []
          return (
            <li
              key={fecha}
              aria-current={esHoy ? 'date' : undefined}
              className={`grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-x-3 gap-y-2 border-b border-borde py-3 ${pasadoDia ? 'opacity-50' : ''}`}
            >
              <div className={`col-start-1 row-start-1 ${esHoy ? 'border-l-[3px] border-progreso pl-2' : ''}`}>
                <Etiqueta as="p" className={esHoy ? 'text-progreso' : ''}>{abrev(fecha)}</Etiqueta>
                <p className="font-titular text-2xl font-bold leading-none">{numero(fecha)}</p>
                {esHoy && <p className="sr-only">hoy</p>}
              </div>
              <div className="col-start-2 row-start-1 min-w-0 space-y-3">
                {ratos.length > 0
                  ? ratos.map((h) => <Rato key={h.fila.id} h={h} principal={h === primero} atenuado={!pasadoDia && h.estado.tipo === 'pasado'} />)
                  : plan.length > 0
                    ? plan.map((h) => <RatoOrientativo key={h.hueco.id} h={h} />)
                    : <p className="flex min-h-11 items-center text-texto-3">Sin ratos para entrenar</p>}
              </div>
              {!pasadoDia && <AnadirRato fecha={fecha} dia={nombreDia(fecha)} />}
            </li>
          )
        })}
      </ol>
      {conEstrella && <p className="text-xs text-texto-2"><span className="text-cima">★</span> = carga alta.</p>}
    </div>
  )
}
