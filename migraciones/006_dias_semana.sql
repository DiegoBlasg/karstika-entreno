-- Cuántos días suele entrenar por semana (en Yo). Con esto y lo que hace de verdad, la app supone el resto de la semana
-- al generar un entreno (P-74). Nulo = sin contestar: entonces no supone nada.
alter table perfil add column dias_semana text check (dias_semana in ('1', '2', '3-4', '5-6', 'todos'));
