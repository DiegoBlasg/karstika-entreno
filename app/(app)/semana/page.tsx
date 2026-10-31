import Link from 'next/link'
import { FilaSesion } from '@/components/FilaSesion'
import { GenerarEntreno } from '@/components/GenerarEntreno'
import { BOTON_SECUNDARIO } from '@/components/estilos'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { vistaAgenda } from '@/lib/datos/agenda'
import { ahoraMadrid, lunesDe, sumarDias } from '@/lib/fecha'
import { chequeoDelDia } from '@/lib/formulario'
import { requerirDatos } from '@/lib/servidor/consultas'
import { esCargaAlta } from '@/motor'

const fechaUTC = (fecha: string): Date => new Date(`${fecha}T12:00:00Z`)
const ABREV = new Intl.DateTimeFormat('es-ES', { weekday: 'short', timeZone: 'UTC' })
const NOMBRE = new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: 'UTC' })
const RANGO = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const abrev = (fecha: string): string => ABREV.format(fechaUTC(fecha)).replace(/\./g, '')
const numero = (fecha: string): number => fechaUTC(fecha).getUTCDate()
// «jueves 6»: para el título de la hoja.
const nombreDia = (fecha: string): string => `${NOMBRE.format(fechaUTC(fecha))} ${numero(fecha)}`
const rango = (fecha: string): string => RANGO.format(fechaUTC(fecha))

const NAVEGAR = `${BOTON_SECUNDARIO} px-3 text-base`

// La semana como agenda: cada día con sus sesiones en filas compactas y «Generar entreno» (desde hoy y dentro de la
// temporada). Sin ratos ni horas: mañana o tarde.
export default async function PaginaSemana({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { datos } = await requerirDatos()
  const hoy = ahoraMadrid(new Date()).fecha
  const estaSemana = lunesDe(hoy)
  const siguiente = sumarDias(estaSemana, 7)
  const lunes = (await searchParams).lunes === siguiente ? siguiente : estaSemana
  const v = vistaAgenda(datos, lunes, hoy)
  // El único botón principal: el primer día en que se puede generar y aún no tiene nada.
  const primero = v.dias.find((d) => d.generable && d.tarjetas.length === 0)?.fecha
  const chequeoHoy = chequeoDelDia(datos.chequeos, hoy)
  const conEstrella = v.dias.some((d) => d.tarjetas.some((t) => esCargaAlta(t.fila.sesion)))
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
          {/* Solo hay dos semanas: el enlace que no lleva a ninguna parte deja su sitio vacío (no un botón apagado). */}
          {lunes === estaSemana ? <span aria-hidden="true" /> : <Link href="/semana" className={NAVEGAR}>‹ Anterior</Link>}
          {lunes === estaSemana ? <Link href={`/semana?lunes=${siguiente}`} className={NAVEGAR}>Siguiente ›</Link> : <span aria-hidden="true" />}
        </nav>
      </header>
      <ol className="border-t border-borde">
        {v.dias.map((d) => {
          const esHoy = d.fecha === hoy
          const pasado = d.fecha < hoy
          return (
            <li
              key={d.fecha}
              data-fecha={d.fecha}
              aria-current={esHoy ? 'date' : undefined}
              className={`grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 border-b border-borde py-3 ${pasado ? 'opacity-50' : ''}`}
            >
              <div className={esHoy ? 'border-l-[3px] border-progreso pl-2' : ''}>
                <Etiqueta as="p" className={esHoy ? 'text-progreso' : ''}>{abrev(d.fecha)}</Etiqueta>
                <p className="font-titular text-2xl font-bold leading-none">{numero(d.fecha)}</p>
                {esHoy && <p className="sr-only">hoy</p>}
              </div>
              <div className="min-w-0 space-y-2">
                {d.tarjetas.map((t) => <FilaSesion key={t.fila.id} tarjeta={t} hoy={hoy} conDia={false} />)}
                {d.tarjetas.length === 0 && !d.generable && <p className="flex min-h-11 items-center text-texto-2">Nada</p>}
                {d.generable && (
                  <GenerarEntreno
                    fecha={d.fecha}
                    titulo={esHoy ? 'hoy' : nombreDia(d.fecha)}
                    inicial={d.inicial}
                    pedirChequeo={esHoy && !chequeoHoy}
                    principal={d.fecha === primero}
                  />
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {conEstrella && <p className="text-xs text-texto-2"><span className="text-cima">★</span> = carga alta.</p>}
    </div>
  )
}
