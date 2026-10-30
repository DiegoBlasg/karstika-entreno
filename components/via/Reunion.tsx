import Link from 'next/link'
import { Check, ChevronRight } from 'lucide-react'
import { ENLACE } from '@/components/estilos'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Hoja } from '@/components/ui/Hoja'
import { textoLastre } from '@/lib/cronometro/test'
import type { ResultadoTest, ReunionVia } from '@/lib/datos/via'
import { sumarDias } from '@/lib/fecha'
import { DISPARADOR_ESTIRADO, FilaVia, LINEA, corta } from './Rail'

const pct = (r: ResultadoTest): number => Math.round(r.fuerzaRelativa)

export const CIRCULO: Record<ReunionVia['estado'], string> = {
  hecha: 'border-progreso bg-progreso text-fondo',
  proxima: 'border-progreso bg-fondo',
  futura: 'border-texto-3 bg-fondo',
  'sin-hacer': 'border-ambar bg-fondo',
}

const ESTADO: Record<ReunionVia['estado'], string> = {
  hecha: 'hecha',
  proxima: 'próxima',
  futura: 'por hacer',
  'sin-hacer': 'sin hacer',
}

// Semanas que faltan desde la semana en curso hasta la del test.
function cuando(lunes: string, lunesActual: string | null): string | null {
  if (!lunesActual) return null
  if (lunes === lunesActual) return 'esta semana'
  let n = 0
  for (let l = lunesActual; l < lunes; l = sumarDias(l, 7)) n++
  return n === 1 ? 'la semana que viene' : `en ${n} semanas`
}

function textoFila(r: ReunionVia, numero: number): string {
  const semana = `semana del ${corta(r.lunes)}`
  if (r.estado === 'hecha' && r.resultado) return `R${numero} · ${pct(r.resultado)} % del peso`
  if (r.estado === 'sin-hacer') return `Test sin hacer · ${semana}`
  return `Test · ${semana}`
}

// La hoja de una reunión: su resultado y la evolución de todos los tests.
function DetalleReunion({ reunion, tests }: { reunion: ReunionVia; tests: ResultadoTest[] }) {
  const r = reunion.resultado
  const i = r ? tests.findIndex((t) => t.fecha === r.fecha) : -1
  const anterior = i > 0 ? tests[i - 1]! : null
  const diferencia = r && anterior ? pct(r) - pct(anterior) : null
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Etiqueta as="h3">Resultado · semana del {corta(reunion.lunes)}</Etiqueta>
        {r ? (
          <>
            <p className="font-titular text-2xl font-bold uppercase text-progreso tabular-nums">
              {textoLastre(r.lastreKg)} · {pct(r)} % de tu peso
            </p>
            {diferencia !== null && (
              <p className="text-sm text-texto-2">
                {diferencia === 0 ? 'Igual que el test anterior.' : `${diferencia > 0 ? '+' : '−'}${Math.abs(diferencia)} puntos respecto al test anterior.`}
              </p>
            )}
          </>
        ) : (
          <p className="text-lg">{reunion.estado === 'sin-hacer' ? 'Sin hacer: la semana pasó sin resultado.' : 'Pendiente'}</p>
        )}
      </div>
      <div className="space-y-2">
        <Etiqueta as="h3">Evolución</Etiqueta>
        {tests.length === 0 ? (
          <p className="text-sm text-texto-2">Todavía no hay ningún test apuntado.</p>
        ) : (
          <ol className="divide-y divide-borde rounded-2xl border border-borde">
            {tests.map((t) => {
              const esta = r?.fecha === t.fecha
              return (
                <li key={t.fecha} className={`flex justify-between gap-2 px-3 py-2.5 text-sm tabular-nums ${esta ? 'bg-progreso/10 font-medium' : ''}`}>
                  <span>{corta(t.fecha)}{esta && <span className="text-progreso"> · esta reunión</span>}</span>
                  <span>{pct(t)} % del peso</span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
      <Link href="/progreso" className={`${ENLACE} inline-flex min-h-11 items-center`}>Apuntar un resultado</Link>
    </div>
  )
}

// Reunión (semana de test). Por defecto, en el raíl entre dos largos (la del final de un largo); `dentro`: un test a
// mitad de un largo, que se pinta dentro de la fila del largo (su círculo lo dibuja el raíl del largo, en su semana).
// `hecho`: el tramo que la cruza ya está escalado.
export function Reunion({ reunion, numero, tests, lunesActual, hecho, dentro = false }: {
  reunion: ReunionVia
  numero: number
  tests: ResultadoTest[]
  lunesActual: string | null
  hecho: boolean
  dentro?: boolean
}) {
  const { estado } = reunion
  const extra = estado === 'proxima' ? cuando(reunion.lunes, lunesActual) : estado === 'hecha' ? `semana del ${corta(reunion.lunes)}` : null
  const hoja = (
    <Hoja
      titulo={`Reunión R${numero}`}
      claseDisparador={DISPARADOR_ESTIRADO}
      disparador={
        <span className="flex items-center justify-between gap-2">
          <span className="block">
            <span className={`block font-titular text-xs font-medium uppercase tracking-[0.08em] ${estado === 'sin-hacer' ? 'text-ambar' : estado === 'proxima' || estado === 'hecha' ? 'text-progreso' : 'text-texto-2'}`}>
              Reunión R{numero}{dentro ? ' · a mitad del largo' : ''} · {ESTADO[estado]}
            </span>
            <span className={`block tabular-nums ${estado === 'futura' ? 'text-texto-2' : ''}`}>
              {textoFila(reunion, numero)}
              {extra && <span className="text-texto-2"> · {extra}</span>}
            </span>
          </span>
          <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-texto-3" />
        </span>
      }
    >
      <DetalleReunion reunion={reunion} tests={tests} />
    </Hoja>
  )
  if (dentro) return <div className="relative">{hoja}</div>
  return (
    <FilaVia
      rail={
        <>
          <div className={`${LINEA} inset-y-0 ${hecho ? 'bg-progreso' : 'bg-pista'}`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`flex size-5 items-center justify-center rounded-full border-2 ${CIRCULO[estado]}`}>
              {estado === 'hecha' && <Check size={12} strokeWidth={3.5} />}
            </span>
          </div>
        </>
      }
    >
      {hoja}
    </FilaVia>
  )
}
