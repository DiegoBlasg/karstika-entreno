import Link from 'next/link'
import { fuerzaRelativa } from '@/motor'
import { TARJETA } from '@/components/estilos'
import { testsSinResultado } from '@/lib/datos/hoy'
import { evaluacionMotor } from '@/lib/datos/mapeo'
import { ahoraMadrid, fechaLarga } from '@/lib/fecha'
import { requerirDatos } from '@/lib/servidor/consultas'
import { BotonBorrarEvaluacion } from './BotonBorrarEvaluacion'
import { FormularioEvaluacion } from './FormularioEvaluacion'

export default async function PaginaEvaluacion() {
  const { datos } = await requerirDatos()
  const hoy = ahoraMadrid(new Date()).fecha
  const lista = [...datos.evaluaciones].reverse()
  const fechaInicial = testsSinResultado(datos, hoy).at(-1) ?? hoy
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Progreso</h1>
      <p className="text-sm text-texto-2">
        Aquí se apunta el resultado del test de dedos <strong>después</strong> de hacerlo. ¿Aún no lo has hecho? No pasa
        nada: el entrenador te lo propondrá cuando toque. <Link href="/entrenar" className="underline">Ir a Entrenar</Link>
      </p>
      <section className={TARJETA}>
        <h2 className="font-medium">Nuevo resultado</h2>
        <FormularioEvaluacion hoy={hoy} fechaInicial={fechaInicial} peso={datos.perfil.peso_kg} />
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">Historial</h2>
        {lista.length === 0 && <p className="text-sm text-texto-2">Todavía no hay tests. El entrenador te propondrá el primero.</p>}
        <ul className="space-y-2">
          {lista.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded border border-borde bg-superficie p-3 text-sm">
              <div>
                <p className="font-medium">{fechaLarga(e.fecha)}</p>
                <p>
                  Lastre {e.lastre_kg} kg con {e.peso_corporal_kg} kg · {fuerzaRelativa(evaluacionMotor(e)).toFixed(1)} % del peso
                  {e.resistencia_s !== null ? ` · resistencia ${e.resistencia_s} s` : ''}
                  {e.tecnica !== null ? ` · técnica ${e.tecnica}` : ''}
                </p>
              </div>
              <BotonBorrarEvaluacion id={e.id} fecha={e.fecha} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
