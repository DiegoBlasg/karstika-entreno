-- Escaladas: encadenes y proyectos (spec 2026-11-01). Una fila es un encadene o un día de pegues a un proyecto.
-- intentos_limite no se toca (solo lectura desde la 004).
create table escaladas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  sesion_id uuid references sesiones (id) on delete cascade,   -- null = apuntada suelta en Progreso
  tipo text not null check (tipo in ('via', 'bloque')),
  lugar text not null check (lugar in ('rocodromo', 'roca')),
  grado text,
  estilo text not null check (estilo in ('a-vista', 'flash', 'encadenada', 'pegues')),
  pegues integer not null default 1 check (pegues between 1 and 50),
  nombre text check (char_length(nombre) between 1 and 80),
  proyecto boolean not null default false,
  creada_en timestamptz not null default now(),
  -- Un día de pegues sin encadenar solo tiene sentido en un proyecto, y un proyecto se sigue por su nombre.
  constraint escaladas_pegues_de_proyecto check (estilo <> 'pegues' or proyecto),
  constraint escaladas_proyecto_con_nombre check (not proyecto or nombre is not null),
  -- Un encadene lleva grado: es lo que da el nivel.
  constraint escaladas_encadene_con_grado check (estilo = 'pegues' or grado is not null),
  -- El grado, de la escala de su tipo (lib/escaladas/grados.ts): francés para vías, Font para bloques.
  constraint escaladas_grado_de_su_escala check (grado is null or (
    (tipo = 'via' and grado in ('4a', '4b', '4c', '5a', '5a+', '5b', '5b+', '5c', '5c+', '6a', '6a+', '6b', '6b+', '6c', '6c+', '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a', '8a+', '8b', '8b+', '8c', '8c+', '9a'))
    or (tipo = 'bloque' and grado in ('4', '4+', '5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A', '8A+'))))
);

create index escaladas_fecha on escaladas (fecha);
create index escaladas_sesion on escaladas (sesion_id);
