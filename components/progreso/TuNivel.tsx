import { fechaCorta, plural } from '@/components/progreso/formato'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import type { NivelLugar, VistaNivel } from '@/lib/escaladas/nivel'
import { NOMBRE_FRENO } from '@/lib/nombres'
import type { Freno } from '@/motor'

const LUGAR = { roca: 'Roca', rocodromo: 'Rocódromo' } as const

// «6b+» y, si el de siempre es mayor que el de los últimos 90 días, «(6c de siempre)».
function Max({ reciente, siempre }: { reciente: string | null; siempre: string | null }) {
  if (siempre === null) return <span className="text-texto-2">—</span>
  return (
    <>
      <span className="font-titular text-xl font-extrabold">{reciente ?? '—'}</span>
      {siempre !== reciente && <span className="text-xs text-texto-2"> ({siempre} de siempre)</span>}
    </>
  )
}

function FilaLugar({ n }: { n: NivelLugar }) {
  return (
    <div className="grid grid-cols-[6rem_1fr_1fr] items-baseline gap-2 py-1">
      <p className="text-sm font-medium">{LUGAR[n.lugar]}</p>
      <p><Max reciente={n.encadenado} siempre={n.encadenadoSiempre} /></p>
      <p><Max reciente={n.aVista} siempre={n.aVistaSiempre} /></p>
    </div>
  )
}

// Tu nivel con lo que apuntas (90 días y de siempre), la distancia al objetivo y los proyectos. Solo informa.
export function TuNivel({ v, encadenes, ultimoFreno }: { v: VistaNivel; encadenes: number; ultimoFreno: Freno | null }) {
  const { objetivo } = v
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
        {objetivo.desde === 'perfil'
          ? 'Grado actual según tu perfil: apunta tus encadenes y saldrá de lo que escalas.'
          : `Tu mejor vía encadenada en ${objetivo.desde === 'roca' ? 'roca' : 'rocódromo'}.`}
        {objetivo.faltan !== null && objetivo.faltan > 0 && ` Objetivo ${objetivo.grado} en roca: te faltan ${plural(objetivo.faltan, 'grado', 'grados')}.`}
        {objetivo.faltan === 0 && ` Ya estás en tu objetivo de ${objetivo.grado}.`}
      </p>
      {objetivo.faltan !== null && objetivo.faltan > 0 && (
        <p className="text-xs text-texto-2">Cada «+» cuenta como un grado: de 6b a 7a hay 4.</p>
      )}
      {v.vias.length > 0 && (
        <div className="border-t border-borde pt-2">
          <div className="grid grid-cols-[6rem_1fr_1fr] gap-2 text-xs text-texto-2">
            <span>Vías · 90 días</span><span>Encadenado</span><span>A vista o flash</span>
          </div>
          {v.vias.map((n) => <FilaLugar key={n.lugar} n={n} />)}
        </div>
      )}
      {v.bloque && <p className="text-sm">Bloque · 90 días: <span className="font-titular text-xl font-extrabold">{v.bloque}</span> encadenado</p>}
      {(v.abiertos.length > 0 || v.encadenados.length > 0) && (
        <div className="space-y-1 border-t border-borde pt-2">
          <p className="text-sm font-medium">Proyectos</p>
          <ul className="space-y-1 text-sm">
            {v.abiertos.map((p) => (
              <li key={`${p.nombre}|${p.tipo}|${p.lugar}`}>
                <span className="font-medium">{p.nombre}</span>{p.grado && ` · ${p.grado}`} · {plural(p.pegues, 'pegue', 'pegues')} · último el {fechaCorta(p.ultimo)}
              </li>
            ))}
            {v.encadenados.map((p) => (
              <li key={`${p.nombre}|${p.tipo}|${p.lugar}`} className="text-progreso">
                <span className="font-medium">{p.nombre}</span>{p.grado && ` · ${p.grado}`} · encadenado el {fechaCorta(p.encadenado!)} en {plural(p.pegues, 'pegue', 'pegues')}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm text-texto-2">
        <span className="font-medium text-texto">{plural(encadenes, 'encadene', 'encadenes')}</span> al límite
        {ultimoFreno && <><br />Lo último que te frenó: {NOMBRE_FRENO[ultimoFreno]}</>}
      </p>
    </Tarjeta>
  )
}
