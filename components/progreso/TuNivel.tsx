import { fechaCorta, plural } from '@/components/progreso/formato'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import type { NivelLugar, Proyecto, VistaNivel } from '@/lib/escaladas/nivel'
import { NOMBRE_FRENO } from '@/lib/nombres'
import type { Freno } from '@/motor'

const LUGAR = { roca: 'Roca', rocodromo: 'Rocódromo' } as const

// «6b+» y, debajo, «siempre 6c» si tu mejor de siempre es mayor que el de los últimos 90 días.
function Max({ reciente, siempre }: { reciente: string | null; siempre: string | null }) {
  if (siempre === null) return <span className="text-texto-2">—</span>
  return (
    <>
      <span className="font-titular text-xl font-extrabold">{reciente ?? '—'}</span>
      {siempre !== reciente && <span className="block text-xs text-texto-2">siempre {siempre}</span>}
    </>
  )
}

function FilaLugar({ n }: { n: NivelLugar }) {
  return (
    <tr className="align-top">
      <th scope="row" className="py-1 pr-2 text-left text-sm font-medium">{LUGAR[n.lugar]}</th>
      <td className="py-1 pr-2"><Max reciente={n.encadenado} siempre={n.encadenadoSiempre} /></td>
      <td className="py-1"><Max reciente={n.aVista} siempre={n.aVistaSiempre} /></td>
    </tr>
  )
}

const dondeProyecto = (p: Proyecto): string =>
  `${p.tipo === 'via' ? 'vía' : 'bloque'} en ${p.lugar === 'roca' ? 'roca' : 'rocódromo'}`

// «6b+, 6c, 6c+ y 7a»
const lista = (xs: readonly string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)

// Tu nivel con lo que apuntas (90 días y de siempre), lo que falta hasta el objetivo y los proyectos. Solo informa.
export function TuNivel({ v, encadenes, ultimoFreno }: { v: VistaNivel; encadenes: number; ultimoFreno: Freno | null }) {
  const { objetivo } = v
  const origen = objetivo.desde === 'perfil'
    ? 'Grado actual según tu perfil: apunta tus vías encadenadas y saldrá de lo que escalas.'
    : `Tu mejor vía encadenada en ${objetivo.desde === 'roca' ? 'roca' : 'rocódromo'}.`
  return (
    <Tarjeta aria-label="Tu nivel">
      <Etiqueta as="h2">Tu nivel</Etiqueta>
      <p className="flex items-baseline gap-3 font-titular text-4xl font-extrabold uppercase leading-none">
        <span className="text-texto">{objetivo.actual}</span>
        <span aria-hidden="true" className="text-2xl text-texto-2">→</span>
        <span className="sr-only">hacia</span>
        <span className="text-cima">{objetivo.grado}</span>
      </p>
      <p className="text-sm text-texto-2">
        {origen}
        {objetivo.escalones !== null && objetivo.escalones.length > 0 && ` Hasta tu objetivo te faltan ${lista(objetivo.escalones)}.`}
        {objetivo.escalones !== null && objetivo.escalones.length === 0 && ` Ya estás en tu objetivo de ${objetivo.grado}.`}
      </p>
      {v.vias.length > 0 && (
        <div className="border-t border-borde pt-2">
          <table className="w-full">
            <caption className="pb-1 text-left text-xs text-texto-2">Vías, últimos 90 días (debajo, tu mejor de siempre si es mayor)</caption>
            <thead>
              <tr className="text-left text-xs text-texto-2">
                <th scope="col" className="pr-2 font-normal"><span className="sr-only">Lugar</span></th>
                <th scope="col" className="pr-2 font-normal">Encadenada</th>
                <th scope="col" className="font-normal">A vista o flash</th>
              </tr>
            </thead>
            <tbody>{v.vias.map((n) => <FilaLugar key={n.lugar} n={n} />)}</tbody>
          </table>
        </div>
      )}
      {v.bloque && <p className="text-sm">Bloque, últimos 90 días: <span className="font-titular text-xl font-extrabold">{v.bloque}</span> encadenado</p>}
      {(v.abiertos.length > 0 || v.encadenados.length > 0) && (
        <div className="space-y-1 border-t border-borde pt-2">
          <p className="text-sm font-medium">Proyectos</p>
          <ul className="space-y-1 text-sm">
            {v.abiertos.map((p) => (
              <li key={p.clave}>
                <span className="font-medium">{p.nombre}</span>{p.grado && ` · ${p.grado}`} · {dondeProyecto(p)} · {plural(p.pegues, 'pegue', 'pegues')} · último el {fechaCorta(p.ultimo)}
              </li>
            ))}
            {v.encadenados.map((p) => (
              <li key={`${p.clave}|${p.encadenado}`} className="text-progreso">
                <span className="font-medium">{p.nombre}</span>{p.grado && ` · ${p.grado}`} · encadenado el {fechaCorta(p.encadenado!)} en {plural(p.pegues, 'pegue', 'pegues')}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm text-texto-2">
        <span className="font-medium text-texto">{plural(encadenes, 'sesión', 'sesiones')} con encadene al límite</span>
        {ultimoFreno && <><br />Lo último que te frenó: {NOMBRE_FRENO[ultimoFreno]}</>}
      </p>
    </Tarjeta>
  )
}
