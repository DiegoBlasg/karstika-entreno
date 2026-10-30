import type { ResultadoTest } from '@/lib/datos/via'
import { cifra, fechaCorta } from './formato'

// Evolución de la fuerza de dedos (% del peso): una serie, un punto por test, el último destacado. SVG propio que escala
// al ancho con viewBox (el texto escala con él: con ~360 px de ancho, 11 unidades ≈ 12 px). Solo con ≥ 2 tests.
const ANCHO = 320
const ALTO = 124
const IZQ = 40 // hueco para las etiquetas del eje Y
const DER = 12
const ARRIBA = 10
const ABAJO = 100 // base del área de dibujo; debajo van las fechas

function escalaY(valores: number[]): { lo: number; hi: number } {
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const rango = max - min
  const paso = rango <= 8 ? 2 : rango <= 20 ? 5 : 10
  let lo = Math.floor(min / paso) * paso
  let hi = Math.ceil(max / paso) * paso
  if (hi === lo) { lo -= paso; hi += paso }
  return { lo, hi }
}

export function resumenFuerza(tests: readonly ResultadoTest[]): string {
  const a = tests[0]!
  const b = tests.at(-1)!
  const dif = b.fuerzaRelativa - a.fuerzaRelativa
  const signo = dif > 0 ? '+' : dif < 0 ? '−' : ''
  return `De ${cifra(a.fuerzaRelativa)} % el ${fechaCorta(a.fecha)} a ${cifra(b.fuerzaRelativa)} % el ${fechaCorta(b.fecha)}: ${signo}${cifra(Math.abs(dif))} puntos`
}

export function GraficaFuerza({ tests }: { tests: ResultadoTest[] }) {
  if (tests.length < 2) return null
  const { lo, hi } = escalaY(tests.map((t) => t.fuerzaRelativa))
  const dias = tests.map((t) => Date.parse(`${t.fecha}T12:00:00Z`))
  const t0 = dias[0]!
  const t1 = dias.at(-1)!
  const x = (i: number): number =>
    IZQ + (t1 > t0 ? (dias[i]! - t0) / (t1 - t0) : i / (tests.length - 1)) * (ANCHO - IZQ - DER)
  const y = (v: number): number => ABAJO - ((v - lo) / (hi - lo)) * (ABAJO - ARRIBA)
  const puntos = tests.map((t, i) => [x(i), y(t.fuerzaRelativa)] as const)
  const primero = puntos[0]!
  const linea = puntos.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
  const area = `${linea} L${puntos.at(-1)![0].toFixed(1)},${ABAJO} L${primero[0].toFixed(1)},${ABAJO} Z`
  const rejilla = [hi, (lo + hi) / 2, lo]
  const ultimo = puntos.at(-1)!
  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="block h-auto w-full overflow-visible" role="img" aria-label={resumenFuerza(tests)}>
        {rejilla.map((v, i) => (
          <g key={v}>
            <line x1={IZQ} x2={ANCHO - DER} y1={y(v)} y2={y(v)} className="stroke-borde" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {i !== 1 && (
              <text x={IZQ - 6} y={y(v)} dy="0.35em" textAnchor="end" className="fill-texto-2 text-[11px] tabular-nums">
                {cifra(v)} %
              </text>
            )}
          </g>
        ))}
        <path d={area} className="fill-progreso" fillOpacity={0.1} />
        <path d={linea} fill="none" className="stroke-progreso" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {puntos.slice(0, -1).map(([px, py], i) => (
          <g key={tests[i]!.fecha + i}>
            <circle cx={px} cy={py} r={4} className="fill-progreso stroke-superficie" strokeWidth={2} />
            <circle cx={px} cy={py} r={12} fill="transparent">
              <title>{`${fechaCorta(tests[i]!.fecha)}: ${cifra(tests[i]!.fuerzaRelativa)} %`}</title>
            </circle>
          </g>
        ))}
        <circle cx={ultimo[0]} cy={ultimo[1]} r={8} fill="none" className="stroke-progreso" strokeWidth={2} />
        <circle cx={ultimo[0]} cy={ultimo[1]} r={4.5} className="fill-progreso stroke-superficie" strokeWidth={2}>
          <title>{`${fechaCorta(tests.at(-1)!.fecha)}: ${cifra(tests.at(-1)!.fuerzaRelativa)} % (último)`}</title>
        </circle>
        <text x={primero[0]} y={ALTO - 4} textAnchor="start" className="fill-texto-2 text-[11px]">{fechaCorta(tests[0]!.fecha)}</text>
        <text x={ultimo[0]} y={ALTO - 4} textAnchor="end" className="fill-texto-2 text-[11px]">{fechaCorta(tests.at(-1)!.fecha)}</text>
      </svg>
      <ul className="sr-only">
        {tests.map((t, i) => (
          <li key={t.fecha + i}>{`${fechaCorta(t.fecha)}: ${cifra(t.fuerzaRelativa)} % del peso`}</li>
        ))}
      </ul>
    </figure>
  )
}
