import { Check, ChevronRight } from 'lucide-react'
import { IconoCima } from '@/components/iconos/Escalada'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Hoja } from '@/components/ui/Hoja'
import type { ChapaVia, LargoVia, VistaVia } from '@/lib/datos/via'
import { fechaLarga } from '@/lib/fecha'
import { COLOR_FASE } from '@/lib/ui/fases'
import { corta, rango, semanas, sesiones } from './fechas'
import { textoReunionVia } from './Reunion'

// Anillo de semanas del largo: un arco por semana, en el color de la fase; las hechas y la actual en pleno, las que faltan
// al 28 %. Las descargas, más finas. En el centro, «X/Y» (o las semanas que tiene si aún no ha empezado).
const R = 30
const C = 2 * Math.PI * R
const HUECO = 4

function AnilloSemanas({ largo }: { largo: LargoVia }) {
  const n = largo.chapas.length
  const color = COLOR_FASE[largo.faseId]
  const tramo = C / n
  const arco = n === 1 ? C : tramo - HUECO
  const iActual = largo.chapas.findIndex((c) => c.estado === 'actual')
  const hechas = largo.estado === 'hecho' ? n : iActual >= 0 ? iActual + 1 : 0
  return (
    <span aria-hidden="true" className="relative block size-[76px] shrink-0">
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
        {largo.chapas.map((c, i) => (
          <circle
            key={c.lunes}
            cx="38"
            cy="38"
            r={R}
            fill="none"
            className={c.estado === 'futuro' ? `${color.trazo} opacity-[.28]` : color.trazo}
            strokeWidth={c.descarga ? 4 : 7}
            strokeDasharray={`${arco} ${C}`}
            strokeDashoffset={-(i * tramo + (n === 1 ? 0 : HUECO / 2))}
          />
        ))}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {largo.estado === 'futuro' ? (
          <>
            <span className="font-titular text-2xl font-extrabold tabular-nums">{n}</span>
            <span className="font-titular text-[0.65rem] uppercase tracking-[0.08em] text-texto-2">sem.</span>
          </>
        ) : largo.estado === 'hecho' ? (
          <Check size={28} strokeWidth={3} className={color.texto} />
        ) : (
          <span className="font-titular text-2xl font-extrabold tabular-nums">
            {hechas}<span className="text-texto-2">/{n}</span>
          </span>
        )}
      </span>
    </span>
  )
}

function textoChapa(c: ChapaVia): string | null {
  if (c.estado === 'hecho') return sesiones(c.sesionesHechas)
  if (c.estado === 'actual') return 'esta semana'
  return null
}

// La hoja de un largo: su objetivo y sus semanas en orden.
function DetalleLargo({ largo }: { largo: LargoVia }) {
  const color = COLOR_FASE[largo.faseId]
  return (
    <div className="space-y-4">
      <p className="text-texto-2">{largo.objetivo}</p>
      <div className="space-y-2">
        <Etiqueta as="h3">Semanas · ciclo {largo.ciclo}</Etiqueta>
        <ol className="divide-y divide-borde rounded-2xl border border-borde">
          {largo.chapas.map((c) => {
            const texto = textoChapa(c)
            return (
              <li key={c.lunes} className={`flex flex-wrap items-center gap-x-2 px-3 py-2.5 text-sm ${c.estado === 'actual' ? 'bg-superficie-2' : ''}`}>
                <span
                  aria-hidden="true"
                  className={`w-2.5 shrink-0 rounded-full ${color.fondo} ${c.descarga ? 'h-0.5' : 'h-[3px]'} ${c.estado === 'futuro' ? 'opacity-[.28]' : ''}`}
                />
                <span className={c.estado === 'futuro' ? 'text-texto-2' : ''}>Semana del {corta(c.lunes)}</span>
                {c.descarga && <span className="text-texto-2">· descarga</span>}
                {largo.reuniones.some((r) => r.lunes === c.lunes) && <span className="text-texto-2">· test</span>}
                {texto && <span className={c.estado === 'actual' ? `font-medium ${color.textoPequeno}` : 'text-texto-2'}>· {texto}</span>}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

const ESTADO = { hecho: 'hecho', actual: 'ahora', futuro: 'por hacer' } as const

// Tarjeta de un largo en el carrusel. Toda la tarjeta abre la hoja con sus semanas. `numeros`: R1, R2… de cada reunión.
export function TarjetaLargo({ largo, numeros }: { largo: LargoVia; numeros: Record<string, number> }) {
  const color = COLOR_FASE[largo.faseId]
  const n = largo.chapas.length
  const iActual = largo.chapas.findIndex((c) => c.estado === 'actual')
  const actual = largo.estado === 'actual'
  const primera = largo.chapas[0]!.lunes
  const ultima = largo.chapas.at(-1)!.lunes
  return (
    <Hoja
      titulo={`Largo ${largo.numero} · ${largo.fase}`}
      claseDisparador={`flex h-full w-full flex-col gap-3 rounded-2xl border bg-superficie p-4 text-left active:bg-superficie-2 ${actual ? color.borde : 'border-borde'}`}
      disparador={
        <>
          <span className="block space-y-1.5">
            <span className={`block font-titular text-xs font-medium uppercase tracking-[0.08em] ${actual ? color.textoPequeno : 'text-texto-2'}`}>
              Largo {largo.numero} · ciclo {largo.ciclo} · {ESTADO[largo.estado]}
            </span>
            <span className={`block font-titular text-[1.65rem] font-extrabold uppercase leading-[0.95] ${color.texto}`}>{largo.fase}</span>
            <span className="block text-sm tabular-nums text-texto-2">{rango(primera, ultima)}</span>
          </span>
          <span className="flex items-center gap-4">
            <AnilloSemanas largo={largo} />
            <span className="block min-w-0 space-y-0.5 text-sm tabular-nums">
              <span className="block text-base font-medium text-texto">
                {actual ? `Semana ${iActual + 1} de ${n}` : largo.estado === 'hecho' ? `${semanas(n)} · hecho` : semanas(n)}
              </span>
              {largo.estado !== 'futuro' && <span className="block text-texto-2">{sesiones(largo.sesionesHechas)}</span>}
              {largo.reuniones.map((r) => (
                <span key={r.lunes} className={`block ${r.estado === 'sin-hacer' ? 'text-ambar' : r.estado === 'hecha' ? 'text-texto' : 'text-texto-2'}`}>
                  {textoReunionVia(r, numeros[r.lunes]!, true)}
                </span>
              ))}
            </span>
          </span>
          <span className="line-clamp-2 text-sm text-texto-2">{largo.objetivo}</span>
          <span className="mt-auto flex items-center justify-end gap-1 text-sm font-medium text-texto-2">
            Ver semanas <ChevronRight aria-hidden="true" size={16} />
          </span>
        </>
      }
    >
      <DetalleLargo largo={largo} />
    </Hoja>
  )
}

// Última tarjeta del carrusel: la cima, con la fecha y el grado objetivo. No abre hoja.
// `falta`: «dentro de 26 semanas», «esta semana»… (null si no se sabe).
export function TarjetaCima({ cima, falta }: { cima: VistaVia['cima']; falta: string | null }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-cima bg-superficie p-4">
      <span className="block space-y-1.5">
        <Etiqueta as="p" className="text-cima">Cima · semana objetivo{cima.actual ? ' · ahora' : ''}</Etiqueta>
        <span className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-cima/15 text-cima">
            <IconoCima size={28} />
          </span>
          <span className="block font-titular text-[1.65rem] font-extrabold uppercase leading-[0.95]">{fechaLarga(cima.lunes)}</span>
        </span>
      </span>
      <p className="tabular-nums">
        Grado objetivo: <span className="font-titular text-2xl font-extrabold text-cima">{cima.grado}</span>
      </p>
      <p className="line-clamp-3 text-sm text-texto-2">{cima.objetivo}</p>
      {falta && <p className="mt-auto font-titular text-lg font-bold uppercase text-cima">{falta}</p>}
    </div>
  )
}
