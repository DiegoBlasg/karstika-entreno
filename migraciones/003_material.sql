-- Material en casa: sin multipresa en casa, el motor no propone multipresa, tests de dedos ni campus en casa.
alter table perfil add column multipresa_en_casa boolean not null default false;
