import type { Constancia as DatosConstancia, SemanaCumplida } from '@/lib/datos/progreso'
import { CifraGrande } from '@/components/ui/CifraGrande'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { fechaCorta, plural } from './formato'

const MAX_SEMANAS = 16

// Cada semana es una columna sobre la pista. Doble codificación (color + altura): la no cumplida es un tocón bajo, para que
// no se confunda con la descarga cumplida (lima al 50 %), que con solo el color quedan cerca (validado con la skill dataviz).
function textoSemana(s: SemanaCumplida): string {
  const base = { cumplida: 'cumplida', 'no-cumplida': 'no cumplida', neutra: 'sin sesiones', actual: 'en curso' }[s.estado]
  return `Semana del ${fechaCorta(s.lunes)}: ${base}${s.descarga ? ' (descarga)' : ''}`
}

function Bloque({ s }: { s: SemanaCumplida }) {
  const relleno =
    s.estado === 'cumplida' ? (s.descarga ? 'h-full bg-progreso/50' : 'h-full bg-progreso')
      : s.estado === 'no-cumplida' ? 'h-1/3 bg-ambar/60'
        : null
  return (
    <li title={textoSemana(s)} className={`relative flex h-8 min-w-0 max-w-6 flex-1 items-end overflow-hidden rounded-[4px] ${s.estado === 'actual' ? 'border-2 border-progreso' : 'bg-pista'}`}>
      {relleno && <span aria-hidden="true" className={`block w-full ${relleno}`} />}
      <span className="sr-only">{textoSemana(s)}</span>
    </li>
  )
}

const LEYENDA = [
  { clase: 'bg-progreso', texto: 'Cumplida' },
  { clase: 'bg-progreso/50', texto: 'Descarga cumplida' },
  { clase: 'bg-pista', texto: 'No cumplida', toco: true },
  { clase: 'bg-pista', texto: 'Sin sesiones' },
  { clase: 'border-2 border-progreso', texto: 'Esta semana' },
] as const

export function Constancia({ c }: { c: DatosConstancia }) {
  const visibles = c.semanas.slice(-MAX_SEMANAS)
  const anteriores = c.semanas.length - visibles.length
  const mejor = c.mejorRacha > c.rachaActual
  return (
    <Tarjeta aria-labelledby="titulo-constancia">
      <Etiqueta as="h2"><span id="titulo-constancia">Semanas cumplidas</span></Etiqueta>
      {c.semanas.length === 0 ? (
        <p className="text-sm text-texto-2">Cuando pase la primera semana de la temporada verás aquí cuáles has cumplido.</p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            {c.conSesiones > 0
              ? <CifraGrande valor={String(c.cumplidas)} unidad={`de ${c.conSesiones}`} />
              : <p className="text-sm text-texto-2">Aún no ha terminado ninguna semana con sesiones.</p>}
            <p className="pb-1 text-right text-sm text-texto-2">
              Racha: <span className="font-medium text-texto">{plural(c.rachaActual, 'semana', 'semanas')}</span>
              {mejor && <><br />Mejor racha: {plural(c.mejorRacha, 'semana', 'semanas')}</>}
            </p>
          </div>
          <div className="space-y-1">
            <ol aria-label="Semanas de la temporada" className="flex gap-0.5">
              {visibles.map((s) => <Bloque key={s.lunes} s={s} />)}
            </ol>
            <div className="flex justify-between gap-2 text-xs text-texto-2" style={{ maxWidth: `${visibles.length * 26}px`, minWidth: '10rem' }}>
              <span>{anteriores > 0 ? `+${anteriores} anteriores` : fechaCorta(visibles[0]!.lunes)}</span>
              <span>{visibles.at(-1)!.estado === 'actual' ? 'Esta semana' : fechaCorta(visibles.at(-1)!.lunes)}</span>
            </div>
          </div>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-texto-2" aria-label="Leyenda">
            {LEYENDA.map((l) => (
              <li key={l.texto} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`inline-flex size-3 items-end overflow-hidden rounded-[3px] ${l.clase}`}>
                  {'toco' in l && <span className="block h-1/3 w-full bg-ambar/60" />}
                </span>
                {l.texto}
              </li>
            ))}
          </ul>
          <p className="text-xs text-texto-2">Una semana cuenta como cumplida si registras todas sus sesiones; la de descarga cuenta igual.</p>
        </>
      )}
    </Tarjeta>
  )
}
