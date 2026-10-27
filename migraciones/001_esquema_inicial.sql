-- Karstika Entreno: esquema inicial (un único usuario, sin user_id).

create table perfil (
  id smallint primary key default 1 check (id = 1),
  peso_kg double precision not null check (peso_kg between 30 and 200),
  anos_escalando double precision not null check (anos_escalando between 0 and 80),
  lesiones text[] not null default '{}',
  grado_actual text not null check (char_length(grado_actual) between 1 and 10),
  grado_objetivo text not null check (char_length(grado_objetivo) between 1 and 10),
  inicio_temporada date not null,
  objetivo_temporada date not null,
  aviso_aceptado_en timestamptz not null default now(),
  check (objetivo_temporada > inicio_temporada)
);

create table evaluaciones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  peso_corporal_kg double precision not null check (peso_corporal_kg between 30 and 200),
  lastre_kg double precision not null check (lastre_kg between -100 and 150),
  resistencia_s double precision check (resistencia_s > 0 and resistencia_s <= 3600),
  tecnica double precision check (tecnica between 1 and 7)
);

create table sesiones (
  id uuid primary key,
  fecha date not null,
  sesion jsonb not null,
  propuesta jsonb,
  origen text not null check (origen in ('propuesta', 'libre')),
  creada_en timestamptz not null default now(),
  check (jsonb_typeof(sesion) = 'object' and sesion->>'id' = id::text and sesion->>'fecha' = fecha::text),
  check (propuesta is null or jsonb_typeof(propuesta) = 'object'),
  check ((origen = 'propuesta') = (propuesta is not null))
);
create index sesiones_fecha on sesiones (fecha);

-- Molestias: [{ zona, dolor 0-10, alarma? }]. El motor las valida a fondo; aquí, rango y zona como última barrera.
create table registros (
  sesion_id uuid primary key references sesiones (id) on delete cascade,
  rpe integer not null check (rpe between 0 and 10),
  duracion_min integer not null check (duracion_min between 1 and 1440),
  molestias jsonb not null default '[]',
  registrado_en timestamptz not null default now(),
  check (jsonb_typeof(molestias) = 'array' and not jsonb_path_exists(molestias,
    '$[*] ? (!(@.dolor >= 0 && @.dolor <= 10) || !(@.zona == "dedos" || @.zona == "muneca" || @.zona == "codo" || @.zona == "hombro" || @.zona == "otra"))'))
);

create table chequeos (
  fecha date primary key,
  sueno smallint not null check (sueno between 1 and 5),
  fatiga smallint not null check (fatiga between 1 and 5),
  ganas smallint not null check (ganas between 1 and 5),
  molestias jsonb not null default '[]',
  check (jsonb_typeof(molestias) = 'array' and not jsonb_path_exists(molestias,
    '$[*] ? (!(@.dolor >= 0 && @.dolor <= 10) || !(@.zona == "dedos" || @.zona == "muneca" || @.zona == "codo" || @.zona == "hombro" || @.zona == "otra"))'))
);

create table altas (
  id uuid primary key default gen_random_uuid(),
  zona text not null check (zona in ('dedos', 'muneca', 'codo', 'hombro', 'otra')),
  fecha date not null,
  creada_en timestamptz not null default now()
);

create table consejos_mostrados (
  id uuid primary key default gen_random_uuid(),
  consejo_id text not null check (char_length(consejo_id) between 1 and 60),
  fecha date not null
);

create table intentos_limite (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references sesiones (id) on delete cascade,
  fecha date not null,
  encadenado boolean not null,
  motivo_caida text check (motivo_caida in ('bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza')),
  check (not (encadenado and motivo_caida is not null))
);
