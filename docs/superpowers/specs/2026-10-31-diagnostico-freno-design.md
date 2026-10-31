# Diagnóstico sin registro por caída: «¿Qué te frenó hoy?» y perfil en Progreso

Fecha: 2026-10-31 · Rama: `diagnostico-freno` · Base: informe `docs/evidencia/informe-2026-10-31-tests-ejercicios.md`

## Por qué

El limitante principal (que reparte las 14 semanas de fuerza + resistencia del ciclo 2) sale hoy de **≥ 10 caídas con
motivo en 8 semanas**, anotadas una a una con «+ intento». Es un tostón, casi nunca se llega a 10 y entonces manda el
orden por defecto P-23 (fuerza de dedos primero), aunque los tests digan que la resistencia está estancada.

El informe concluye que ningún instrumento validado diagnostica el limitante individual, que el registro por caída no
compra precisión demostrada, que una pregunta al día tiene ~90 % de cumplimiento y que los tests físicos deben mandar
sobre la autoatribución en lo físico.

## Decisiones de Diego (2026-10-31)

1. Se **quita «+ intento»**. Los intentos ya guardados se conservan (encadenes y logro), pero el diagnóstico deja de usarlos.
2. Pregunta única **«¿Qué te frenó hoy?»** con **5 botones**: Me bombeé · No aguantaba las presas · No vi o no leí el
   movimiento · Miedo, no me atreví · Nada, buen día. Opcional.
3. Debajo, casilla-botón opcional **«✓ Hoy encadené algo al límite»** (1 encadene por sesión).
4. Regla del motor: **tus respuestas → corregidas por los tests en lo físico → tests solos → P-23**.
5. Progreso muestra **lo que más te limita** y **lo que mejor llevas**, con su origen; si no se sabe, lo dice.
6. Sin maqueta visual: mismo sistema de diseño (Opciones, Tarjeta, Etiqueta, CifraGrande), intuitivo y móvil.

## 1. Registro

- Dónde: `FormularioRegistro` y `FormularioEntrenamientoLibre`, solo si `TIPOS_CON_INTENTOS.includes(tipo)` (vía al
  límite, bloque al límite, board, pegues al proyecto). Sustituye a `CamposIntentos`.
- Componente nuevo `app/(app)/_hoy/CamposFreno.tsx`:
  - `<Opciones>` de radio con nombre `freno`, 5 opciones, ninguna marcada por defecto. Leyenda «¿Qué te frenó hoy?».
    Con `previo`, precargado.
  - Casilla `encadene` estilada como botón de 44 px: «✓ Hoy encadené algo al límite».
- Valores: `freno ∈ {'bombeo','paso-fuerza','tecnica-lectura','cabeza','nada'}` o nulo; `encadene: boolean`.
  Se reutilizan los ids de `MotivoCaida` + `'nada'` para no tocar `NOMBRE_MOTIVO` más que añadiendo textos.
- Textos de botón (`NOMBRE_FRENO` en `lib/nombres.ts`): bombeo «Me bombeé», paso-fuerza «No aguantaba las presas»,
  tecnica-lectura «No vi o no leí el movimiento», cabeza «Miedo, no me atreví», nada «Nada, buen día».
- `lib/formulario.ts`: `freno(fd)` y `encadene(fd)`; se elimina `intentos(fd)` y `MAX_INTENTOS`.
- Acciones (`app/(app)/_hoy/acciones.ts`): registrar, corregir y entrenamiento libre guardan `freno` y `encadene` en
  `registros`; dejan de insertar en `intentos_limite`. Al corregir un registro antiguo con intentos, los intentos se
  conservan (no se borran ni se editan).
- Corrección: misma ventana de 7 días que el resto del registro; `TarjetaSesion` pasa `freno`/`encadene` como previo.

## 2. Datos

Migración `migraciones/004_freno.sql`:

```sql
alter table registros
  add column freno text check (freno in ('bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza', 'nada')),
  add column encadene boolean not null default false;
```

- La tabla `intentos_limite` se queda (solo lectura desde la app).
- La rama `escaladas` (pausada) tenía su propia 004, nunca aplicada en producción: al retomarla se renumera a 005.
- `FilaRegistro` gana `freno` y `encadene`; `scripts/probar-bd.ts` añade casos (check de valores, default false).

## 3. Motor (`motor/diagnostico.ts`)

Nueva firma: `diagnosticar(evaluaciones, frenos, fecha)` con `frenos: { fecha: string; freno: Freno }[]`,
`Freno = MotivoCaida | 'nada'`. Se elimina `IntentoLimite` del motor (y `intentosMotor` del mapeo).

Progreso de los tests: sin cambios (`progreso()`: 3 mediciones, 2 últimas ≥ ±5 %, técnica ±1 punto).

Regla del limitante principal, en orden; la primera que aplique decide:

1. **Respuestas.** Ventana 56 días hasta `fecha`. `n` = respuestas distintas de `'nada'`. Si `n ≥ 6` y algún motivo
   tiene ≥ 40 % de `n` → candidato = ese motivo (empate → orden P-23). Si no hay mayoría, no hay candidato por respuestas.
2. **Corrección por tests** (solo si el candidato es físico: fuerza-dedos o resistencia). Veredicto de tests:
   - `fuerza` mejora y `resistencia` no mejora (sin-cambio o empeora) → **resistencia**;
   - `resistencia` mejora y `fuerza` no mejora → **fuerza-dedos**;
   - otro caso (alguna sin datos, ambas mejoran, ambas no) → sin veredicto.
   Con veredicto, sustituye al candidato físico. Cabeza y técnica no se corrigen (los tests no las miden).
3. **Tests solos**, si no hubo candidato por respuestas y hay veredicto → el veredicto.
4. **P-23** si nada de lo anterior.

`limitantes` = el principal primero y el resto en orden P-23.
`fuente: 'respuestas' | 'tests' | 'respuestas-y-tests' | 'evidencia'` (sustituye a `'caidas'`).
`frenos: Record<Limitante, number>` y `nada: number` sustituyen a `caidas`. Cada rama lleva su `explicar(...)` con
P-23 y el parámetro nuevo.

**Fortaleza** (`fortaleza: { cualidad: Limitante; fuente: 'tests' | 'respuestas' } | null`):
- Por tests: la cualidad (fuerza-dedos, resistencia o técnica 1-7) con tendencia `mejora` cuando al menos otra con
  datos no mejora. Si varias mejoran y otra no, gana la de mayor cambio relativo; si todas mejoran o ninguna, nada.
- Si no, por respuestas: con `n ≥ 6`, el único motivo con 0 menciones (si hay varios con 0, nada).
- Si no, `null`.
- Nunca puede coincidir con el limitante principal; si coincide, `null`.

Parámetros nuevos en `docs/evidencia/parametros.md` (se regenera `motor/metadatos.ts` con `npm run metadatos`):
- **P-69** Diagnóstico por respuesta de cierre: 1 pregunta por sesión al límite, 5 opciones, ventana 56 días, ≥ 6
  respuestas, mayoría ≥ 40 %. `sinEvidencia`; cita el informe (cumplimiento de 1 aviso/día; grado autoinformado
  válido, Draper 2011; ninguna regla de diagnóstico validada).
- **P-70** Los tests corrigen la autoatribución física (veredicto fuerza vs resistencia). `sinEvidencia`; cita Berta
  2025 y Augste 2022 (dedos y resistencia como dos caras), Devise 2022 (mejora más lo más débil).
- **P-71** Fortaleza mostrada: solo con datos propios. `sinEvidencia`.
- P-23: añadir en notas que deja de depender de caídas y queda como valor por defecto.
- Se corrige de paso la incoherencia «multipresa en casa» de la cabecera y P-17 (Diego no tiene multipresa en casa).

`ajusteCiclo2` no cambia (sigue tomando `limitantes[0]`). Sus textos de motivo se ajustan («te caes por bombeo» →
«te frena el bombeo»).

## 4. Capa de datos y llamadas

- `lib/datos/mapeo.ts`: `frenosMotor(registros)` → filas con `freno` no nulo.
- `peticion.ts`, `plan.ts`, `validar.ts`: pasan `frenosMotor(...)` en lugar de `intentosMotor(...)`.
- `lib/datos/progreso.ts`:
  - `resumenEscalada.encadenes` = intentos encadenados (históricos) + registros con `encadene`.
  - `ultimaCaida` → `ultimoFreno`: el `freno` distinto de `'nada'` más reciente (fallback: último motivo de intento antiguo).
  - Logro «Primer encadene»: la primera fecha entre intentos encadenados y registros con `encadene`.
- `lib/datos/perfil-limitantes.ts` (nuevo, puro): `vistaPerfil(datos, hoy)` → `{ limita: { limitante, origen }, fuerte:
  { cualidad, origen } | null, plan: string }`. `plan` = explicación de `ajusteCiclo2` con el reparto (si el ciclo 2
  ya está fijado, el fijado; si no, «si sigue así, en abril…»).

## 5. Progreso

Tarjeta nueva `components/progreso/Perfil.tsx`, debajo de «Fuerza de dedos»:

- `Etiqueta` «Tu perfil».
- **Lo que más te limita**: nombre en `font-titular` grande (color `cima`), debajo una línea `text-texto-2` con el
  origen («Según lo que respondes al terminar», «Según tus tests», «Según tus respuestas, corregido por tus tests»,
  «Orden general de los estudios: aún no hay datos tuyos»). Después, la frase del plan.
- **Lo que mejor llevas**: nombre en color `progreso` + origen; o «Aún no lo sabemos: hacen falta 3 tests o unas
  semanas respondiendo al terminar».
- Sin datos propios, una línea que explique cómo se llena: «Responde “¿Qué te frenó hoy?” al terminar tus sesiones al
  límite».

Tarjeta Grado: «Última caída: X» → «Último freno: X».

## 6. Errores y bordes

- Freno inválido en el formulario → error de validación como el resto de campos (`opcion()`).
- Respuesta solo con `'nada'` cuenta para nada salvo para mostrarse; no suma a `n`.
- Registros futuros no cuentan (la ventana corta en `fecha`).
- Validación de datos (`validar.ts`) sigue llamando al diagnóstico para detectar datos rotos.

## 7. Pruebas

- Motor: cada rama de la regla (respuestas solas, sin mayoría, corrección por tests en ambos sentidos, cabeza/técnica
  no corregidas, tests solos, P-23), empates, ventana de 56 días, `'nada'` no cuenta, fortaleza (tests, respuestas,
  ninguna, coincide con limitante → null).
- Datos: `frenosMotor`, `resumenEscalada` (encadenes mezclados), `vistaPerfil`, logro primer encadene.
- Formulario: `freno()`/`encadene()`.
- `probar-bd`: check de `freno`, default de `encadene`.
- e2e: registrar una sesión al límite marcando freno + encadene, ver «Último freno» y la tarjeta «Tu perfil».

## Cambios tras la revisión (Diego, 2026-10-31)

- **El board también pregunta** «¿Qué te frenó hoy?» (`TIPOS_AL_LIMITE` = vía al límite, bloque al límite, pegues al proyecto y board).
- **El ciclo 2 no cambia hacia atrás.** Migración `005_evaluaciones_creada_en.sql` (`evaluaciones.creada_en`). El reparto
  se fija con `diagnosticoCiclo2(d, lunes)` (`lib/datos/peticion.ts`), que solo usa los tests y registros guardados antes
  de las 0:00 UTC del lunes del ciclo 2. Queda una arista aceptada: corregir después del lunes un registro de los 7 días
  anteriores conserva su `registrado_en` y sí cuenta.
- **Textos honestos.** Sin datos propios, «Lo que suele limitar más» en neutro y «Si no cambia…»; con pocas respuestas,
  «llevas N de 6»; dentro del ciclo 2, «se fijó el … apuntando a …». Explicaciones que distinguen «N de 6» y «sin
  mayoría». «¿Por qué?» en la tarjeta, con una explicación de la fortaleza que cita P-71.
- **Fortaleza:** si lo que más mejora es el limitante principal, se toma la siguiente que mejora.
- **Pregunta en el móvil:** «Quitar respuesta», ✓ solo al marcar «Hoy encadené algo al límite» (en lima), botones de
  igual altura y la última opción a lo ancho. «Último freno» pasa a «Lo último que te frenó».
- **Encadenes:** una sesión con intentos antiguos encadenados y la casilla marcada cuenta una vez.
- La rama `escaladas` renumerará su migración a **006**.

## Fuera de alcance (cola, en este orden)

Batería de tests nueva → biblioteca ampliada → Escaladas con señales automáticas (brecha a vista-encadene, primero vs
top-rope, etiqueta de proyecto).
