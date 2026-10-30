import { Check, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { TARJETA_DESTACADA } from '@/components/estilos'
import { BarraProgreso } from '@/components/ui/BarraProgreso'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Hoja } from '@/components/ui/Hoja'
import type { ChapaVia, LargoVia } from '@/lib/datos/via'
import { DISPARADOR_ESTIRADO, FilaVia, LINEA, corta } from './Rail'
import { CIRCULO } from './Reunion'

const sesiones = (n: number): string => (n === 1 ? '1 sesión' : `${n} sesiones`)
const semanas = (n: number): string => (n === 1 ? '1 semana' : `${n} semanas`)

// Largo de la vía en el raíl: tramo lima hasta tu semana (todo si está hecho), gris por hacer; una chapa por semana, de abajo
// arriba. Las descargas, más finas y apagadas. En el largo actual, un anillo marca la semana en curso. Los tests a mitad
// del largo (no el de su última semana, que va en su propia fila encima) llevan en su semana el círculo de reunión.
function RailLargo({ largo }: { largo: LargoVia }) {
  const ultima = largo.chapas.at(-1)?.lunes
  const intermedias = new Map(largo.reuniones.filter((r) => r.lunes !== ultima).map((r) => [r.lunes, r]))
  const n = largo.chapas.length
  const iActual = largo.chapas.findIndex((c) => c.estado === 'actual')
  const relleno = largo.estado === 'hecho' ? 1 : iActual >= 0 ? (iActual + 0.5) / n : 0
  return (
    <>
      <div className={`${LINEA} inset-y-0 bg-pista`} />
      {relleno > 0 && <div className={`${LINEA} bottom-0 bg-progreso`} style={{ height: `${relleno * 100}%` }} />}
      <div className="absolute inset-0 flex flex-col-reverse">
        {largo.chapas.map((c) => {
          const reunion = intermedias.get(c.lunes)
          return (
            <div key={c.lunes} className="flex flex-1 items-center justify-center">
              {reunion && c.estado !== 'actual' ? (
                <span className={`flex size-4 items-center justify-center rounded-full border-2 ${CIRCULO[reunion.estado]}`}>
                  {reunion.estado === 'hecha' && <Check size={10} strokeWidth={3.5} />}
                </span>
              ) : c.estado === 'actual' ? (
                <span className="size-4 rounded-full border-[3px] border-progreso bg-fondo" />
              ) : (
                <span className={`w-3.5 rounded-full ${c.descarga ? 'h-0.5 opacity-60' : 'h-[3px]'} ${c.estado === 'hecho' ? 'bg-progreso' : 'bg-texto-3'}`} />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function textoChapa(c: ChapaVia): string | null {
  if (c.estado === 'hecho') return sesiones(c.sesionesHechas)
  if (c.estado === 'actual') return 'esta semana'
  return null
}

// La hoja de un largo: su objetivo y sus semanas en orden.
function DetalleLargo({ largo }: { largo: LargoVia }) {
  return (
    <div className="space-y-4">
      <p className="text-texto-2">{largo.objetivo}</p>
      <div className="space-y-2">
        <Etiqueta as="h3">Semanas · ciclo {largo.ciclo}</Etiqueta>
        <ol className="divide-y divide-borde rounded-2xl border border-borde">
          {largo.chapas.map((c) => {
            const texto = textoChapa(c)
            return (
              <li key={c.lunes} className={`flex flex-wrap items-center gap-x-2 px-3 py-2.5 text-sm ${c.estado === 'actual' ? 'bg-progreso/10' : ''}`}>
                <span
                  aria-hidden="true"
                  className={`h-[3px] w-2.5 shrink-0 rounded-full ${c.estado === 'futuro' ? 'bg-texto-3' : 'bg-progreso'} ${c.descarga ? 'opacity-60' : ''}`}
                />
                <span className={c.estado === 'futuro' ? 'text-texto-2' : ''}>Semana del {corta(c.lunes)}</span>
                {c.descarga && <span className="text-texto-2">· descarga</span>}
                {largo.reuniones.some((r) => r.lunes === c.lunes) && <span className="text-texto-2">· test</span>}
                {texto && <span className={c.estado === 'actual' ? 'font-medium text-progreso' : 'text-texto-2'}>· {texto}</span>}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

// `intermedias`: las reuniones a mitad del largo, que se pintan debajo de su cabecera, dentro de la fila del largo.
export function Largo({ largo, intermedias }: { largo: LargoVia; intermedias?: ReactNode }) {
  const n = largo.chapas.length
  const titulo = `Largo ${largo.numero} · ${largo.fase}`
  const alto = Math.max(64, n * 12 + 16)
  const etiqueta = `Largo ${largo.numero} · ciclo ${largo.ciclo}`

  if (largo.estado === 'actual') {
    const iActual = largo.chapas.findIndex((c) => c.estado === 'actual')
    return (
      <FilaVia rail={<RailLargo largo={largo} />} alto={alto} arriba>
        <div className={`${TARJETA_DESTACADA} relative my-1.5`}>
          <Hoja
            titulo={titulo}
            claseDisparador={DISPARADOR_ESTIRADO}
            disparador={
              <span className="flex items-start justify-between gap-2">
                <span className="block space-y-1">
                  <span className="block font-titular text-xs font-medium uppercase tracking-[0.08em] text-progreso">{etiqueta} · actual</span>
                  <span className="block font-titular text-3xl font-extrabold uppercase leading-none">{largo.fase}</span>
                  <span className="block pt-1 tabular-nums">
                    Semana {iActual + 1} de {n} · {sesiones(largo.sesionesHechas)}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-texto-2" />
              </span>
            }
          >
            <DetalleLargo largo={largo} />
          </Hoja>
          <BarraProgreso valor={(iActual + 1) / n} etiqueta="Semanas del largo" />
        </div>
        {intermedias}
      </FilaVia>
    )
  }

  const hecho = largo.estado === 'hecho'
  const hoja = (
    <Hoja
      titulo={titulo}
      claseDisparador={DISPARADOR_ESTIRADO}
      disparador={
        <span className="flex items-center justify-between gap-2">
          <span className="block space-y-0.5">
            <span className="block font-titular text-xs font-medium uppercase tracking-[0.08em] text-texto-2">{etiqueta}</span>
            <span className={`block font-titular text-xl font-bold uppercase leading-tight ${hecho ? '' : 'text-texto-2'}`}>
              {largo.fase}
              {hecho && <span className="text-progreso"> ✓</span>}
            </span>
            <span className="block text-sm tabular-nums text-texto-2">
              {hecho ? `${semanas(n)} · ${sesiones(largo.sesionesHechas)}` : semanas(n)}
            </span>
          </span>
          <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-texto-3" />
        </span>
      }
    >
      <DetalleLargo largo={largo} />
    </Hoja>
  )
  return (
    <FilaVia rail={<RailLargo largo={largo} />} alto={alto} arriba>
      {/* Con reuniones dentro, la capa tocable del largo se limita a su cabecera para no tapar las de las reuniones. */}
      {intermedias ? <div className="relative">{hoja}</div> : hoja}
      {intermedias}
    </FilaVia>
  )
}
