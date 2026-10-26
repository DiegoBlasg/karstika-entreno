import type { Hallazgo } from './tipos'

// Se añade un import por bloque a medida que se investiga (tareas 2–10).
export const todos: Hallazgo[] = []

export const porId = (id: string): Hallazgo | undefined => todos.find((h) => h.id === id)
