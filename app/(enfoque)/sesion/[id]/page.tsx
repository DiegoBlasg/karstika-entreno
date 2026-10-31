import Link from 'next/link'
import { BOTON_SECUNDARIO } from '@/components/estilos'
import { pasosDeSesion } from '@/lib/cronometro/pasos'
import { posicionSiSePuede } from '@/lib/datos/temporada'
import { ahoraMadrid } from '@/lib/fecha'
import { requerirDatos } from '@/lib/servidor/consultas'
import { Cronometro } from './Cronometro'
import { YaRegistrada } from './YaRegistrada'

// Cronómetro de una sesión: solo de hoy, aceptada (con plan) y sin registrar. Se comprueba aquí, en el servidor.
export default async function PaginaSesion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { datos } = await requerirDatos()
  const hoy = ahoraMadrid(new Date()).fecha
  const fila = datos.sesiones.find((s) => s.id === id)
  const motivo = !fila
    ? 'Esa sesión no existe.'
    : fila.fecha !== hoy
      ? 'El cronómetro solo está disponible para las sesiones de hoy.'
      : !fila.propuesta
        ? 'Esta sesión no tiene plan: es lo que apuntaste que hiciste.'
        : null
  if (!motivo && datos.registros.some((r) => r.sesion_id === id)) return <YaRegistrada id={id} />
  if (motivo || !fila?.propuesta) {
    return (
      <div className="space-y-4">
        <p className="text-lg">{motivo}</p>
        <Link href="/" className={`${BOTON_SECUNDARIO} w-full`}>Volver a Hoy</Link>
      </div>
    )
  }
  const molestias = datos.chequeos.find((c) => c.fecha === hoy)?.molestias ?? []
  // Peso del test: el de la última evaluación o, si no hay, el del perfil.
  const pesoInicial = datos.evaluaciones.at(-1)?.peso_corporal_kg ?? datos.perfil.peso_kg
  return <Cronometro plan={fila.propuesta} pasos={pasosDeSesion(fila.propuesta)} molestiasChequeo={molestias} hoy={hoy} pesoInicial={pesoInicial}
    evaluacionHoy={datos.evaluaciones.some((e) => e.fecha === hoy)} posicion={posicionSiSePuede(datos, hoy)} />
}
