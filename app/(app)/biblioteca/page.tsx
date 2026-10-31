import { ListaBiblioteca } from '@/components/biblioteca/ListaBiblioteca'

export default function PaginaBiblioteca() {
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <h1 className="font-titular text-4xl font-extrabold uppercase leading-none">Biblioteca</h1>
        <p className="text-texto-2">Cómo se hace cada ejercicio que te propone el entrenador.</p>
      </div>
      <ListaBiblioteca />
    </div>
  )
}
