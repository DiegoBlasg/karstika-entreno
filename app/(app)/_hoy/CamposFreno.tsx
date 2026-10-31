import type { Freno } from '@/motor'
import { Opciones } from '@/components/ui/Opciones'
import { FRENOS, NOMBRE_FRENO } from '@/lib/nombres'

// Al terminar una sesión al límite: una sola pregunta (P-69) y, aparte, si se encadenó algo. Las dos opcionales.
// La casilla va como las Opciones: el input real encima y transparente, el aspecto en el span.
export function CamposFreno({ freno, encadene }: { freno?: Freno | null; encadene?: boolean }) {
  return (
    <div className="space-y-2">
      <Opciones
        nombre="freno"
        leyenda="¿Qué te frenó hoy?"
        columnas={2}
        opciones={FRENOS.map((f) => ({ valor: f, texto: NOMBRE_FRENO[f] }))}
        {...(freno ? { valor: freno } : {})}
      />
      <label className="relative block">
        <input type="checkbox" name="encadene" defaultChecked={encadene ?? false} className="peer absolute inset-0 cursor-pointer opacity-0" />
        <span className="flex min-h-11 items-center justify-center rounded-xl border border-borde bg-superficie-2 px-2 text-center transition-colors peer-checked:border-cima peer-checked:bg-cima peer-checked:font-bold peer-checked:text-fondo peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-progreso">
          ✓ Hoy encadené algo al límite
        </span>
      </label>
    </div>
  )
}
