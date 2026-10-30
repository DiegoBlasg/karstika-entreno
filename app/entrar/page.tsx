import { FormularioEntrar } from './FormularioEntrar'

export default function PaginaEntrar() {
  return (
    <main className="mx-auto max-w-sm px-4 pt-[max(4rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <h1 className="mb-6 text-2xl font-semibold">Karstika Entreno</h1>
      <FormularioEntrar />
    </main>
  )
}
