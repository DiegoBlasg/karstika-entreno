-- Cuándo se apuntó cada test: el reparto del ciclo 2 se fija con lo guardado antes de su lunes, así un test apuntado
-- después con fecha anterior no lo cambia hacia atrás. Los tests ya guardados quedan con la hora de la migración.
alter table evaluaciones add column creada_en timestamptz not null default now();
