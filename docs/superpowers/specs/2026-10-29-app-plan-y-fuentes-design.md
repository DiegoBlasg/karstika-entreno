# App: material en casa, fuentes, plan del año y próximos días

Fecha: 2026-10-29 · Estado: aprobado en conversación

## 1. Peticiones de Diego (2026-10-29)

1. Saber **por qué** se hace cada ejercicio y su **fuente**, y cómo encaja en el plan del año.
2. Poder **empezar hoy** (jueves 29/10/2026).
3. Ver las **sesiones futuras**: los próximos días y el plan del año.
4. Saber si toca **búlder o vías**.
5. Corrección: **no tiene multipresa en casa**, solo barra de dominadas. Se resuelve con una opción en Perfil, «Tengo multipresa en casa», desmarcada por defecto.
6. Ver **qué ha cambiado por sus resultados**.

## 2. Material en casa (motor y datos)

- **Motor:** `Contexto` gana el campo opcional `multipresaEnCasa?: boolean`.
  - En `lugar: 'casa'` con `multipresaEnCasa === false`, estos tipos no son posibles y `validarContexto` los rechaza con la regla `contexto.material`: `multipresa-resistencia`, `multipresa-maxima`, `multipresa-resistencia-fuerza`, `evaluacion-dedos` y `campus`.
  - Si el campo falta, el motor se comporta como hasta ahora (con multipresa), para que las pruebas existentes no cambien.
  - Los huecos llevan su propio `contexto`, así que la regla aplica también al planificar la semana.
- **Datos:**
  - Migración `003_material.sql`: `alter table perfil add column multipresa_en_casa boolean not null default false`.
  - `FilaPerfil.multipresa_en_casa`.
  - `prepararPropuesta` añade `multipresaEnCasa` del perfil al contexto de la petición y al de cada hueco.
  - Perfil tiene la casilla «Tengo multipresa en casa».
- **Simulación:** la simulación de la semana real de Diego (`motor/semana-simulacion.test.ts`) pasa a ir sin multipresa en casa. Comprueba que:
  - en la fuerza, el martes con gente sigue siendo la vía al límite;
  - las multipresas caen en el rocódromo;
  - ninguna multipresa ni test cae en casa;
  - no se rompe ninguna regla de seguridad.

## 3. Empezar cualquier día

En Perfil, el inicio de la temporada acepta **cualquier fecha**. Se guarda el **lunes de esa semana** (`lunesDe`), y junto al campo se explica:

> «La temporada cuenta por semanas de lunes a domingo: si eliges un jueves, empieza el lunes de esa semana y ese jueves ya es la semana 1.»

El formulario deja de llamarse «(lunes)».

## 4. Por qué y fuentes

- `lib/fuentes.ts` (puro) tiene dos funciones:
  - `basesDe(explicaciones)`: para cada parámetro citado, devuelve su título (`METADATOS`), su nivel en palabras y sus estudios.
  - `estudio(id)`: devuelve la cita corta (primer autor «et al.», año, revista), el DOI y el enlace `https://doi.org/<doi>`, sacados de `evidencia/` (`porId`).
- Niveles en palabras:
  - A «evidencia sólida»
  - B «evidencia moderada»
  - C «evidencia limitada»
  - sinEvidencia «decisión de diseño, sin estudio directo»
- `PorQue` muestra, por cada explicación:
  - el motivo;
  - «En qué se basa», con cada parámetro, su nivel y sus estudios enlazados (DOI externo, y «detalle» a `/fuentes/<id>`).
- `/fuentes/[id]` muestra el estudio completo: afirmación, fuentes con DOI, nivel, a quién aplica, limitaciones y cómo se verificó. Si el id no existe, muestra «Estudio no encontrado».

## 5. Dónde encaja y dónde se hace

- `posicionEnTemporada(d, fecha)` (puro, en `lib/datos/temporada.ts`) devuelve:
  - semana n de N;
  - ciclo;
  - fase (nombre e id);
  - semana de la fase m de M;
  - descarga y reevaluar.

  Fuera de temporada devuelve `null`.
- `OBJETIVO_FASE: Record<FaseId, string>` en `lib/nombres.ts`: una frase por fase con su objetivo y su porqué, basada en `docs/evidencia/conclusiones.md` y los parámetros.
- **Línea de contexto** «Semana 3 de 49 · Ciclo 1 · Fuerza de dedos (semana 2 de 8) · semana de descarga · semana de test»:
  - Se muestra en `ResultadoPropuesta`, en `TarjetaSesion` (sesiones con propuesta) y en la cabecera del cronómetro.
  - Debajo, el objetivo de la fase.
- `DONDE_SE_HACE: Record<TipoSesion, string>` en `lib/nombres.ts`:
  - vía al límite: «Zona de vías, con cuerda y compañero»;
  - bloque al límite, bloque suave y 4×4: «Zona de búlder»;
  - ARC: «Vías fáciles o travesía de búlder, sin bombeo»;
  - técnica: «Búlder o vías por debajo de tu nivel»;
  - multipresas y test: «Multipresa»;
  - hombro y dominadas: «Barra y bandas (en casa o en el rocódromo)»;
  - board: «Board del rocódromo»;
  - pegues: «Roca, con compañero»;
  - autoasegurada: «Vías con autoasegurador»;
  - campus: «Campus»;
  - descanso: «—».
- `PlanSesion` y cada sesión planeada muestran «Dónde: …».

## 6. Pantalla «Plan»

- En el menú va entre «Mi semana» y «Entrenar».
- **Próximos días** (`proximosDias(d, ahora)`, puro, en `lib/datos/plan.ts`) cubre esta semana y la siguiente:
  - **Huecos de cada semana:**
    - Si la semana tiene huecos declarados, se usan esos (no pasados y no ocupados).
    - Si no, se usa el `PATRON_HABITUAL`, marcado como orientativo: mañanas de lunes a jueves a las 9:00 en casa, solo, 60 min; tardes de lunes y jueves a las 19:00 en rocódromo, solo, 90 min; martes 19:00 en rocódromo con gente, 120 min.
  - **Plan de cada semana:**
    - Se calcula con `prepararPropuesta` sobre el primer hueco pendiente, con el resto como huecos (igual que `vistaSemana`).
    - La siguiente semana se calcula con las sesiones planeadas de esta añadidas al historial como si estuvieran hechas.
    - Los fallos del motor se capturan con un aviso, como en `vistaSemana`.
  - **Cada hueco muestra:** día, hora, lugar, sesión, ★ si es carga alta, «Dónde: …» y el enlace **Preparar**. Las sesiones ya aceptadas salen como tales.
- **El año** (`vistaAno(d, hoy)`) muestra una fila por semana: fecha del lunes, fase, ciclo, descarga, test, la semana actual marcada y la semana objetivo al final.
- **Qué ha cambiado por tus resultados** (`cambiosPorResultados(d, hoy)`):
  - **Último test:** fecha, lastre y fuerza relativa. Si no hay test, «sin test todavía».
  - **Carga de los repeaters:** el porcentaje del test y el lastre, con `lastreRepeaters`, y la progresión según las sesiones válidas.
  - **Freno por esfuerzo:** `sinSubida`.
  - **Zonas** que no están en verde.
  - **Descargas adelantadas.**
  - **Ciclo 2:**
    - si aún no ha empezado: «Se decide el 19/04/2027 con tus tests y caídas: hoy apuntaría a …» (limitante principal provisional);
    - si ya ha empezado, el reparto fijado y su motivo (`ajusteCiclo2`).

## 7. Pruebas

- **Motor:**
  - la regla de material (posibles y validación);
  - la simulación sin multipresa en casa.
- **Datos:**
  - `posicionEnTemporada`;
  - `proximosDias` (huecos declarados frente a patrón; la segunda semana tiene en cuenta la primera);
  - `vistaAno`;
  - `cambiosPorResultados`;
  - `basesDe` y `estudio`, comprobando que todos los ids de evidencia de `METADATOS` existen;
  - la fecha de inicio en cualquier día se guarda como lunes.
- **e2e:** abrir Plan y ver próximos días y año; abrir una fuente desde «¿Por qué?».
