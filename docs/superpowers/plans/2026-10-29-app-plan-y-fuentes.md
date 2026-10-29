# Material en casa, fuentes y Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Corregir el material de casa (sin multipresa), permitir empezar cualquier día, mostrar el porqué con sus estudios, la posición en el año y dónde se hace cada sesión, y una pantalla Plan con los próximos días, el año y lo que ha cambiado por los resultados.

**Architecture:** Un campo opcional en `Contexto` del motor; lógica pura nueva en `lib/fuentes.ts`, `lib/datos/temporada.ts` y `lib/datos/plan.ts` (con pruebas); UI en `components/PorQue.tsx`, `app/(app)/fuentes/[id]/`, `app/(app)/plan/` y las tarjetas existentes.

**Tech Stack:** Next.js 16.4 (params/searchParams como Promise), React 19, Tailwind 4, Neon, vitest 2, Playwright.

Spec: `docs/superpowers/specs/2026-10-29-app-plan-y-fuentes-design.md` (es la fuente de los textos exactos). Rama: `plan-y-fuentes`.

## Global Constraints

- Texto en español; Diego usa iPhone.
- `multipresaEnCasa` ausente = comportamiento actual del motor (con multipresa). Con `false`, en casa no hay `multipresa-resistencia`, `multipresa-maxima`, `multipresa-resistencia-fuerza`, `evaluacion-dedos` ni `campus` (regla `contexto.material`).
- Nada de inventar evidencia: las fuentes salen de `evidencia/` (`porId`) y `METADATOS`.
- Hay base de datos de pruebas (`E2E_DATABASE_URL`, rama `pruebas` de Neon): las migraciones nuevas se aplican con `npm run migrar:pruebas`; `npm run e2e` se puede ejecutar. **No ejecutar `npm run migrar` (producción)**: lo hará el controlador al final con permiso.
- `npm test`, `npm run tsc` y, en tareas de UI, `npm run build` en verde; en la última tarea también `npm run e2e`.
- Si `next dev` genera un `AGENTS.md` sin seguimiento en git, borrarlo; nunca commitearlo.
- Commits con el trailer exacto `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Motor — material en casa

**Files:** `motor/tipos.ts`, `motor/contexto.ts`, `motor/contexto.test.ts` (o el test de contexto existente), `motor/semana-simulacion.test.ts`.

- [ ] `Contexto` gana `multipresaEnCasa?: boolean   // false: en casa no hay multipresa (solo barra); ausente = sí hay`.
- [ ] En `contexto.ts`: `const NECESITA_MULTIPRESA: ReadonlySet<TipoSesion> = new Set(['multipresa-resistencia', 'multipresa-maxima', 'multipresa-resistencia-fuerza', 'evaluacion-dedos', 'campus'])`; `sinMaterial(t, ctx) = ctx.lugar === 'casa' && ctx.multipresaEnCasa === false && NECESITA_MULTIPRESA.has(t)`; `tiposPosibles` los excluye; `validarContexto` añade la violación `contexto.material` con el mensaje «Sin multipresa en casa no se puede hacer {tipo} en casa: hazla en el rocódromo.» y `explicarContexto('contexto.material', motivo)` (comprobar que `explicarContexto` acepta reglas nuevas; si tiene una lista cerrada de reglas, añadir esta). Actualizar el comentario de `board` («el usuario solo tiene multipresa en casa»).
- [ ] Tests (TDD): con `multipresaEnCasa: false` en casa, `tiposPosibles` no incluye esos 5 tipos y sí `hombro` y `descanso`; con el campo ausente, igual que antes; en rocódromo con `false` siguen todos; `validarContexto` de una multipresa en casa sin material da `contexto.material`.
- [ ] Simulación: en `semana-simulacion.test.ts`, `CASA` pasa a `{ compania: 'solo', lugar: 'casa', minutosDisponibles: 60, multipresaEnCasa: false }` (y el comentario de la cabecera). Ajustar las aserciones si el reparto cambia, manteniendo: martes con gente = `via-cuerda-limite` en fuerza sin descarga ni test; ningún día con dos cargas altas; ninguna regla de seguridad rota; tope de 3 días intensos de dedos. Añadir: ninguna sesión de `NECESITA_MULTIPRESA` en un hueco de casa. Ejecutar con `SIMULACION=1 npx vitest run motor/semana-simulacion.test.ts` y pegar la salida en el informe (para que el controlador revise el reparto).
- [ ] `npm test`, `npm run tsc`; commit `feat(motor): material en casa (sin multipresa no hay suspensiones ni test en casa)`.

### Task 2: Datos y Perfil — material e inicio cualquier día

**Files:** `migraciones/003_material.sql`, `lib/datos/filas.ts`, `lib/datos/_fabrica.ts`, `lib/servidor/consultas.ts` (carga y guardado del perfil), `lib/datos/peticion.ts`, `lib/datos/huecos.ts` (si el contexto del hueco se construye ahí), `app/(app)/perfil/acciones.ts`, `app/(app)/perfil/FormularioPerfil.tsx`, tests de `lib/datos`.

- [ ] Migración: `alter table perfil add column multipresa_en_casa boolean not null default false;`. Aplicar a la base de pruebas: `npm run migrar:pruebas`.
- [ ] `FilaPerfil.multipresa_en_casa: boolean`; `PERFIL` de la fábrica con `multipresa_en_casa: false`; `cargarDatos` lo selecciona y `guardarPerfilBd` lo guarda.
- [ ] `prepararPropuesta`: el contexto de la petición y el de cada hueco llevan `multipresaEnCasa: d.perfil.multipresa_en_casa`. Test: con `multipresa_en_casa: false`, una petición en casa nunca propone multipresa ni test (principal ni alternativas), y los huecos de casa del plan tampoco; con `true`, el comportamiento de antes (alguna multipresa posible en casa en fase de fuerza).
- [ ] Perfil: casilla «Tengo multipresa en casa» (`name="multipresa_en_casa"`, desmarcada por defecto, marcada si el perfil la tiene); la acción la lee (`fd.get(...) === 'on'`). Inicio de la temporada: etiqueta «Inicio de la temporada», ayuda con el texto exacto del spec §3, y la acción guarda `lunesDe(fecha)`. Test unitario si la conversión vive en una función pura (p. ej. `inicioTemporadaDe(fecha)`); si no, extraerla a `lib/` y probarla (jueves 2026-10-29 → 2026-10-26).
- [ ] El e2e del primer test rellena el inicio con un lunes: sigue valiendo.
- [ ] `npm test`, `npm run tsc`, `npm run build`; commit `feat(perfil): multipresa en casa y temporada desde cualquier día`.

### Task 3: Por qué y fuentes

**Files:** `lib/fuentes.ts`, `lib/fuentes.test.ts`, `components/PorQue.tsx`, `app/(app)/fuentes/[id]/page.tsx`.

- [ ] `lib/fuentes.ts` (puro): `NIVEL_TEXTO` (spec §4); `estudio(id): { id, cita, titulo, publicacion, doi, url } | null` con la cita «Apellido et al. (año)» (un autor: «Apellido (año)»; dos: «A y B (año)») a partir de `porId(id).fuentes[0]` (si hay varias fuentes, la cita usa la primera y la página muestra todas); `basesDe(explicaciones): { parametro, titulo, nivel, nivelTexto, estudios }[]` sin repetir parámetros.
- [ ] Tests: todos los ids de `evidencia` de todos los `METADATOS` resuelven con `estudio` (si alguno no existe, el test lo nombra: es un fallo de datos que hay que reportar, no ocultar); formato de cita con 1, 2 y 3+ autores; `basesDe` sin duplicados y con el nivel en palabras; parámetro de diseño sin estudios.
- [ ] `PorQue`: tras el motivo, «En qué se basa:» con cada base «Título · nivel en palabras» y sus estudios como enlaces «cita» (a `url`, `target="_blank" rel="noopener noreferrer"`) y «detalle» (a `/fuentes/<id>`). Mantener `<details>` plegado.
- [ ] `/fuentes/[id]`: página de servidor (pasa por el layout autenticado como el resto de `app/(app)`): afirmación, cada fuente (autores, año, título, publicación, DOI enlazado), nivel en palabras, «A quién se aplica» (`aplicaA`), limitaciones y verificación (`verificada.metodo`: «texto completo» / «solo resumen»). Id inexistente: «Estudio no encontrado» y enlace a Hoy.
- [ ] `npm test`, `npm run tsc`, `npm run build`; commit `feat(fuentes): por qué con los estudios y página de cada fuente`.

### Task 4: Posición en el año y dónde se hace

**Files:** `lib/datos/temporada.ts`, `lib/datos/temporada.test.ts`, `lib/nombres.ts`, `components/ContextoTemporada.tsx`, `components/PlanSesion.tsx`, `app/(app)/entrenar/ResultadoPropuesta.tsx`, `app/(app)/_hoy/TarjetaSesion.tsx`, `app/(app)/page.tsx` (pasar la posición), `app/(app)/sesion/[id]/page.tsx` y `Cronometro.tsx`, `app/(app)/entrenar/acciones.ts` (si la posición viaja en la preparación).

- [ ] `posicionEnTemporada(d, fecha): { semana, total, ciclo, faseId, fase, semanaDeFase, semanasDeFase, descarga, reevaluar } | null` usando `temporadaDe(d)` y `semanaEnFecha`; `semanasDeFase` = número de semanas consecutivas con esa fase en ese ciclo. Tests con la temporada por defecto (2026-11-02 → 2027-10-04): primera semana, una semana de fuerza, una descarga, fuera de temporada (antes y después).
- [ ] `OBJETIVO_FASE` y `DONDE_SE_HACE` en `lib/nombres.ts` con los textos del spec §5 (para `OBJETIVO_FASE` escribir una frase por fase basándose en `docs/evidencia/conclusiones.md` y en los comentarios de `motor/fases.ts`; sin cifras que no estén allí). Test: todas las claves de `TIPOS_SESION` y de `FaseId` tienen texto.
- [ ] `ContextoTemporada({ posicion })`: «Semana 3 de 49 · Ciclo 1 · Fuerza de dedos (semana 2 de 8)» + «· semana de descarga» / «· semana de test», y debajo `OBJETIVO_FASE`. Mostrarlo en `ResultadoPropuesta`, en `TarjetaSesion` (solo si la sesión tiene propuesta) y en la pantalla inicial del cronómetro. La posición se calcula en el servidor (páginas) y se pasa por props.
- [ ] `PlanSesion` muestra «Dónde: {DONDE_SE_HACE[tipo]}» bajo el título.
- [ ] `npm test`, `npm run tsc`, `npm run build`; commit `feat(plan): dónde encaja cada sesión en el año y dónde se hace`.

### Task 5: Pantalla Plan y e2e

**Files:** `lib/datos/plan.ts`, `lib/datos/plan.test.ts`, `app/(app)/plan/page.tsx`, `app/(app)/layout.tsx`, `e2e/flujo.spec.ts`.

- [ ] `PATRON_HABITUAL` (spec §6) y `proximosDias(d, ahora): { semanas: { lunes, orientativo, huecos: { hueco: Hueco; estado: 'aceptada' | 'planeada' | 'libre' | 'sin-plan' | 'pasado'; sesion?: Sesion; cargaAlta?: boolean }[]; aviso?: string }[] }` para esta semana y la siguiente. Reutilizar `vistaSemana` para las semanas con huecos declarados; para las del patrón, crear `FilaHueco` en memoria (ids estables tipo `patron-<fecha>-<min>`) y la misma lógica (extraer de `vistaSemana` lo que haga falta en vez de duplicarlo). Para la semana siguiente, añadir al historial las sesiones planeadas de esta (como `FilaSesion` sin registro, ids `plan-…`) antes de calcular. Capturar errores del motor con aviso.
- [ ] `vistaAno(d, hoy)` y `cambiosPorResultados(d, hoy)` (spec §6). Para la carga de repeaters usar las funciones del motor (`lastreRepeaters`, `evaluacionVigente`) y la fracción que el motor usaría (70 % u 80 % según las sesiones válidas: si existe una función exportada para la progresión, usarla; si no, mostrar solo el lastre del último test y «la carga exacta sale en cada sesión de multipresa» — no reimplementar la progresión).
- [ ] Tests: patrón usado cuando no hay huecos (orientativo) y huecos declarados cuando los hay; la semana siguiente no repite lo que la primera ya cubre (p. ej. el test de dedos no aparece en las dos); `vistaAno` marca la semana actual; `cambiosPorResultados` sin test y con test; ningún error del motor rompe la vista.
- [ ] Página `/plan`: «Próximos días» (por semana: cabecera, «orientativo: declara tus huecos en Mi semana» si aplica, filas con día, hora, lugar, sesión con ★, «Dónde: …», enlace Preparar como en Mi semana), «Qué ha cambiado por tus resultados» y «El año» (lista compacta, semana actual resaltada). Menú: Hoy · Mi semana · Plan · Entrenar · Evaluación · Perfil.
- [ ] e2e (añadir al final): entrar, abrir Plan, ver «Próximos días» y «El año»; abrir un «¿Por qué?» en Entrenar o Plan y seguir un enlace «detalle» a `/fuentes/…` que muestre «Limitaciones».
- [ ] `npm test`, `npm run tsc`, `npm run build`, `npm run migrar:pruebas` (por si acaso) y `npm run e2e` en verde; commit `feat(plan): pantalla Plan con próximos días, el año y lo que ha cambiado`.
