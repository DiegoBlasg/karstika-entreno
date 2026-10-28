import { redirect } from 'next/navigation'
import type {
  DatosAtleta, FilaAlta, FilaChequeo, FilaConsejo, FilaEvaluacion, FilaHueco, FilaIntento, FilaPerfil, FilaRegistro, FilaSesion, PerfilNuevo,
} from '../datos/filas'
import { bd, type Sql } from './bd'

// Una sola transacción de lectura para tener una foto coherente. Fechas como texto 'AAAA-MM-DD'.
export async function cargarDatos(sql: Sql): Promise<DatosAtleta | null> {
  const [perfil, evaluaciones, sesiones, registros, chequeos, altas, consejos, intentos, huecos] = await sql.transaction(
    [
      sql`select peso_kg, anos_escalando, lesiones, grado_actual, grado_objetivo, inicio_temporada::text as inicio_temporada,
            objetivo_temporada::text as objetivo_temporada, aviso_aceptado_en::text as aviso_aceptado_en from perfil where id = 1`,
      sql`select id::text as id, fecha::text as fecha, peso_corporal_kg, lastre_kg, resistencia_s, tecnica from evaluaciones order by fecha`,
      sql`select id::text as id, fecha::text as fecha, sesion, propuesta, origen from sesiones order by fecha, creada_en`,
      sql`select sesion_id::text as sesion_id, rpe, duracion_min, molestias, registrado_en::text as registrado_en from registros`,
      sql`select fecha::text as fecha, sueno, fatiga, ganas, molestias from chequeos order by fecha`,
      sql`select id::text as id, zona, fecha::text as fecha from altas order by fecha, creada_en`,
      sql`select consejo_id, fecha::text as fecha from consejos_mostrados order by fecha`,
      sql`select id::text as id, sesion_id::text as sesion_id, fecha::text as fecha, encadenado, motivo_caida from intentos_limite order by fecha`,
      sql`select id::text as id, fecha::text as fecha, inicio_min, compania, lugar, minutos from huecos order by fecha, inicio_min`,
    ],
    { readOnly: true },
  )
  const filaPerfil = perfil?.[0] as FilaPerfil | undefined
  if (!filaPerfil) return null
  return {
    perfil: filaPerfil,
    evaluaciones: evaluaciones as FilaEvaluacion[],
    sesiones: sesiones as FilaSesion[],
    registros: registros as FilaRegistro[],
    chequeos: chequeos as FilaChequeo[],
    altas: altas as FilaAlta[],
    consejos: consejos as FilaConsejo[],
    intentos: intentos as FilaIntento[],
    huecos: huecos as FilaHueco[],
  }
}

export async function requerirDatos(): Promise<{ sql: Sql; datos: DatosAtleta }> {
  const sql = await bd()
  const datos = await cargarDatos(sql)
  if (!datos) redirect('/perfil')
  return { sql, datos }
}

export async function guardarPerfilBd(sql: Sql, f: PerfilNuevo): Promise<void> {
  await sql`insert into perfil (id, peso_kg, anos_escalando, lesiones, grado_actual, grado_objetivo, inicio_temporada, objetivo_temporada)
    values (1, ${f.peso_kg}, ${f.anos_escalando}, ${f.lesiones}, ${f.grado_actual}, ${f.grado_objetivo}, ${f.inicio_temporada}, ${f.objetivo_temporada})
    on conflict (id) do update set peso_kg = excluded.peso_kg, anos_escalando = excluded.anos_escalando, lesiones = excluded.lesiones,
      grado_actual = excluded.grado_actual, grado_objetivo = excluded.grado_objetivo,
      inicio_temporada = excluded.inicio_temporada, objetivo_temporada = excluded.objetivo_temporada`
}

export async function insertarEvaluacion(sql: Sql, e: FilaEvaluacion): Promise<void> {
  await sql`insert into evaluaciones (id, fecha, peso_corporal_kg, lastre_kg, resistencia_s, tecnica)
    values (${e.id}, ${e.fecha}, ${e.peso_corporal_kg}, ${e.lastre_kg}, ${e.resistencia_s}, ${e.tecnica})`
}

export async function borrarEvaluacionBd(sql: Sql, id: string): Promise<void> {
  await sql`delete from evaluaciones where id = ${id}`
}

export async function guardarChequeo(sql: Sql, c: FilaChequeo): Promise<void> {
  await sql`insert into chequeos (fecha, sueno, fatiga, ganas, molestias)
    values (${c.fecha}, ${c.sueno}, ${c.fatiga}, ${c.ganas}, ${JSON.stringify(c.molestias)}::jsonb)
    on conflict (fecha) do update set sueno = excluded.sueno, fatiga = excluded.fatiga, ganas = excluded.ganas, molestias = excluded.molestias`
}

const consultaSesion = (sql: Sql, f: FilaSesion) =>
  sql`insert into sesiones (id, fecha, sesion, propuesta, origen)
    values (${f.id}, ${f.fecha}, ${JSON.stringify(f.sesion)}::jsonb, ${f.propuesta === null ? null : JSON.stringify(f.propuesta)}::jsonb, ${f.origen})`

export async function insertarSesion(sql: Sql, f: FilaSesion, consejos: FilaConsejo[]): Promise<void> {
  await sql.transaction([
    consultaSesion(sql, f),
    ...consejos.map((c) => sql`insert into consejos_mostrados (consejo_id, fecha) values (${c.consejo_id}, ${c.fecha})`),
  ])
}

export async function insertarConsejos(sql: Sql, consejos: FilaConsejo[]): Promise<void> {
  if (consejos.length === 0) return
  await sql.transaction(consejos.map((c) => sql`insert into consejos_mostrados (consejo_id, fecha) values (${c.consejo_id}, ${c.fecha})`))
}

// Las guardas contra tocar una sesión registrada van en la propia sentencia (no solo en la foto leída antes), para que
// un registro hecho entre medias en otra pestaña no se borre en cascada. Devuelven si se ha hecho el cambio.
export async function borrarSesionBd(sql: Sql, id: string): Promise<boolean> {
  const filas = await sql`delete from sesiones
    where id = ${id} and not exists (select 1 from registros where sesion_id = ${id})
    returning id`
  return filas.length > 0
}

// Una sola sentencia: la nueva solo se inserta si la vieja se ha borrado (y solo se borra si no está registrada).
export async function sustituirSesion(sql: Sql, idViejo: string, nueva: FilaSesion): Promise<boolean> {
  const filas = await sql`with borrada as (
      delete from sesiones where id = ${idViejo} and not exists (select 1 from registros where sesion_id = ${idViejo}) returning id
    )
    insert into sesiones (id, fecha, sesion, propuesta, origen)
    select ${nueva.id}::uuid, ${nueva.fecha}::date, ${JSON.stringify(nueva.sesion)}::jsonb,
      ${nueva.propuesta === null ? null : JSON.stringify(nueva.propuesta)}::jsonb, ${nueva.origen}::text
    where exists (select 1 from borrada)
    returning id`
  return filas.length > 0
}

export async function insertarRegistro(sql: Sql, r: FilaRegistro, intentos: FilaIntento[]): Promise<void> {
  await sql.transaction([
    sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${r.sesion_id}, ${r.rpe}, ${r.duracion_min}, ${JSON.stringify(r.molestias)}::jsonb)`,
    ...intentos.map(
      (i) => sql`insert into intentos_limite (id, sesion_id, fecha, encadenado, motivo_caida) values (${i.id}, ${i.sesion_id}, ${i.fecha}, ${i.encadenado}, ${i.motivo_caida})`,
    ),
  ])
}

// Un entrenamiento no planeado: la sesión, su registro y sus intentos en una transacción.
export async function insertarSesionRegistrada(sql: Sql, f: FilaSesion, r: FilaRegistro, intentos: FilaIntento[]): Promise<void> {
  await sql.transaction([
    consultaSesion(sql, f),
    sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${r.sesion_id}, ${r.rpe}, ${r.duracion_min}, ${JSON.stringify(r.molestias)}::jsonb)`,
    ...intentos.map(
      (i) => sql`insert into intentos_limite (id, sesion_id, fecha, encadenado, motivo_caida) values (${i.id}, ${i.sesion_id}, ${i.fecha}, ${i.encadenado}, ${i.motivo_caida})`,
    ),
  ])
}

// Corrige un registro: actualiza el registro y sustituye todos los intentos de la sesión, en una transacción.
export async function corregirRegistroBd(sql: Sql, r: FilaRegistro, intentos: FilaIntento[]): Promise<void> {
  await sql.transaction([
    sql`update registros set rpe = ${r.rpe}, duracion_min = ${r.duracion_min}, molestias = ${JSON.stringify(r.molestias)}::jsonb
      where sesion_id = ${r.sesion_id}`,
    sql`delete from intentos_limite where sesion_id = ${r.sesion_id}`,
    ...intentos.map(
      (i) => sql`insert into intentos_limite (id, sesion_id, fecha, encadenado, motivo_caida) values (${i.id}, ${i.sesion_id}, ${i.fecha}, ${i.encadenado}, ${i.motivo_caida})`,
    ),
  ])
}

export async function insertarAlta(sql: Sql, a: Omit<FilaAlta, 'id'>): Promise<void> {
  await sql`insert into altas (zona, fecha) values (${a.zona}, ${a.fecha})`
}

// Una transacción con la tabla bloqueada frente a otras escrituras: los topes por semana y por día y el no solaparse
// se comprueban en la propia sentencia, así dos envíos a la vez no se los saltan. Devuelve si se ha insertado.
export async function insertarHueco(
  sql: Sql, f: FilaHueco, lunes: string, topes: { semana: number; dia: number },
): Promise<boolean> {
  const [, filas] = await sql.transaction([
    sql`lock table huecos in share row exclusive mode`,
    sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos)
      select ${f.id}::uuid, ${f.fecha}::date, ${f.inicio_min}::int, ${f.compania}::text, ${f.lugar}::text, ${f.minutos}::int
      where (select count(*) from huecos where fecha between ${lunes}::date and ${lunes}::date + 6) < ${topes.semana}
        and (select count(*) from huecos where fecha = ${f.fecha}::date) < ${topes.dia}
        and not exists (select 1 from huecos where fecha = ${f.fecha}::date
          and inicio_min < ${f.inicio_min + f.minutos}::int and ${f.inicio_min}::int < inicio_min + minutos)
      returning id`,
  ])
  return (filas as unknown[]).length > 0
}

export async function borrarHuecoBd(sql: Sql, id: string): Promise<void> {
  await sql`delete from huecos where id = ${id}`
}
