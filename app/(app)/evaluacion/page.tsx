import { fuerzaRelativa } from '@/motor'
import { TARJETA } from '@/components/estilos'
import { evaluacionMotor } from '@/lib/datos/mapeo'
import { ahoraMadrid, fechaLarga } from '@/lib/fecha'
import { requerirDatos } from '@/lib/servidor/consultas'
import { borrarEvaluacion } from './acciones'
import { FormularioEvaluacion } from './FormularioEvaluacion'

export default async function PaginaEvaluacion() {
  const { datos } = await requerirDatos()
  const hoy = ahoraMadrid(new Date()).fecha
  const lista = [...datos.evaluaciones].reverse()
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Evaluación</h1>
      <section className={TARJETA}>
        <h2 className="font-medium">Nuevo resultado</h2>
        <FormularioEvaluacion hoy={hoy} peso={datos.perfil.peso_kg} />
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">Historial</h2>
        {lista.length === 0 && <p className="text-sm text-stone-600">Todavía no hay tests. El entrenador te propondrá el primero.</p>}
        <ul className="space-y-2">
          {lista.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded border border-stone-200 bg-white p-3 text-sm">
              <div>
                <p className="font-medium">{fechaLarga(e.fecha)}</p>
                <p>
                  Lastre {e.lastre_kg} kg con {e.peso_corporal_kg} kg · {fuerzaRelativa(evaluacionMotor(e)).toFixed(1)} % del peso
                  {e.resistencia_s !== null ? ` · resistencia ${e.resistencia_s} s` : ''}
                  {e.tecnica !== null ? ` · técnica ${e.tecnica}` : ''}
                </p>
              </div>
              <form action={borrarEvaluacion}>
                <input type="hidden" name="id" value={e.id} />
                <button className="text-red-700">Borrar</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
