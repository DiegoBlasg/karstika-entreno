-- «¿Qué te frenó hoy?» al terminar una sesión al límite (P-69) y si se encadenó algo. Sustituye a los intentos
-- (intentos_limite se conserva: solo lectura).
alter table registros
  add column freno text check (freno in ('bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza', 'nada')),
  add column encadene boolean not null default false;
