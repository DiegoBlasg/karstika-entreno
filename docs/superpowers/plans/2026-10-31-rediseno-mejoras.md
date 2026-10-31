# Rediseño · mejoras (Vía, Semana, Biblioteca, fallos) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Aplicar las decisiones de `docs/superpowers/specs/2026-10-31-rediseno-mejoras-via-semana-biblioteca-design.md`: colores por fase, Vía como pasos + carrusel, Semana como agenda de 7 días con hoja para añadir ratos, Biblioteca con lista y ficha nuevas, y los fallos de fecha/hora en Safari y de la invitación a apuntar tests.

**Architecture:** Solo capa de presentación y una función pura de colores (`lib/ui/fases.ts`). Los datos salen de las funciones existentes (`vistaVia`, `progresoLargo`, `vistaSemana`, `proximosDias`, `FICHAS`, `GRUPOS`). Componentes de servidor salvo donde haga falta interacción (carrusel, buscador de la biblioteca, hoja de añadir rato).

**Tech Stack:** Next.js 16.4, React 19, Tailwind 4 (tokens de `app/globals.css`), lucide-react 1.65, vitest 2, Playwright 1.64.

Spec: `docs/superpowers/specs/2026-10-31-rediseno-mejoras-via-semana-biblioteca-design.md` (fuente de textos y decisiones). Spec general: `docs/superpowers/specs/2026-10-30-rediseno-movil-design.md`. Rama: `rediseno-5`, desde `master` 6a851b4.

## Global Constraints

- Texto de la interfaz en español; Diego usa iPhone (Safari, app instalada). Probar a 390 × 844 y pensar en Safari (no solo Chromium).
- Solo tema oscuro; tokens de `app/globals.css`, más los cinco colores de fase que añade la tarea 1 (nada de paletas de Tailwind).
- Reutilizar `components/estilos.ts`, `components/ui/*` (`Hoja`, `Opciones`, `Etiqueta`, `BarraProgreso`, `Aviso`, `Tarjeta`, `EstadoVacio`), `components/iconos/Escalada.tsx`, `components/dibujos/index.tsx`.
- Zonas táctiles ≥ 44 px; foco visible; una sola acción principal por pantalla; animaciones ≤ 400 ms y sin ellas con `prefers-reduced-motion`.
- No cambiar acciones de servidor, consultas, datos ni `motor/`. Los `name`/`value` de los formularios no cambian. En `lib/` solo `lib/ui/fases.ts` (nuevo) y su test.
- Leer la guía de `node_modules/next/dist/docs/` antes de escribir código de Next. Borrar cualquier `AGENTS.md` sin seguimiento; nunca commitearlo.
- Navegador y e2e solo contra la base de PRUEBAS. En esta carpeta hay un `next dev -p 3200` ajeno que no se puede parar: ejecutar `npm run e2e` y las capturas en un worktree temporal (`git worktree add`, copiar `.env.local`, `npm ci`) y borrarlo al terminar; parar siempre los servidores propios. Servidor de pruebas: `DATABASE_URL`=`E2E_DATABASE_URL`, `CLAVE_ACCESO`=`E2E_CLAVE_ACCESO`, `SECRETO_SESION=secreto-de-pruebas-e2e-de-al-menos-32-caracteres`; scripts de Playwright en la carpeta temporal; no imprimir secretos.
- Los e2e buscan controles por texto: si un cambio de texto obliga a tocar un e2e (p. ej. «Añadir hueco» → «Añadir rato»), cambiar el e2e en la misma tarea y explicarlo.
- En cada tarea: `npm test`, `npm run tsc`, `npm run build` y `npm run e2e` en verde; capturas en `.superpowers/sdd/mejoras-*.png`, mirarlas y corregir.
- Commits con el trailer exacto `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Fallos (fecha/hora en Safari y test) y colores de fase

**Files:** `app/globals.css`, `lib/ui/contraste.test.ts`, `lib/ui/fases.ts` (+ `.test.ts`), `components/MiniVia.tsx`, `app/(app)/progreso/page.tsx`, `components/PieDeVia.tsx`, `components/via/Reunion.tsx`.

- [ ] **Fecha y hora en Safari.** En `app/globals.css`, regla base para `input[type="date"], input[type="time"], input[type="datetime-local"]`: `min-width: 0; width: 100%; -webkit-appearance: none; appearance: none;` y `::-webkit-date-and-time-value { text-align: left; }`. Comprobar que los contenedores de Día/Hora de Entrenar, rato para entrenar, test y registro libre son `grid grid-cols-…` o `flex` con `min-w-0` en los hijos; añadirlo donde falte.
- [ ] **Colores de fase.** En `@theme static`: `--color-fase-base: #8FB3A6; --color-fase-fuerza: #C6F24E; --color-fase-resistencia: #4FD1C5; --color-fase-rendimiento: #FF7A45; --color-fase-transicion: #6E7F78;`. En `lib/ui/contraste.test.ts`: los cinco existen con ese valor; `fondo` sobre base/fuerza/resistencia/rendimiento ≥ 4,5:1; cada uno ≥ 3:1 sobre `fondo` (no-texto). Si transición no llega a 4,5 con texto oscuro, documentarlo en el test (texto `texto` encima).
- [ ] **`lib/ui/fases.ts`** (TDD): `export const COLOR_FASE: Record<FaseId, { fondo: string; texto: string; borde: string; trazo: string; relleno: string; textoEncima: string }>` con clases literales de Tailwind (`bg-fase-fuerza`, `text-fase-fuerza`, `border-fase-fuerza`, `stroke-fase-fuerza`, `fill-fase-fuerza`, `text-fondo` o `text-texto`) — literales completos para que Tailwind los genere; la fase `objetivo` (semana objetivo) usa `cima`. Test: todas las `FaseId` del motor tienen entrada y ninguna clase está vacía.
- [ ] **MiniVia** usa el color de la fase actual (línea hecha, marcador, barra) en vez de lima fijo.
- [ ] **Test:** Progreso enseña el formulario de resultado solo si `testsSinResultado(datos, hoy)` no está vacío; si no, un `<details>` cerrado con resumen «¿Hiciste un test por tu cuenta?» (≥ 44 px, `text-texto-2`) que contiene el formulario. `PieDeVia` paso 3: sin enlace, texto del spec. `Reunion.tsx`: quitar «Apuntar un resultado». Ajustar e2e si alguno abría el formulario directamente (el de `zz-navegacion` «apuntar un test lleva a la reunión»: abrir el `<details>` antes).
- [ ] Verificar y commit `fix(app): fecha y hora sin solaparse en Safari, el test no se ofrece hasta que toca y un color por fase`.

### Task 2: Vía — pasos + carrusel de largos

**Files:** `components/via/*` (rehacer), `app/(app)/via/page.tsx`, `e2e/flujo.spec.ts` (test de Vía).

- [ ] Componentes (leer los actuales `Via.tsx`, `Largo.tsx`, `Reunion.tsx`, `Rail.tsx`, `IrAlActual.tsx` y `lib/datos/via.ts` antes; reutilizar las hojas de largo y reunión):
  - `PasosVia` (servidor): `<ol aria-label="Largos de la temporada">` con un círculo por largo (36–44 px, número, color de fase; hecho ✓ relleno, actual con anillo y `aria-current="step"`, futuro apagado) unidos por una línea (lima hasta el actual, `pista` después) y ▲ cima al final. Cada paso es un enlace `href="#largo-N"` (≥ 44 px de zona táctil). Si no caben 8 + cima en 390 px, permitir scroll horizontal de la fila sin barra visible.
  - `CarruselLargos` (cliente): contenedor `overflow-x-auto snap-x snap-mandatory` con tarjetas `snap-center` de ~78 % del ancho (las vecinas asoman); al montar, centra la del largo actual (`scrollIntoView({ inline: 'center', block: 'nearest' })`, sin animación con movimiento reducido); al hacer scroll, marca en la fila de pasos el largo visible (opcional; si complica, no). Puntos indicadores bajo el carrusel.
  - Tarjeta de largo: `Etiqueta` «Largo N · ciclo C» (+ «ahora»), nombre de la fase en su color, anillo SVG con semanas (X de Y; hechas en el color de fase), «N sesiones», la reunión del largo si la hay («Test · semana del …» / «R2 · 114 %»), el objetivo de la fase en una línea (truncado a 2 líneas). Toda la tarjeta es el disparador de la `Hoja` con las semanas (como ahora). Tarjeta final de cima: ▲, fecha, «Grado objetivo: 7a».
  - Debajo: tarjeta «Próxima reunión» (o «Todas las reuniones hechas»), que abre su hoja con la evolución.
- [ ] Página: cabecera «Tu vía» con `Etiqueta` «Temporada · objetivo {fecha}», pasos, carrusel, próxima reunión, «Qué ha cambiado». Quitar la vía vertical, `Rail.tsx` e `IrAlActual.tsx` si dejan de usarse.
- [ ] e2e: el test de Vía busca `[aria-current="step"]` (paso actual) y abre la hoja del largo actual desde su tarjeta del carrusel; ajustar selectores.
- [ ] Verificar, capturas (inicio, otro largo deslizado, hoja abierta) y commit `feat(via): pasos de la temporada y carrusel de largos con su color de fase`.

### Task 3: Semana — agenda de 7 días

**Files:** `app/(app)/semana/page.tsx`, `ProximosDias.tsx` (eliminar o reducir al plan orientativo), `FormularioHueco.tsx`, `BotonBorrarHueco.tsx`, nuevo `app/(app)/semana/AnadirRato.tsx` (cliente, `Hoja`), `e2e/flujo.spec.ts`.

- [ ] Leer `lib/datos/semana.ts` (`vistaSemana`: huecos con estado) y `lib/datos/plan.ts` (`proximosDias`: plan orientativo cuando la semana no tiene huecos).
- [ ] Cabecera: «Tu semana», `Etiqueta` con rango y fase, «‹ Anterior» / «Siguiente ›» (≥ 44 px; mantener los `href` actuales `?lunes=`; si el e2e usa «Semana siguiente →» / «← Esta semana», actualizarlo a los textos nuevos).
- [ ] Agenda: siempre 7 filas (lunes a domingo) con la columna del día (abreviatura y número; «hoy» marcado con borde lima) y los ratos de ese día como en la maqueta (hora · sitio · minutos, lo que toca con ★, estado aceptada/registrada, «Preparar» y borrar). Días sin ratos: «Sin ratos para entrenar». Días pasados atenuados. Un «+» por día de hoy en adelante (botón ≥ 44 px, `aria-label="Añadir un rato para entrenar el {día}"`) que abre `AnadirRato` (hoja con `FormularioHueco` y el día fijado: el `<select>` de día se sustituye por un campo oculto con esa fecha y un título «Rato para entrenar · {día}»).
- [ ] Semana sin ratos: el aviso único del spec y, debajo, el plan orientativo de `proximosDias` para esa semana en las mismas filas, sin botones. Quitar «Próximos días» y los demás avisos duplicados (mantener el aviso rojo de zonas y el de la semana orientativa una sola vez).
- [ ] Textos: «hueco» → «rato para entrenar» en Semana, la hoja, mensajes de la acción visibles al usuario solo si están en componentes (no tocar `acciones.ts` salvo textos de `ok`/`error` si dicen «hueco»: cambiarlos también, son textos de interfaz) y donde aparezca en Hoy («Próximo hueco» → «Próximo rato»). Botón del formulario «Añadir rato».
- [ ] e2e: el test «Mi semana» pasa a abrir el «+» del día del hueco, rellenar en la hoja y guardar con «Añadir rato»; mensaje «Rato añadido.»; «Preparar» igual.
- [ ] Verificar, capturas (semana con ratos, semana vacía con plan orientativo, hoja abierta) y commit `feat(semana): agenda de 7 días con ratos para entrenar y hoja para añadirlos`.

### Task 4: Biblioteca — lista con miniaturas y ficha

**Files:** `app/(app)/biblioteca/page.tsx`, nuevo `components/biblioteca/ListaBiblioteca.tsx` (cliente: buscador + chips), `app/(app)/biblioteca/[id]/page.tsx`, `components/ComoSeHace.tsx` si conviene, `e2e/flujo.spec.ts` (test de biblioteca).

- [ ] Lista: título «Biblioteca», buscador (`<input type="search">` con etiqueta accesible «Buscar ejercicio», filtra por título sin tildes ni mayúsculas), chips de grupo («Todos» + `GRUPOS`, con `Opciones` o botones `aria-pressed`), filas agrupadas (encabezado de grupo con el número), cada fila un `Link` ≥ 44 px con miniatura (el `Dibujo` de la ficha a ~40 px o un icono del grupo), título y material, «›». Sin resultados: «Ningún ejercicio con «…»».
- [ ] Ficha: «‹ Biblioteca», dibujo grande en tarjeta, `Etiqueta` del grupo, título (`font-titular`), «para qué», chips con el material, pasos numerados con círculos lima, «Para si…» en `Aviso tono="ambar"`, y «Errores típicos» y «Por qué se hace» en `<details>` plegados (≥ 44 px). Mantener los encabezados que usa el e2e («Cómo se hace», «Cuándo parar», «Por qué se hace»): si pasan a otro texto o quedan dentro de `<details>`, actualizar el e2e.
- [ ] Verificar, capturas (lista, búsqueda, ficha) y commit `feat(biblioteca): lista con miniaturas, buscador y filtros; ficha con pasos y lo largo plegado`.

## Cierre

- [ ] Revisión final (modelo más capaz) de la rama; corregir lo importante; fusionar en `master`; `npm test`; subir con el visto bueno de Diego.
