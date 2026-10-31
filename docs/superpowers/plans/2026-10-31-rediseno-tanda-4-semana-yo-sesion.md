# Rediseño móvil · Tanda 4: Semana, Yo, Entrenar, sesión en curso y pie de vía — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el rediseño: controles de opción táctiles en todos los formularios, Semana sin duplicados y con su título, Yo y Entrenar con el estilo nuevo (Entrenar como pantalla de detalle con «atrás»), «Qué ha cambiado» con estilo nuevo, la sesión en curso con cifras y botones grandes, las sesiones ya registradas plegadas en Hoy y el «pie de vía» para el primer uso.

**Architecture:** Un componente de opciones segmentadas (`components/ui/Opciones.tsx`) sustituye los radios pequeños. Una función pura `pasosArranque` (`lib/datos/arranque.ts`, con tests) decide el pie de vía, que se muestra en Hoy y al pie de la Vía. El resto son recomposiciones de pantallas existentes con los componentes de las tandas 0–3, sin cambiar acciones de servidor ni datos.

**Tech Stack:** Next.js 16.4, React 19, Tailwind 4 (tokens), lucide-react 1.65, vitest 2, Playwright 1.64.

Spec: `docs/superpowers/specs/2026-10-30-rediseno-movil-design.md` (secciones «Semana», «Yo», «Sesión en curso», «Primera vez (pie de vía)», «Calidad UI/UX»). Rama: `rediseno-4`, desde `master` 5e9c5b4.

## Global Constraints

- Texto de la interfaz en español; Diego usa iPhone (app instalada).
- Solo tema oscuro y solo los tokens de la tanda 0 (`fondo`, `fondo-hundido`, `superficie`, `superficie-2`, `borde`, `pista`, `texto`, `texto-2`, `texto-3`, `progreso`, `cima`, `ambar`, `rojo`). `texto-3` solo en texto grande o decorativo.
- Reutilizar `components/estilos.ts`, `components/ui/*`, `components/iconos/Escalada.tsx`, `components/FondoTopo.tsx`, `components/MiniVia.tsx`.
- Zonas táctiles ≥ 44 px; foco visible; una sola acción principal por pantalla; animaciones ≤ 400 ms y desactivadas con `prefers-reduced-motion`.
- No cambiar acciones de servidor, consultas ni `motor/`. En `lib/` solo `lib/datos/arranque.ts` (nuevo) y su test.
- Los nombres de los campos de formulario (`name`) y sus valores no cambian: las acciones los leen igual.
- Los e2e buscan controles por su texto/etiqueta (`getByLabel('Rocódromo')`, `getByLabel('Con gente')`, `getByLabel('Casa')`, botones por nombre): mantener esas etiquetas accesibles; si un cambio obliga a tocar un e2e, hacerlo y explicarlo.
- Leer la guía en `node_modules/next/dist/docs/` antes de escribir código de Next. Borrar cualquier `AGENTS.md` sin seguimiento; nunca commitearlo.
- Navegador y e2e solo contra la base de PRUEBAS. Servidor de pruebas: puerto 3200 con `DATABASE_URL`=`E2E_DATABASE_URL`, `CLAVE_ACCESO`=`E2E_CLAVE_ACCESO`, `SECRETO_SESION=secreto-de-pruebas-e2e-de-al-menos-32-caracteres`; scripts de Playwright en la carpeta temporal del sistema; no imprimir secretos; **parar siempre el servidor al terminar** (y comprobar que no queda ningún `next dev` de la tarea vivo). Si `npm run e2e` no arranca porque ya hay un `next dev` en esta carpeta que no es de la tarea, no matarlo: ejecutar los e2e en un worktree temporal de HEAD y explicarlo.
- En cada tarea: `npm test`, `npm run tsc`, `npm run build` y `npm run e2e` en verde.
- Commits con el trailer exacto `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Opciones segmentadas en los formularios

**Files:**
- Create: `components/ui/Opciones.tsx`
- Modify: `app/(app)/semana/FormularioHueco.tsx`, `app/(app)/entrenar/FormularioEntrenar.tsx`, `components/CamposMolestias.tsx` (el «¿Alguna molestia? No / Sí»)

**Interfaces:**
- Produces:

```tsx
export function Opciones({ nombre, leyenda, opciones, valor, onCambio, requerido, columnas }: {
  nombre: string                                  // name del radio (no cambia respecto al formulario actual)
  leyenda: string                                 // texto del <legend>
  opciones: readonly { valor: string; texto: string }[]
  valor?: string                                  // marcada por defecto (defaultChecked) o controlada si hay onCambio
  onCambio?: (valor: string) => void
  requerido?: boolean
  columnas?: 2 | 3                                // por defecto, tantas como opciones (máx. 3)
}): JSX.Element
```

Diseño: `<fieldset>` con `<legend>` y una rejilla de botones de ≥ 44 px (`min-h-11`, `rounded-xl`, `border-borde`, `bg-superficie-2`; marcado: `border-progreso bg-progreso text-fondo`). Cada opción es un `<label className="relative …">` con el `<input type="radio">` **encima y transparente** (`peer absolute inset-0 cursor-pointer opacity-0`, no `sr-only`): así el clic real llega al input y Playwright puede hacer `check()` sin `force`. El texto visible va en un `<span>` con `peer-checked:` y `peer-focus-visible:outline-2 peer-focus-visible:outline-progreso`. La etiqueta accesible de cada radio es su `texto` (el `<label>` lo envuelve), de modo que `getByLabel('Rocódromo')` sigue funcionando.

- [ ] **Step 1:** Escribir `components/ui/Opciones.tsx` según la interfaz.
- [ ] **Step 2:** Usarlo en `FormularioHueco` (`compania`: Solo / Con gente; `lugar`: Casa / Rocódromo / Roca — conservar el `onChange` que ajusta los minutos), en `FormularioEntrenar` (sus radios de compañía y lugar; leer el componente: tiene un helper local de radio que se sustituye) y en `CamposMolestias` («No» / «Sí», controlado). Sin cambiar `name` ni `value`.
- [ ] **Step 3:** En `CamposChequeo` (tanda 1) los radios son `sr-only` y el e2e usa `check({ force: true })`: pasarlos al mismo patrón del input transparente encima y quitar los `force: true` de `e2e/flujo.spec.ts`.
- [ ] **Step 4:** Verificar (`npm test && npm run tsc && npm run build && npm run e2e`) y captura 390 × 844 de Semana (formulario) y Entrenar en `.superpowers/sdd/tanda4-opciones*.png`. Commit `feat(ui): opciones segmentadas táctiles en hueco, entrenar, molestias y chequeo`.

---

### Task 2: Semana

**Files:**
- Modify: `app/(app)/semana/page.tsx`, `app/(app)/semana/ProximosDias.tsx`, `e2e/flujo.spec.ts`

Problema actual: «Próximos días» repite los huecos de esta semana que ya salen en la lista, y el título dice «Mi semana».

- [ ] **Step 1: Cabecera** — `<h1>` «Tu semana» (`font-titular text-4xl font-extrabold uppercase`, «semana» en lima) y, debajo, la `Etiqueta` con el rango de fechas y la fase (lo que hoy sale en el párrafo bajo el título). El cambio de semana («← Esta semana» / «Semana siguiente →») queda como dos enlaces de ≥ 44 px a ambos lados (mantener esos textos: el e2e los usa).
- [ ] **Step 2: Lista por días** — agrupar los huecos de la semana vista por día con un encabezado de día (`Etiqueta` «lunes 2 nov», «hoy» si es hoy) y las tarjetas debajo; los pasados atenuados como ahora. Sin cambiar `Fila` más allá del agrupado y los estilos.
- [ ] **Step 3: Sin duplicados** — `ProximosDias` ya no pinta la semana que se está viendo. Pasa a recibir `lunesVisto` y solo muestra: (a) si la semana vista no tiene huecos declarados, el plan orientativo de esa semana (con su aviso «Orientativo…»); (b) si se está viendo esta semana, un adelanto compacto de la semana siguiente con el título «Semana siguiente». El `<h2>` «Próximos días» se conserva cuando se muestre algo (el e2e lo busca en la vista de esta semana; si con datos del e2e la sección queda vacía, ajustar el e2e para no exigirla y explicarlo).
- [ ] **Step 4:** El formulario «Añadir hueco» va al final, plegado en un `<details>` con resumen «+ Añadir un hueco» (≥ 44 px) cuando la semana ya tiene huecos; abierto si no tiene ninguno. Comprobar que el e2e «Mi semana» sigue encontrando los campos (abrir el `<details>` si hace falta).
- [ ] **Step 5:** Verificar todo, captura `.superpowers/sdd/tanda4-semana*.png` (esta semana y la siguiente). Commit `feat(semana): tu semana por días, sin duplicados y con el adelanto de la siguiente`.

---

### Task 3: Yo, Entrenar y «Qué ha cambiado»

**Files:**
- Modify: `app/(app)/perfil/page.tsx`, `app/(app)/perfil/FormularioPerfil.tsx`, `app/(app)/entrenar/page.tsx`, `app/(app)/entrenar/ResultadoPropuesta.tsx` (solo estilos), `app/(app)/via/page.tsx` (componente `Cambios`)

- [ ] **Step 1: Yo** — `<h1>` «Yo». Secciones en tarjetas con `Etiqueta`: «Tu perfil» (el formulario actual; la casilla «Tengo multipresa en casa» y la del aviso, con zona táctil ≥ 44 px), «Aviso médico» (`AvisoMedico`), y al final los botones «Biblioteca de ejercicios» y «Salir» (ya existen). Si no hay datos todavía (primer uso), el texto de bienvenida actual va arriba en un `Aviso tono="info"`.
- [ ] **Step 2: Entrenar como detalle** — cabecera con un enlace «‹ Semana» (`ChevronLeft` de lucide, ≥ 44 px, a `/semana`) y el `<h1>` «Preparar sesión». `ResultadoPropuesta`: la propuesta principal en `TARJETA_DESTACADA` y las alternativas en `TARJETA`; «Aceptar esta sesión» como `BOTON` (una sola acción principal por tarjeta). Sin tocar la lógica ni los textos de botones.
- [ ] **Step 3: «Qué ha cambiado»** — en `via/page.tsx`, el componente `Cambios` pasa a: `<h2>` con el estilo de titulares (`font-titular text-2xl font-bold uppercase`, mismo texto «Qué ha cambiado por tus resultados»), avisos con `Aviso tono="ambar"` y la lista como `<dl>` en una `Tarjeta`, con cada concepto («Último test», «Carga de los repeaters», «Freno por esfuerzo», «Zonas», «Descargas adelantadas», «Ciclo 2») como `<dt>` en `Etiqueta` y su texto como `<dd>`. Mismo contenido; `PorQue` sigue dentro de «Ciclo 2».
- [ ] **Step 4:** Verificar todo y capturas `.superpowers/sdd/tanda4-yo.png`, `tanda4-entrenar.png`, `tanda4-cambios.png`. Commit `feat(app): Yo y Entrenar con el estilo nuevo; Qué ha cambiado en tarjeta`.

---

### Task 4: Sesión en curso y sesiones registradas en Hoy

**Files:**
- Modify: `app/(enfoque)/sesion/[id]/Cronometro.tsx` (solo presentación), `app/(enfoque)/sesion/[id]/page.tsx`, `app/(app)/_hoy/TarjetaSesion.tsx`

- [ ] **Step 1: Cronómetro** — leer el componente entero antes. Solo presentación, sin tocar la máquina de estados ni el guardado:
  - Cuenta atrás / tiempo en `font-titular` muy grande (`text-8xl` o mayor, `tabular-nums`), la fase («Prepárate», «Colgado», «Descanso», …) como `Etiqueta` grande encima y el ejercicio actual debajo.
  - Fondo de fase: cada fase con su color de token (preparate `ambar`, colgado `progreso`, descanso `superficie-2` con borde/texto lima en vez del gris plano actual), texto con contraste AA (comprobar con `lib/ui/contraste.ts` si se combina algo nuevo).
  - Progreso de la sesión: `BarraProgreso` con el paso actual / total de pasos y «Paso X de Y».
  - Botones de control en una fila inferior de ≥ 56 px de alto, al alcance del pulgar; la acción principal de cada estado en `BOTON` y el resto en `BOTON_SECUNDARIO`. Mantener todos los nombres de botón (el e2e los usa).
- [ ] **Step 2: Página de la sesión antes de empezar** — título de la sesión en `font-titular` grande y el plan; el botón «Empezar» (nombre exacto) como acción principal a lo ancho.
- [ ] **Step 3: Hoy, sesiones registradas** — en `TarjetaSesion`, cuando la sesión ya está registrada, el plan (`PlanSesion`, contexto de temporada) va dentro de un `<details>` cerrado con resumen «Ver el plan» (≥ 44 px); se ve de un vistazo el nombre, «Hecha · RPE N · M min» y «Corregir». Las no registradas no cambian.
- [ ] **Step 4:** Verificar todo y capturas del cronómetro en cada fase que se pueda alcanzar (`.superpowers/sdd/tanda4-crono*.png`) y de Hoy con una sesión registrada. Commit `feat(sesion): cronómetro con cifras y botones grandes; sesiones registradas plegadas en Hoy`.

---

### Task 5: Pie de vía (primer uso)

**Files:**
- Create: `lib/datos/arranque.ts`, `lib/datos/arranque.test.ts`, `components/PieDeVia.tsx`
- Modify: `app/(app)/page.tsx` (Hoy), `components/via/Via.tsx` (o la página `/via`), `e2e/zz-navegacion.spec.ts`

**Interfaces:**

```ts
export interface PasosArranque {
  huecos: boolean        // ha declarado al menos un hueco alguna vez
  sesion: boolean        // tiene al menos una sesión registrada
  test: boolean          // tiene al menos una evaluación
  completo: boolean      // los tres
}
export function pasosArranque(d: DatosAtleta): PasosArranque
```

(El perfil no es un paso: sin perfil, `requerirDatos` ya manda a `/perfil`.)

- [ ] **Step 1: Test que falla `lib/datos/arranque.test.ts`** — `datosVacios()` → todo `false`; con un hueco → `huecos: true`; con una sesión sin registro → `sesion: false`, con registro → `true`; con una evaluación → `test: true`; con los tres → `completo: true`. Run → FAIL; implementar → PASS.
- [ ] **Step 2: `components/PieDeVia.tsx`** (servidor) — tarjeta con `Etiqueta` «Pie de vía» y el título «Antes de empezar a escalar», y tres chapas en vertical (de abajo arriba, como la vía): ① «Declara tus huecos de la semana» → botón a `/semana`; ② «Haz y registra tu primera sesión» → a `/entrenar` (o «Empezar sesión» si hay una de hoy aceptada: no hace falta, basta el enlace a Hoy/Entrenar); ③ «Tu primer test de dedos» → texto «El entrenador te lo propondrá cuando toque (en la base, tras unas semanas)» y enlace secundario «Ya lo hice: apuntarlo» a `/progreso`. Cada paso hecho: chapa lima con «✓» y texto atenuado; pendiente: chapa gris y su acción. Solo el primer paso pendiente lleva `BOTON`; los demás, `BOTON_SECUNDARIO` o enlace.
- [ ] **Step 3: Dónde se ve** — en Hoy, debajo de la cabecera y en lugar de la mini-vía mientras `!completo` (si hay largo, la mini-vía va debajo del pie); en Vía, al final de la vía (en el sitio del «Pie de vía» actual) mientras `!completo`.
- [ ] **Step 4: e2e** — en `e2e/zz-navegacion.spec.ts`, comprobar con los datos del e2e (que ya tienen huecos, sesiones registradas y un test) que **no** aparece «Antes de empezar a escalar» en Hoy. (El caso de base vacía lo cubre el test unitario.)
- [ ] **Step 5:** Verificar todo; captura de Hoy con el pie de vía (con la base de pruebas vaciada solo para la captura con `scripts/base-pruebas.ts` y repoblada por el e2e después) en `.superpowers/sdd/tanda4-pie.png`. Commit `feat(arranque): pie de vía con los tres pasos del primer uso en Hoy y en Vía`.

---

## Cierre de la tanda

- [ ] Revisión final de la rama (modelo más capaz): accesibilidad de `Opciones`, formularios sin cambios de `name`/`value`, Semana sin duplicados ni pérdidas, cronómetro sin cambios de lógica, pie de vía correcto.
- [ ] Fusionar en `master`, `npm test` sobre el resultado y, con el visto bueno de Diego, subir a GitHub.
