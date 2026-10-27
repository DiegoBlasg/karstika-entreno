// Comprueba contra la base de pruebas que las restricciones rechazan datos fuera de rango y aceptan los válidos.
// Uso: npm run migrar:pruebas && npm run probar-bd
import { sqlPruebas, vaciar } from './base-pruebas.ts'

const sql = await sqlPruebas()
await vaciar(sql)
const S1 = '00000000-0000-4000-8000-000000000001'
const sesion = (id: string, fecha: string) => JSON.stringify({ id, tipo: 'tecnica', intensidad: 'suave', fecha, horaInicio: 19, duracionMin: 60 })

// Datos válidos de base (si algo de esto falla, el esquema está mal).
await sql`insert into perfil (peso_kg, anos_escalando, grado_actual, grado_objetivo, inicio_temporada, objetivo_temporada)
  values (70, 1.5, '6b', '7a', '2026-11-02', '2027-10-04')`
await sql`insert into sesiones (id, fecha, sesion, origen) values (${S1}, '2026-11-03', ${sesion(S1, '2026-11-03')}::jsonb, 'libre')`
await sql`insert into evaluaciones (fecha, peso_corporal_kg, lastre_kg) values ('2026-11-04', 70, 10)`
await sql`insert into chequeos (fecha, sueno, fatiga, ganas, molestias) values ('2026-11-03', 3, 3, 3, ${JSON.stringify([{ zona: 'dedos', dolor: 2 }])}::jsonb)`

const S2 = '00000000-0000-4000-8000-000000000002'
const casos: [string, () => Promise<unknown>][] = [
  ['segundo perfil', () => sql`insert into perfil (id, peso_kg, anos_escalando, grado_actual, grado_objetivo, inicio_temporada, objetivo_temporada) values (2, 70, 1, '6b', '7a', '2026-11-02', '2027-10-04')`],
  ['peso de 10 kg', () => sql`update perfil set peso_kg = 10`],
  ['objetivo antes del inicio', () => sql`update perfil set objetivo_temporada = '2026-01-01'`],
  ['evaluación repetida el mismo día', () => sql`insert into evaluaciones (fecha, peso_corporal_kg, lastre_kg) values ('2026-11-04', 70, 12)`],
  ['técnica 8', () => sql`insert into evaluaciones (fecha, peso_corporal_kg, lastre_kg, tecnica) values ('2026-11-05', 70, 10, 8)`],
  ['sesión cuyo JSON no lleva su id', () => sql`insert into sesiones (id, fecha, sesion, origen) values (${S2}, '2026-11-03', ${sesion(S1, '2026-11-03')}::jsonb, 'libre')`],
  ['sesión cuyo JSON no lleva su fecha', () => sql`insert into sesiones (id, fecha, sesion, origen) values (${S2}, '2026-11-04', ${sesion(S2, '2026-11-03')}::jsonb, 'libre')`],
  ['sesión propuesta sin propuesta', () => sql`insert into sesiones (id, fecha, sesion, origen) values (${S2}, '2026-11-03', ${sesion(S2, '2026-11-03')}::jsonb, 'propuesta')`],
  ['registro con RPE 11', () => sql`insert into registros (sesion_id, rpe, duracion_min) values (${S1}, 11, 60)`],
  ['registro de 0 minutos', () => sql`insert into registros (sesion_id, rpe, duracion_min) values (${S1}, 5, 0)`],
  ['molestia con dolor 11', () => sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${S1}, 5, 60, ${JSON.stringify([{ zona: 'dedos', dolor: 11 }])}::jsonb)`],
  ['molestia de zona desconocida', () => sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${S1}, 5, 60, ${JSON.stringify([{ zona: 'rodilla', dolor: 2 }])}::jsonb)`],
  ['segundo chequeo el mismo día', () => sql`insert into chequeos (fecha, sueno, fatiga, ganas) values ('2026-11-03', 4, 4, 4)`],
  ['chequeo con sueño 6', () => sql`insert into chequeos (fecha, sueno, fatiga, ganas) values ('2026-11-04', 6, 3, 3)`],
  ['alta de zona desconocida', () => sql`insert into altas (zona, fecha) values ('rodilla', '2026-11-03')`],
  ['intento encadenado con motivo', () => sql`insert into intentos_limite (sesion_id, fecha, encadenado, motivo_caida) values (${S1}, '2026-11-03', true, 'bombeo')`],
  ['intento con motivo desconocido', () => sql`insert into intentos_limite (sesion_id, fecha, encadenado, motivo_caida) values (${S1}, '2026-11-03', false, 'lluvia')`],
]

const aceptados: string[] = []
for (const [nombre, consulta] of casos) {
  try {
    await consulta()
    aceptados.push(nombre)
  } catch {
    // rechazado: es lo esperado
  }
}

// Un registro válido sí entra, y borrar la sesión lo borra en cascada.
await sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${S1}, 5, 60, ${JSON.stringify([{ zona: 'dedos', dolor: 2, alarma: true }])}::jsonb)`
await sql`delete from sesiones where id = ${S1}`
const [quedan] = await sql`select count(*)::int as n from registros`
await vaciar(sql)

if (aceptados.length > 0 || quedan?.n !== 0) {
  console.error('La base de datos aceptó datos que debía rechazar:', aceptados, 'registros sin sesión:', quedan?.n)
  process.exit(1)
}
console.log(`base de datos correcta: ${casos.length} casos rechazados`)
