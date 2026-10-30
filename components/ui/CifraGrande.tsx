const SENTIDO = { sube: { simbolo: '▲', clase: 'text-progreso' }, baja: { simbolo: '▼', clase: 'text-ambar' }, igual: { simbolo: '=', clase: 'text-texto-2' } } as const

export function CifraGrande({ valor, unidad, delta }: { valor: string; unidad?: string; delta?: { texto: string; sentido: keyof typeof SENTIDO } }) {
  return (
    <p className="flex items-baseline gap-2">
      <span className="font-titular text-5xl font-extrabold leading-none tabular-nums">{valor}</span>
      {unidad && <span className="font-titular text-lg text-texto-2">{unidad}</span>}
      {delta && (
        <span className={`font-titular text-lg ${SENTIDO[delta.sentido].clase}`}>
          <span aria-hidden="true">{SENTIDO[delta.sentido].simbolo} </span>
          {delta.texto}
        </span>
      )}
    </p>
  )
}
