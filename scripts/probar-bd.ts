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
  ['molestia con dolor no numérico', () => sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${S1}, 5, 60, ${JSON.stringify([{ zona: 'dedos', dolor: 'x' }])}::jsonb)`],
  ['molestia con zona que no es texto', () => sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${S1}, 5, 60, ${JSON.stringify([{ zona: 5, dolor: 2 }])}::jsonb)`],
  ['molestia de zona desconocida', () => sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${S1}, 5, 60, ${JSON.stringify([{ zona: 'rodilla', dolor: 2 }])}::jsonb)`],
  ['segundo chequeo el mismo día', () => sql`insert into chequeos (fecha, sueno, fatiga, ganas) values ('2026-11-03', 4, 4, 4)`],
  ['chequeo con sueño 6', () => sql`insert into chequeos (fecha, sueno, fatiga, ganas) values ('2026-11-04', 6, 3, 3)`],
  ['alta de zona desconocida', () => sql`insert into altas (zona, fecha) values ('rodilla', '2026-11-03')`],
  ['intento encadenado con motivo', () => sql`insert into intentos_limite (sesion_id, fecha, encadenado, motivo_caida) values (${S1}, '2026-11-03', true, 'bombeo')`],
  ['intento con motivo desconocido', () => sql`insert into intentos_limite (sesion_id, fecha, encadenado, motivo_caida) values (${S1}, '2026-11-03', false, 'lluvia')`],
  ['hueco a las 24:00', () => sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos) values (${S2}, '2026-11-03', 1440, 'solo', 'casa', 60)`],
  ['hueco de 5 minutos', () => sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos) values (${S2}, '2026-11-03', 540, 'solo', 'casa', 5)`],
  ['hueco de 601 minutos', () => sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos) values (${S2}, '2026-11-03', 0, 'solo', 'casa', 601)`],
  ['hueco que cruza la medianoche', () => sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos) values (${S2}, '2026-11-03', 1400, 'solo', 'casa', 60)`],
  ['hueco con compañía desconocida', () => sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos) values (${S2}, '2026-11-03', 540, 'pareja', 'casa', 60)`],
  ['hueco con lugar desconocido', () => sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos) values (${S2}, '2026-11-03', 540, 'solo', 'playa', 60)`],
]

// Solo cuenta como rechazo una violación de restricción: 23514 (check) o 23505 (unique).
// Cualquier otro error (sintaxis, columna inexistente, conexión...) es un fallo del propio caso.
const VIOLACIONES = new Set(['23514', '23505'])
const aceptados: string[] = []
const inesperados: [string, unknown][] = []
for (const [nombre, consulta] of casos) {
  try {
    await consulta()
    aceptados.push(nombre)
  } catch (e) {
    const code = (e as { code?: string } | null)?.code
    if (!code || !VIOLACIONES.has(code)) inesperados.push([nombre, e])
  }
}

// Un registro válido sí entra, y borrar la sesión lo borra en cascada.
await sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${S1}, 5, 60, ${JSON.stringify([{ zona: 'dedos', dolor: 2, alarma: true }])}::jsonb)`
await sql`delete from sesiones where id = ${S1}`
const [quedan] = await sql`select count(*)::int as n from registros`
await vaciar(sql)

if (inesperados.length > 0) {
  for (const [nombre, e] of inesperados) console.error(`Caso «${nombre}» falló con un error que no es una violación de restricción:`, e)
}
if (aceptados.length > 0) console.error('La base de datos aceptó datos que debía rechazar:', aceptados)
if (quedan?.n !== 0) console.error('registros sin sesión:', quedan?.n)
if (aceptados.length > 0 || inesperados.length > 0 || quedan?.n !== 0) process.exit(1)
console.log(`base de datos correcta: ${casos.length} casos rechazados`)
