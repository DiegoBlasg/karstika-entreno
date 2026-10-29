import Link from 'next/link'
import { porId } from '@/evidencia'
import { NIVEL_TEXTO } from '@/lib/fuentes'

const METODO: Record<'fuente-primaria' | 'resumen', string> = {
  'fuente-primaria': 'texto completo',
  resumen: 'solo resumen',
}

export default async function PaginaFuente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const h = porId(decodeURIComponent(id))
  if (!h) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Estudio no encontrado</h1>
        <Link href="/" className="text-sky-800 underline">Volver a Hoy</Link>
      </div>
    )
  }
  const aplica = [
    h.aplicaA.nivel && `Nivel: ${h.aplicaA.nivel}`,
    h.aplicaA.experiencia && `Experiencia: ${h.aplicaA.experiencia}`,
    h.aplicaA.objetivo && `Objetivo: ${h.aplicaA.objetivo}`,
  ].filter(Boolean) as string[]
  return (
    <div className="space-y-4 text-sm">
      <h1 className="text-xl font-semibold">{h.id}</h1>
      <p>{h.afirmacion}</p>
      <p className="text-stone-600">{NIVEL_TEXTO[h.nivel]}</p>
      <section>
        <h2 className="font-medium">Fuentes</h2>
        <ul className="mt-1 space-y-2">
          {h.fuentes.map((f, i) => (
            <li key={i}>
              {f.autores} ({f.anio}). {f.titulo}. <em>{f.publicacion}</em>.{' '}
              {f.doi ? (
                <a href={`https://doi.org/${f.doi}`} target="_blank" rel="noopener noreferrer" className="text-sky-800 underline break-all">
                  doi:{f.doi}
                </a>
              ) : f.url ? (
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-sky-800 underline break-all">enlace</a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-medium">A quién se aplica</h2>
        {aplica.length > 0 ? (
          <ul className="mt-1 list-disc ml-4">{aplica.map((a) => <li key={a}>{a}</li>)}</ul>
        ) : (
          <p>Sin restricciones indicadas.</p>
        )}
      </section>
      <section>
        <h2 className="font-medium">Limitaciones</h2>
        <p>{h.limitaciones}</p>
      </section>
      <p className="text-xs text-stone-500">Verificada el {h.verificada.fecha} con {METODO[h.verificada.metodo]}.</p>
      <Link href="/" className="text-sky-800 underline">Volver a Hoy</Link>
    </div>
  )
}
