import { redirect } from 'next/navigation'

// «Preparar sesión» ya no existe: los entrenos se generan desde Semana (o desde Hoy). Los enlaces antiguos van allí.
export default function PaginaEntrenar(): never {
  redirect('/semana')
}
