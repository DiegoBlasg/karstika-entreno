// Opciones excluyentes como botones táctiles (≥ 44 px). El radio real va encima y transparente: el toque llega al input,
// que sigue siendo un radio normal (teclado, formularios, Playwright `check()` sin `force`).
export function Opciones({ nombre, leyenda, opciones, valor, onCambio, requerido, columnas }: {
  nombre: string
  leyenda: string
  opciones: readonly { valor: string; texto: string }[]
  valor?: string
  onCambio?: (valor: string) => void
  requerido?: boolean
  columnas?: 2 | 3
}) {
  const cols = columnas ?? Math.min(opciones.length, 3)
  const controlado = onCambio !== undefined
  return (
    <fieldset className="space-y-1.5">
      <legend className="font-medium">{leyenda}</legend>
      <div className={`grid gap-1.5 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {opciones.map((o) => (
          <label key={o.valor} className="relative block">
            <input
              type="radio" name={nombre} value={o.valor} required={requerido} className="peer absolute inset-0 cursor-pointer opacity-0"
              {...(controlado ? { checked: valor === o.valor, onChange: () => onCambio(o.valor) } : { defaultChecked: valor === o.valor })}
            />
            <span className="flex min-h-11 items-center justify-center rounded-xl border border-borde bg-superficie-2 px-2 text-center transition-colors peer-checked:border-progreso peer-checked:bg-progreso peer-checked:font-bold peer-checked:text-fondo peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-progreso">
              {o.texto}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
