-- Batería de tests sin dinamómetro (P-19, P-24): en el test de dedos, el colgado continuo en 30 mm a peso corporal y el
-- power slap; y el «test en casa» (dominadas máximas y apertura de cadera), en su propia tabla.
alter table evaluaciones
  add column colgado_30_s double precision check (colgado_30_s > 0 and colgado_30_s <= 3600),
  add column power_slap_cm double precision check (power_slap_cm >= 0 and power_slap_cm <= 300);

create table pruebas_casa (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  dominadas integer check (dominadas between 0 and 100),
  cadera_cm double precision check (cadera_cm >= 0 and cadera_cm <= 200),
  creada_en timestamptz not null default now(),
  check (dominadas is not null or cadera_cm is not null)
);
