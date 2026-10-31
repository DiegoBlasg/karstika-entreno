import { ChevronRight } from 'lucide-react'
import { IconoReunion } from '@/components/iconos/Escalada'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Hoja } from '@/components/ui/Hoja'
import { textoLastre } from '@/lib/cronometro/test'
import type { ResultadoTest, ReunionVia } from '@/lib/datos/via'
import { sumarDias } from '@/lib/fecha'
import { corta } from './fechas'

const pct = (r: ResultadoTest): number => Math.round(r.fuerzaRelativa)

// Semanas que faltan desde la semana en curso hasta la del test.
function cuando(lunes: string, lunesActual: string | null): string | null {
  if (!lunesActual) return null
  if (lunes === lunesActual) return 'esta semana'
  let n = 0
  for (let l = lunesActual; l < lunes; l = sumarDias(l, 7)) n++
  return n === 1 ? 'la semana que viene' : `en ${n} semanas`
}

// Una reunión en una línea: «R2 · 114 % del peso», «Test · semana del 22 feb» o «Test sin hacer · semana del 22 feb».
// `corto`, para las tarjetas del carrusel: «R2 · 114 %», «Test sin hacer · 22 feb».
export function textoReunionVia(r: ReunionVia, numero: number, corto = false): string {
  const semana = `semana del ${corta(r.lunes)}`
  if (r.estado === 'hecha' && r.resultado) return `R${numero} · ${pct(r.resultado)} %${corto ? '' : ' del peso'}`
  if (r.estado === 'sin-hacer') return `Test sin hacer · ${corto ? corta(r.lunes) : semana}`
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
    </div>
  )
}

// Debajo del carrusel: la próxima reunión (o, si ya no quedan, la última) y, al tocarla, su hoja con la evolución.
export function ProximaReunion({ reuniones, tests, lunesActual }: {
  reuniones: ReunionVia[] // todas las de la temporada, en orden
  tests: ResultadoTest[]
  lunesActual: string | null
}) {
  if (reuniones.length === 0) return null
  const i = reuniones.findIndex((r) => r.estado === 'proxima' || r.estado === 'futura')
  const pendiente = i >= 0
  const indice = pendiente ? i : reuniones.length - 1
  const reunion = reuniones[indice]!
  const numero = indice + 1
  const todasHechas = reuniones.every((r) => r.estado === 'hecha')
  const etiqueta = pendiente ? `Próxima reunión · R${numero}` : todasHechas ? 'Todas las reuniones hechas' : 'No quedan reuniones por hacer'
  const extra = pendiente ? cuando(reunion.lunes, lunesActual) : null
  return (
    <Hoja
      titulo={`Reunión R${numero}`}
      claseDisparador="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-borde bg-superficie p-4 text-left active:bg-superficie-2"
      disparador={
        <>
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${pendiente ? 'bg-progreso/15 text-progreso' : 'bg-superficie-2 text-texto-2'}`}>
            <IconoReunion size={22} />
          </span>
          <span className="block min-w-0 flex-1">
            <span className={`block font-titular text-xs font-medium uppercase tracking-[0.08em] ${pendiente ? 'text-progreso' : 'text-texto-2'}`}>{etiqueta}</span>
            <span className="block font-titular text-lg font-bold uppercase leading-tight tabular-nums">{textoReunionVia(reunion, numero)}</span>
            {extra && <span className="block text-sm text-texto-2">{extra}</span>}
          </span>
          <ChevronRight aria-hidden="true" size={20} className="shrink-0 text-texto-3" />
        </>
      }
    >
      <DetalleReunion reunion={reunion} tests={tests} />
    </Hoja>
  )
}
