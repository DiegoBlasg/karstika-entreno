# Generar entreno y ya: Semana sin ratos, «Core y movilidad», borrar y Próximas compactas

Fecha: 2026-10-31 · Rama: `generar-entreno` (sale de `diagnostico-freno`, que espera a migrar producción)

## Por qué (lo que dijo Diego tras usarla)

1. Planificar la semana es engorroso: declarar «ratos» con hora y luego «Preparar» cada uno. Quiere **generar el
   entreno y ya**, y que solo se pueda empezar el día que toca, a cualquier hora.
2. Pulsó «Apuntar entrenamiento no planeado» sin querer y **no lo puede borrar** (se guarda ya registrado, y lo
   registrado no se borra).
3. En casa le dijo «toca descansar» **sin ninguna alternativa**: «por lo menos abdominales».
4. «Próximas» en Hoy son tarjetas enormes con el plan entero: hay que **rediseñarlas**.

## Decisiones de Diego (2026-10-31)

- **Un botón por día**: «Generar entreno» con 4 preguntas (con quién, dónde, minutos, mañana o tarde). La sesión
  queda **aceptada directamente**; si no convence, «Otra opción» la cambia por una alternativa.
- **Mañana/tarde** sustituye a la hora (por dentro 9:00 y 18:00; la hora no se enseña).
- **Sin ratos**: Semana deja de usarlos (la tabla `huecos` se queda, sin uso).
- **«Core y movilidad»**: sesión suave nueva que se ofrece siempre que toque descansar, salvo con zonas en rojo.
- **Borrar** cualquier sesión registrada de los últimos 7 días, con confirmación.
- **Próximas compactas**: una fila por sesión que se despliega.
- Sin maquetas: mismo sistema de diseño (Topo nocturno, `components/ui/*`), botones ≥ 44 px, pensado para iPhone.

## 1. Generar entreno

### Dónde

- **Semana** (`/semana`, esta semana y la siguiente): agenda de 7 días. Cada día lista sus sesiones como filas
  compactas (§4) y, si el día no ha pasado, un botón **«Generar entreno»** (principal en el primer día sin sesiones a
  partir de hoy; secundario en el resto).
- **Hoy**: si no hay sesión para hoy, el estado vacío ofrece «Generar entreno» para hoy (sustituye a «Preparar una»).
- La página `/entrenar` deja de ser el camino normal; se mantiene para el «¿Por qué?» de una propuesta y para «Otra
  opción» (§1.3). Sus campos día/hora pasan a día + mañana/tarde.

### La hoja «Generar entreno»

`components/ui/Hoja` (ya existe) con:
- Título «Generar entreno · jueves 6».
- **¿Con quién?** (Solo / Con gente), **¿Dónde?** (Rocódromo / Roca / Casa), **Minutos** (número, 10-600) y
  **¿Cuándo?** (Mañana / Tarde), todos con `Opciones`.
- Valores iniciales: el contexto de la última sesión generada ese mismo día de la semana (`propuesta.contexto`, §5);
  si no hay, Solo · Rocódromo · 90 · Tarde.
- Botón «Generar». Mientras genera: «Generando…».

### Qué pasa al generar

1. Se arma la petición del motor igual que hoy (`prepararPropuesta`) con `fecha` = el día, `horaInicio` = 9 (mañana)
   o 18 (tarde), el contexto elegido y **sin huecos** (`huecos` no se pasa).
2. Si el motor da **principal**: se guarda como aceptada (lo mismo que hoy hace «Aceptar» con la opción 0), y la hoja
   se cierra. La fila nueva aparece en el día.
3. Si el motor propone **descanso**: no se guarda nada; la hoja muestra «Toca descansar» con su motivo y
   «¿Por qué?», y debajo **«Generar Core y movilidad»** si se puede (§2). Si no hay alternativa posible (zona en rojo),
   solo el motivo y el aviso médico si toca.
4. Si el motor no encuentra nada: el mensaje de error actual.
5. Validaciones de siempre (`validarDatos`, solapes con mañana/tarde: dos sesiones en la misma franja del mismo día se
   rechazan con «Ya tienes una sesión ese día por la mañana/tarde»).

### 1.3 «Otra opción»

En la fila desplegada de una sesión aceptada, sin registrar, de hoy o futura: **«Otra opción»** vuelve a pedir la
propuesta con el mismo contexto (`propuesta.contexto`, §5; las sesiones antiguas sin él abren la hoja de generar con
ese día para elegirlo), **sin contar la propia sesión**, y la sustituye por la
siguiente alternativa distinta del tipo actual (principal → alternativa 1 → alternativa 2 → principal…). Si no hay otra,
«No hay otra opción para ese día». Amplía `datosSinReemplazada`/`sustituirSesion`, que hoy solo admiten hoy, a hoy y
días futuros (nunca pasados).

### Empezar

Sin cambios: «Empezar sesión» solo aparece el día de la sesión, a cualquier hora.

### Contrapartida aceptada

Sin ratos, el motor no sabe qué días te quedan en la semana: decide cada entreno con lo ya generado. Conviene generar
los días en orden. Los ratos guardados dejan de usarse (no se borran).

## 2. «Core y movilidad»

- Tipo de sesión nuevo `core-movilidad` (motor `TIPOS_SESION`, `NOMBRE_TIPO` «Core y movilidad»), intensidad
  **suave**, 20-30 min según los minutos disponibles (20 si hay < 30).
- Lugares: casa, rocódromo y roca. No necesita compañía ni multipresa.
- **Nunca** es carga alta, no carga los dedos, no cuenta en ningún cupo de fase ni en P-41 (hombro).
- Plantilla (dosis = decisión de diseño, nuevo **P-72** `sinEvidencia`; el informe del 2026-10-31 confirma que no hay
  estudios de core en escaladores):
  - Core (~60 %): plancha frontal 3 × 30-45 s; hollow 3 × 20-30 s; elevaciones de piernas colgado de la barra 3 × 6-10
    (solo si hay barra: casa siempre, rocódromo sí; en roca se sustituye por elevaciones tumbado); plancha lateral
    2 × 30 s por lado. Descansos 45-60 s.
  - Movilidad (~40 %): rana 2 × 45 s; 90/90 de cadera 2 × 5 por lado; dislocaciones de hombro con cinta o palo 2 × 10.
- **Cuándo se ofrece**: el motor, cuando la propuesta es descanso (`descanso` presente y sin principal), añade
  `core-movilidad` como **alternativa** siempre que **ninguna zona esté en rojo**. En «Hice otra cosa» y «Apuntar
  entrenamiento» aparece como un tipo más.
- Validación de seguridad: con una zona en rojo, `validarSesion` rechaza `core-movilidad` (P-45/P-64 ya prohíben
  cargar la zona; aquí se rechaza entera por sencillez).
- Biblioteca: fichas de texto para plancha, hollow, elevaciones colgado, plancha lateral, rana, 90/90 y dislocaciones,
  con el formato de las fichas actuales (sin SVG si no hay figura; se reutiliza la de dominadas para el colgado).

## 3. Borrar lo registrado

- Toda sesión **registrada** de los últimos 7 días (la ventana de «Corregir») tiene **«Borrar»** junto a «Corregir».
- Confirmación: «¿Borrar esta sesión? Se borra con lo que apuntaste.»
- Borra la sesión; registro e intentos caen en cascada (ya hay `on delete cascade`).
- Nueva consulta `borrarSesionRegistradaBd(sql, id)` que solo borra si la sesión es de hoy o de los 7 días anteriores
  (comprobado en la acción con `corregible`).

## 4. Próximas compactas

Componente nuevo `FilaSesion`:
- Una fila de ≥ 44 px: **«Jue 6»** · **Mañana/Tarde** · **nombre de la sesión** (★ si carga alta) · **minutos** y un
  chevron.
- Al tocar se despliega (`<details>`): el plan (`PlanSesion`), «Otra opción» y «Quitar» (sin registrar), o el resumen
  del registro con «Corregir» y «Borrar» (registrada).
- **Hoy**: «Próximas» muestra hasta 5 filas, ordenadas por fecha y mañana/tarde, y un enlace «Ver la semana».
- **Semana**: cada día lista sus sesiones con `FilaSesion`.
- «Últimos 7 días» en Hoy usa también `FilaSesion`.

## 5. Datos y motor

- Sin migraciones: mañana/tarde se guarda como `horaInicio` 9 o 18 en la `sesion` (jsonb). El contexto de la
  generación (con quién, dónde, minutos) se guarda dentro de la `propuesta` (jsonb) como campo opcional
  `contexto` de `SesionPlan`; hoy no se guarda en ningún sitio.
- `franja(horaInicio)`: < 14 → mañana; si no, tarde (sirve también para sesiones antiguas con hora exacta).
- Motor: `core-movilidad` en tipos, contexto (lugares), plantillas, nombres, seguridad (rojo → no) y en la propuesta
  como alternativa del descanso. P-72 en `docs/evidencia/parametros.md` + `VALORES`.
- Semana: `vistaSemana` deja de leer `huecos`; nueva vista por días con sesiones y si el día admite «Generar».
- Se retiran de la UI: `AnadirRato`, `FormularioHueco`, `BotonBorrarHueco`, `ConfirmacionRatos`, «Próximo rato» en Hoy
  y «Así queda tu semana» en Entrenar. Las acciones de huecos se borran; la tabla se queda.

## 6. Pruebas

- Motor: `core-movilidad` sale como alternativa del descanso en casa/rocódromo/roca; no sale con zona en rojo; nunca
  es carga alta ni cuenta en cupos; su plantilla respeta minutos y sustituye el colgado en roca; P-72 coincide con el
  documento.
- Datos: generar sin huecos con mañana/tarde; solape por franja; «Otra opción» rota alternativas y no admite días
  pasados; borrar registrada dentro/fuera de los 7 días; valores iniciales de la hoja.
- e2e: generar un entreno en Semana para mañana (queda aceptado y sin «Empezar»), «Otra opción», generar en casa con
  descanso → «Generar Core y movilidad», borrar un entrenamiento no planeado, Próximas compactas que se despliegan.
  Se sustituye el e2e de «Mi semana: añadir un rato…».

## Fuera de alcance

Generar la semana entera de golpe; recordar disponibilidad habitual; borrar la tabla `huecos`.
