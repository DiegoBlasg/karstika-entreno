import Link from 'next/link'
import { Dibujo } from '@/components/dibujos'
import { Aviso } from '@/components/ui/Aviso'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { FICHA_IDS, GRUPOS, fichaDe } from '@/lib/biblioteca/fichas'
import { basesDeParametros } from '@/lib/fuentes'
import { piezasMaterial } from '@/components/biblioteca/material'

// Las fichas son texto fijo: se generan en el build (un id desconocido se pinta al pedirlo, con «no encontrado»).
export function generateStaticParams() {
  return FICHA_IDS.map((id) => ({ id }))
}

export default async function PaginaFicha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let f: ReturnType<typeof fichaDe>
  try {
    f = fichaDe(decodeURIComponent(id))
  } catch {
    f = undefined // URL mal formada (p. ej. «%E0»)
  }
  if (!f) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Ejercicio no encontrado</h1>
        <Link href="/biblioteca" className="inline-flex min-h-11 items-center text-progreso underline">Ver la biblioteca</Link>
      </div>
    )
  }
  const bases = basesDeParametros(f.parametros)
  const grupo = GRUPOS.find((g) => (g.fichas as readonly string[]).includes(f.id))
  const material = piezasMaterial(f.material)
  const PLEGABLE = 'group rounded-2xl border border-borde bg-superficie'
  const RESUMEN = 'flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progreso [&::-webkit-details-marker]:hidden'
  const FLECHA = <span aria-hidden className="text-xl text-texto-2 transition-transform group-open:rotate-90">›</span>
  return (
    <div className="space-y-4 text-sm">
      <Link href="/biblioteca" className="inline-flex min-h-11 items-center text-texto-2">‹ Biblioteca</Link>
      {f.dibujo && (
        <div className="flex justify-center rounded-2xl border border-borde bg-superficie p-4">
          <Dibujo id={f.dibujo} className="text-texto" />
        </div>
      )}
      <div className="space-y-2">
        {grupo && <Etiqueta>{grupo.titulo}</Etiqueta>}
        <h1 className="font-titular text-3xl font-extrabold uppercase leading-none">{f.titulo}</h1>
        <p className="text-texto-2">{f.paraQue}</p>
        <ul aria-label="Material" className="flex flex-wrap gap-1.5">
          {material.map((m) => <li key={m} className="rounded-full bg-superficie-2 px-3 py-1 text-xs">{m}</li>)}
        </ul>
      </div>
      <section className="space-y-2">
        <Etiqueta as="h2">Cómo se hace</Etiqueta>
        <ol className="space-y-2">
          {f.pasos.map((p, i) => (
            <li key={p} className="flex gap-3">
              <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-progreso text-xs font-bold text-fondo">{i + 1}</span>
              <span className="min-w-0 flex-1">{p}</span>
            </li>
          ))}
        </ol>
      </section>
      <Aviso tono="ambar">
        <h2 className="font-titular font-bold uppercase text-ambar">Cuándo parar</h2>
        <ul className="mt-1 ml-4 list-disc space-y-1">
          {f.paraSi.map((e) => <li key={e}>{e}</li>)}
        </ul>
      </Aviso>
      <details className={PLEGABLE}>
        <summary className={RESUMEN}>
          <h2 className="font-medium">Errores típicos</h2>
          {FLECHA}
        </summary>
        <ul className="ml-4 list-disc space-y-1 px-4 pb-4 pl-8">
          {f.errores.map((e) => <li key={e}>{e}</li>)}
        </ul>
      </details>
      {bases.length > 0 && (
        <details className={PLEGABLE}>
          <summary className={RESUMEN}>
            <h2 className="font-medium">Por qué se hace</h2>
            {FLECHA}
          </summary>
          <ul className="space-y-2 px-4 pb-4">
            {bases.map((b) => (
              <li key={b.parametro}>
                {b.titulo} · <span className="text-texto-2">{b.nivelTexto}</span>
                {b.estudios.length > 0 && (
                  <ul className="ml-3 list-disc text-xs">
                    {b.estudios.map((e) => (
                      <li key={e.id}>
                        {e.url ? (
                          <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-progreso underline">{e.cita}</a>
                        ) : (
                          e.cita
                        )}
                        {' · '}
                        <Link href={`/fuentes/${e.id}`} className="text-progreso underline">detalle</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
