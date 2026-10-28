-- Huecos de la semana que declara Diego (Mi semana). La hora va en minutos enteros desde las 00:00.
create table huecos (
  id uuid primary key,
  fecha date not null,
  inicio_min integer not null check (inicio_min between 0 and 1439),
  compania text not null check (compania in ('solo', 'con-gente')),
  lugar text not null check (lugar in ('casa', 'rocodromo', 'roca')),
  minutos integer not null check (minutos between 10 and 600),
  creado_en timestamptz not null default now(),
  check (inicio_min + minutos <= 1440)
);
create index huecos_fecha on huecos (fecha);
