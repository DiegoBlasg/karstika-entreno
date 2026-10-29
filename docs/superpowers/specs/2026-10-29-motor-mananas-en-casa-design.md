# Motor: mañanas en casa (dominadas como sesión, hombro repartido, descanso activo)

Fecha: 2026-10-29 · Estado: aprobado por Diego en conversación

## Problema

Diego tiene libres las mañanas de lunes a jueves, de 45 a 60 minutos, en casa. Allí solo tiene barra de dominadas y bandas; no tiene multipresa (`multipresaEnCasa: false`).

La simulación de su semana real da este reparto:

- lunes y martes, hombro;
- miércoles y jueves, nada.

Las dominadas solo aparecen como complemento en la fase de fuerza.

La evidencia no justifica añadir mucha más carga:

- hombro con tope de 2 por semana (P-41);
- core sin bloque propio (P-40);
- dominadas opcionales, como mucho 1 cada 7 días y nunca el día de dedos intensos (P-39).

Aun así, el uso de esas mañanas puede mejorar dentro de esas reglas.

## Decisiones de Diego

1. **Dominadas como sesión principal.** En las fases de fuerza y de resistencia, fuera de la descarga, la sesión `dominadas` puede proponerse como principal en casa o en el rocódromo.
   - Cupo: 1 por semana natural, con la prioridad más baja de la fase.
   - Siguen las reglas de seguridad de P-39: `seguridad.dominadas-dia-dedos` y `seguridad.dominadas-7dias`, contando sesión y complemento juntos.
   - Siguen las restricciones del estado (`sinDominadas`, P-65 y P-45).
   - La plantilla de la sesión sale de la del complemento (4×4, 2 en reserva, 3 min de descanso; dosis de diseño) con calentamiento y vuelta a la calma. Debe caber en 45–60 min, o en lo que haya.
   - Si en el mismo día ya va como complemento, no se repite.
2. **Hombro en días no seguidos.** Al planificar la semana (P-67), con todo lo demás igual, se prefiere un reparto en el que las sesiones de hombro (como sesión o como complemento) no caigan en días consecutivos.
   - Va como criterio de desempate del plan, después de los existentes de cupos y rocódromo, y antes de los minutos totales. No es una regla de seguridad.
   - Se documenta en P-41 como preferencia de diseño.
3. **Descanso activo opcional.** Cuando el plan deja libre un hueco en casa, la app lo muestra así:
   > «Libre. Si te apetece: movilidad suave 10–15 min (cadera, hombro, muñecas), sin carga. Opcional: no cuenta para el plan.»

   Se ve en Mi semana y en Plan, y en Entrenar cuando la principal es nula en casa con el descanso del plan. Es solo texto de la interfaz: no crea sesiones ni ocupa cupos.

## Evidencia y parámetros

- **P-39** pasa a decir: «Opcional, como sesión (en casa o en el rocódromo, máximo 1 por semana en fuerza y resistencia, prioridad mínima) o como complemento de 15 min en la fuerza…». Se mantienen el nivel y la justificación.
- **P-41** añade: «Al repartir la semana se prefieren días no consecutivos (decisión de diseño)».
- Se regenera `motor/metadatos.ts` con `npm run metadatos`.

## Pruebas

- **Fases:** `dominadas` deja de estar prohibida en fuerza y resistencia y lleva cupo 1. Sigue prohibida en base, rendimiento y transición, y en las descargas.
- **Generador:** en casa en fuerza sin cupo de hombro pendiente, propone dominadas si no hay sesión intensa de dedos ese día ni dominadas en 7 días. No las propone con chequeo bajo o zonas en ámbar.
- **Simulación de la semana real**, 16 semanas sin multipresa en casa:
  - aparecen dominadas como sesión, como mucho 1 por semana y nunca el día de dedos intensos;
  - el hombro no cae en días consecutivos cuando hay alternativa;
  - el martes de cuerda sigue siendo la vía al límite;
  - ninguna regla de seguridad rota.
- **App:** el texto de descanso activo en un hueco libre de casa.
