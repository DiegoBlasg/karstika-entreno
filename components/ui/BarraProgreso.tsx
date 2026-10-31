import { porcentaje } from '@/lib/ui/progreso'

export function BarraProgreso({ valor, etiqueta, color = 'bg-progreso' }: { valor: number; etiqueta: string; color?: string }) {
  const p = porcentaje(valor)
  return (
    <div role="progressbar" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} className="h-1.5 w-full rounded-full bg-pista">
      <div className={`h-1.5 rounded-full ${color} transition-[width] duration-300`} style={{ width: `${p}%` }} />
    </div>
  )
}
