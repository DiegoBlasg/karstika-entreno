-- Dejar un proyecto sin encadenarlo: una escalada de estilo «abandonado» (sin grado, de proyecto) lo cierra.
alter table escaladas drop constraint escaladas_estilo_check;
alter table escaladas add constraint escaladas_estilo_check
  check (estilo in ('a-vista', 'flash', 'encadenada', 'pegues', 'abandonado'));
alter table escaladas drop constraint escaladas_pegues_de_proyecto;
alter table escaladas add constraint escaladas_pegues_de_proyecto check (estilo not in ('pegues', 'abandonado') or proyecto);
alter table escaladas drop constraint escaladas_encadene_con_grado;
alter table escaladas add constraint escaladas_encadene_con_grado check (estilo in ('pegues', 'abandonado') or grado is not null);
alter table escaladas add constraint escaladas_abandono_sin_grado check (estilo <> 'abandonado' or grado is null);
