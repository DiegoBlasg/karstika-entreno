# Rediseño móvil de Karstika Entreno — diseño

Fecha: 2026-10-30 · Estado: aprobado en brainstorming, pendiente de plan

## Objetivo

Pasar de la interfaz actual (Tailwind casi sin estilo, 6 enlaces de texto arriba) a una app móvil con aspecto profesional,
llamativa e intuitiva, que **guíe al usuario en su progreso real**. El progreso tiene dos ejes:

1. **El camino de la temporada** (columna vertebral): dónde estoy y cuánto me falta hasta la semana objetivo.
2. **Las métricas físicas** (la prueba de que avanzo): fuerza de dedos, grado, encadenes, carga.

No cambia el motor ni el modelo de datos salvo lo indicado en «Datos nuevos». Es un rediseño de la capa `app/` y `components/`
más funciones puras nuevas en `lib/datos/`.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Estilo visual | **A · Topo nocturno**: oscuro, deportivo, técnico (referencia Whoop/Strava) |
| Metáfora de la temporada | **Vía de varios largos**: fase = largo, semana = chapa, test = reunión, semana objetivo = cima |
| Navegación | Barra inferior fija de 5 pestañas: Hoy · Vía · Semana · Progreso · Yo |
| Gamificación | **Moderada**: logros por hitos reales, constancia en semanas cumplidas (la descarga cuenta), celebración en reuniones. Sin rachas diarias, puntos ni niveles |
| Enfoque de construcción | Sistema de diseño primero, luego pantallas por tandas |
| Iconos | `lucide-react` para interfaz + juego propio SVG de escalada |
| Tema | Solo oscuro |
| Saludo con nombre | No (el perfil no guarda nombre; no se añade) |

## Sistema visual

### Tokens (CSS variables en `app/globals.css`, expuestas a Tailwind v4 con `@theme`)

| Token | Valor | Uso |
|---|---|---|
| `--fondo` | `#0E1417` | Fondo de app |
| `--fondo-hundido` | `#0B1013` | Barra de pestañas, zonas hundidas |
| `--superficie` | `#172024` | Tarjetas |
| `--superficie-2` | `#22303A` | Chips, controles, pistas de barras |
| `--borde` | `#26333A` | Bordes de tarjeta |
| `--pista` | `#2A3539` | Tramos de vía por hacer, barras vacías |
| `--texto` | `#E8EDEA` | Texto principal |
| `--texto-2` | `#9FB0A8` | Etiquetas, texto secundario |
| `--texto-3` | `#6E7F78` | Texto apagado (solo ≥ 14 px en negrita o decorativo; ver contraste) |
| `--progreso` | `#C6F24E` | Lima: hecho, actual, acción principal |
| `--cima` | `#FF7A45` | Naranja: cima, objetivo, carga alta |
| `--ambar` | `#F5B83D` | Semáforo ámbar, pendientes |
| `--rojo` | `#FF5A5A` | Semáforo rojo |

Contraste: todo texto de cuerpo debe cumplir WCAG AA (4,5:1) sobre `--fondo` y `--superficie`. Se verifica cada par en la
tanda 0 con un test que calcula la relación de contraste de los tokens; si `--texto-3` no llega para texto normal, solo se usa
en texto grande o decorativo.

### Tipografía

- **Barlow Condensed** (500/700/800), mayúsculas con tracking 0,06–0,08 em: titulares, etiquetas (`k`), cifras grandes.
- **Barlow** (400/500/600): cuerpo.
- Cargadas con `next/font/google` (consultar `node_modules/next/dist/docs/` antes, por AGENTS.md).
- Cifras con `tabular-nums`.

### Fondo topográfico

Curvas de nivel SVG en lima a baja opacidad (≈ 0,15) solo en las cabeceras de Hoy y Vía. Componente `FondoTopo`, decorativo
(`aria-hidden`).

### Componentes base (`components/ui/`)

`Tarjeta` (variante destacada con borde lima), `Boton` (principal lima / secundario contorno / peligro), `Chip`,
`Etiqueta` (la `k`), `BarraProgreso`, `Hoja` (hoja inferior para «¿Por qué?», fuentes y detalles; accesible: foco atrapado,
cierre con Escape y al tocar fuera, `role="dialog"`), `BarraPestanas`, `CifraGrande`, `EstadoVacio` (texto + acción),
`Aviso` (verde/ámbar/rojo/info). Los actuales `components/estilos.ts` (BOTON, CAMPO, TARJETA) se sustituyen por estos.

### Iconos

- `lucide-react` para la interfaz (pestañas, acciones, estados).
- Juego propio en `components/iconos/` (SVG inline, `currentColor`): multipresa, chapa, reunión, cima, presa, cuerda.

## Navegación y arquitectura de información

Layout `app/(app)/layout.tsx`: columna de máximo ~480 px centrada (en escritorio se ve como un móvil), barra inferior fija con
`env(safe-area-inset-bottom)`, contenido con margen inferior para no quedar tapado.

| Pestaña | Ruta | Contenido | Sustituye |
|---|---|---|---|
| Hoy | `/` | Mini-vía, chequeo, sesión de hoy, avisos, pendientes de registrar, próximas | Hoy actual + registro libre |
| Vía | `/via` | Temporada como vía de largos | «El año» y «Qué ha cambiado» de `/plan` |
| Semana | `/semana` | Próximos 7–14 días con huecos y lo planeado; preparar sesión | Mi semana + «Próximos días» de `/plan` + `/entrenar` |
| Progreso | `/progreso` | Métricas, semanas cumplidas, logros; apuntar test | `/evaluacion` |
| Yo | `/perfil` | Perfil, material, aviso médico, fuentes, salir | Perfil |

- **Sesión en curso** (`/sesion/[id]`): pantalla completa sin barra de pestañas (grupo de rutas aparte), cabecera con «cerrar».
- `/entrenar` se mantiene como ruta (los enlaces `enlacePreparar` apuntan ahí) pero se presenta como pantalla de detalle con
  «atrás», sin pestaña propia. Lo mismo `/fuentes/[id]`.
- `/plan` y `/evaluacion` redirigen a `/via` y `/progreso` (para no romper enlaces guardados).
- Pestaña activa marcada con color lima + `aria-current="page"`.

## Pantallas

### Hoy

De arriba abajo:
1. **Cabecera**: fecha (etiqueta) y el largo actual como titular («Fase de fuerza»).
2. **Mini-vía**: tramo vertical con el largo actual, «N de M sesiones del largo», barra de progreso y «Reunión (test) en X días ›» → `/via`.
3. **Avisos** de semáforo (rojo con `AvisoMedico` y botón de alta; ámbar) y tests sin resultado → `/progreso`.
4. **Chequeo** cuando toque: las tres preguntas reales (sueño, fatiga, ganas) como escalas de un toque + molestias; no formularios largos.
5. **Sesión de hoy**: tarjeta destacada (borde lima), lugar/hora, chips (duración, lastre, carga alta en naranja), un único
   botón principal «Empezar sesión». Sin sesión: `EstadoVacio` con «Preparar una» → `/entrenar`.
6. **Pendientes de registrar**: fila compacta en ámbar con «Apuntar ›».
7. **Próximas** y «Últimos 7 días» plegables; entrenamiento libre como acción secundaria.

### Vía

Vía vertical que se lee de abajo (pie) arriba (cima):
- Línea lima hasta la posición actual, gris después. Chapas (marcas cortas) por semana; descargas marcadas como «reposo».
- **Reuniones** (círculos) en las semanas de test: pasadas en lima con el resultado (% del peso); la próxima con «en X días».
- **Largo actual** como tarjeta con borde lima: semana X de Y, sesiones hechas/planeadas del largo, barra.
- **Cima** en naranja: fecha y texto del objetivo de temporada.
- Tocar un largo abre `Hoja` con su objetivo (`OBJETIVO_FASE`) y sus semanas; tocar una reunión abre su test y la evolución.
- Bloque «Qué ha cambiado por tus resultados» (contenido actual de `Cambios`) bajo la vía, con el mismo contenido y estilo nuevo.
- La vía se desplaza para que el largo actual quede visible al entrar.

### Semana

Lista por días de los próximos 7–14 días (contenido actual de Mi semana + próximos días de Plan): cada hueco con hora, lugar,
compañía, sesión planeada (o libre / sin plan) y «Preparar». Alta y baja de huecos con los formularios actuales restilizados.
Avisos de semana orientativa y descarga como `Aviso`.

### Progreso

1. **Fuerza de dedos** (% del peso): cifra grande del último test y la diferencia con el anterior. Gráfica de línea SVG simple
   con un punto por test; solo con ≥ 2 tests. Con 1 test: «Tu primera marca». Con 0: `EstadoVacio` que explica cuándo toca.
2. **Grado**: actual → objetivo (de perfil), número de encadenes en vías al límite y el motivo de la última caída.
3. **Semanas cumplidas**: fila de bloques por semana de la temporada transcurrida (cumplida / descarga cumplida / no cumplida / actual).
4. **Logros** (ver abajo): conseguidos en color, pendientes apagados.
5. **Apuntar resultado de test** (formulario actual) e historial de tests.

### Momentos de progreso

- **Después de registrar una sesión**: pantalla de confirmación «+1 chapa» con la animación de la chapa, avance del largo,
  lo que el motor ha entendido (esfuerzo frente a lo previsto, si la carga puede subir) y la siguiente sesión. Botón «Hecho».
- **Llegada a una reunión** (al apuntar un test): resultado frente al test anterior, qué cambia en la carga de repeaters,
  qué largo viene y logros desbloqueados. Si el resultado empeora, tono honesto sin drama (posibles causas: descarga, sueño,
  fatiga) y sin celebración.
- **Logro nuevo**: aparece dentro de estas dos pantallas, no como notificación suelta.

### Primera vez (pie de vía)

Si falta perfil, huecos o primer test, Hoy y Vía muestran el **pie de vía**: tres chapas de arranque (① perfil, ② huecos de la
semana, ③ primer test), cada una con su botón y marcada al completarse. Con las tres hechas aparece el primer largo.

### Yo

Perfil (formulario actual restilizado), aviso médico, enlace a fuentes, salir.

### Sesión en curso

Cronómetro y registro actuales restilizados a pantalla completa: cifras grandes, botones grandes, sin barra de pestañas.

## Gamificación (moderada)

- **Semana cumplida**: semana pasada de la temporada (lunes a domingo) con al menos una sesión guardada (`FilaSesion`) y
  todas sus sesiones guardadas con registro (`FilaRegistro`). Una semana de descarga cumplida cuenta igual. Una semana sin
  sesiones guardadas no cuenta ni a favor ni en contra (se muestra neutra). La semana en curso se muestra como «actual».
- **Logros** (todos derivados de datos existentes, sin tabla nueva):
  - Largo completado (uno por largo).
  - Nuevo récord de fuerza de dedos (test mejor que todos los anteriores).
  - Primer encadene en una vía al límite.
  - Primera semana cumplida y 4 semanas cumplidas seguidas.
  - Temporada completa (llegar a la cima).
- Nada que premie entrenar más de lo planeado; no hay rachas diarias, puntos ni niveles.

## Datos nuevos (funciones puras en `lib/datos/`, con tests vitest)

- `progresoLargo(datos, hoy)`: largo actual, semana X de Y, sesiones hechas y planeadas del largo, días a la próxima reunión.
- `vistaVia(datos, hoy)`: largos con sus semanas (chapas), descargas, reuniones con resultado o fecha, posición actual y cima.
  Se construye sobre `vistaAno` y `posicionEnTemporada`.
- `semanasCumplidas(datos, hoy)`: estado por semana según la regla de arriba.
- `logros(datos, hoy)`: lista de logros con conseguido sí/no y fecha.
- `serieFuerza(datos)`: puntos (fecha, % del peso) por test.
- `resumenRegistro(datos, sesionId)` y `resumenReunion(datos, evaluacionId)`: datos de las dos pantallas de celebración.

Sin cambios de esquema de base de datos.

## Calidad UI/UX

- Zonas táctiles ≥ 44 × 44 px; acciones principales en la mitad inferior de la pantalla.
- Una sola acción principal por pantalla.
- Animaciones cortas (≤ 400 ms) solo en chapa, reunión y cambio de pestaña; desactivadas con `prefers-reduced-motion`.
- Foco visible en todos los controles; `Hoja` accesible; gráficas con texto alternativo (resumen en texto).
- Ningún estado vacío sin explicación y acción.

## App instalable

`app/manifest.ts` (nombre, `display: standalone`, `theme_color` y `background_color` = `--fondo`, iconos 192/512 y maskable),
`viewport` con `themeColor` y `viewportFit: 'cover'`, icono de app con la vía y la cima. Sin service worker ni modo offline.

## Pruebas

- Vitest para todas las funciones nuevas de `lib/datos/` y para el contraste de tokens.
- Playwright: adaptar los e2e existentes a la nueva navegación (pestañas, rutas redirigidas) y añadir uno por tanda para el
  flujo principal (Hoy → empezar sesión → registrar → «+1 chapa»; apuntar test → reunión).
- `npm run tsc` y `npm test` en verde en cada tanda.

## Orden de trabajo

Antes de empezar: cerrar la rama `mananas-casa` (8 commits por delante de `master`; decidir si se fusiona) y no tocar
`lib/biblioteca/` (sin seguimiento, ajeno a este trabajo).

| Tanda | Contenido |
|---|---|
| 0 | Tokens, fuentes, componentes `ui/`, iconos, fondo topográfico, manifest e icono |
| 1 | Layout con barra de pestañas, pantalla Hoy, mini-vía, `progresoLargo`, redirecciones |
| 2 | Pantalla Vía, `vistaVia`, hojas de largo y reunión |
| 3 | Progreso, `serieFuerza`, `semanasCumplidas`, `logros`, pantallas de celebración |
| 4 | Semana (fusión con próximos días y Entrenar), Yo, sesión en curso a pantalla completa, pie de vía |

Cada tanda tiene su propio plan e implementación y se puede probar en el móvil antes de seguir.

## Fuera de alcance

Tema claro, modo offline y notificaciones push, cambios en el motor, nombre de usuario, rachas diarias, puntos y niveles.
