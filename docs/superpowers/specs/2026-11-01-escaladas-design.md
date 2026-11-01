# Escaladas: encadenes y proyectos

Fecha: 2026-11-01 · Rama: `escaladas-2` · Sustituye a `2026-10-30-app-escaladas-design.md` (basada en ampliar
`intentos_limite`, que desde la migración 004_freno es solo lectura).

## Decisiones de Diego (2026-11-01)

1. Se apuntan **los encadenes y los proyectos** (no cada pegue ni cada caída: anotar cada caída es un tostón).
2. El nivel **se enseña y da una pista**; no cambia las sesiones (no hay umbrales de grado con estudio para prescribir).
3. Todo vive **en Progreso** (la barra sigue con 5 secciones) y en el registro de las sesiones al límite.

## 1. Datos: migración `008_escaladas.sql`

Tabla nueva `escaladas`; `intentos_limite` no se toca (solo lectura).

| columna | tipo | regla |
| --- | --- | --- |
| `id` | uuid pk | |
| `fecha` | date not null | |
| `sesion_id` | uuid null → `sesiones(id)` on delete cascade | null = apuntada suelta en Progreso |
| `tipo` | text not null | `via` o `bloque` |
| `lugar` | text not null | `rocodromo` o `roca` |
| `grado` | text null | de la escala de su tipo (check con las listas de `lib/escaladas/grados.ts`); obligatorio salvo en `pegues` |
| `estilo` | text not null | `a-vista`, `flash`, `encadenada` (trabajada) o `pegues` (día de pegues a un proyecto sin encadenarlo) |
| `pegues` | integer not null default 1 | 1-50 |
| `nombre` | text null | 1-80 caracteres |
| `proyecto` | boolean not null default false | |
| `creada_en` | timestamptz default now() | |

Checks: `estilo = 'pegues'` → `proyecto`; `proyecto` → `nombre` no nulo; `estilo <> 'pegues'` → `grado` no nulo.
Un proyecto se identifica por `(nombre normalizado, tipo, lugar)`; su grado es el del último registro que lo tenga.

Escalas (ya en `lib/escaladas/grados.ts`, con un test que las compara con el check): vías en francés 4a…9a con `+` en
cada letra desde el 5; bloques en Font 4…8A+. `distanciaGrados` cuenta escalones (6b → 7a = 4).

## 2. Apuntar

- **Registro de una sesión al límite** (`CamposFreno`, tipos de `TIPOS_AL_LIMITE`): al marcar «Hoy encadené algo al
  límite» aparece una línea: vía o bloque (preelegido: bloque en `bloque-limite` y `board`, vía en el resto), grado y
  cómo (a vista · flash · trabajada). «+ otra» añade líneas (como mucho 5). El lugar sale del contexto de la sesión
  (roca si la sesión es en roca; si no, rocódromo). Si no se elige grado, la línea no se guarda (la casilla «encadené»
  sigue valiendo como antes).
- **Sesión `pegues-proyecto`**: además, «Pegues a un proyecto»: elegir un proyecto abierto o «nuevo» (nombre y grado),
  nº de pegues (1 por defecto) y «¿Lo encadenaste?». Encadenado → una fila `encadenada` con `proyecto` y esos pegues;
  si no → una fila `pegues`.
- Al corregir un registro se reemplazan las escaladas de esa sesión.
- **Progreso, «+ Apuntar escalada»** (suelta): fecha (hasta hoy, desde hace 30 días), vía/bloque, roca/rocódromo,
  grado, cómo (a vista · flash · trabajada · pegues a un proyecto), nombre (obligatorio si es proyecto), «es un
  proyecto» y nº de pegues.
- Las escaladas de la lista se pueden borrar (las de una sesión, también desde su registro).

## 3. Progreso: «Tu nivel» (sustituye a la tarjeta «Grado»)

`lib/escaladas/nivel.ts` (puro), `vistaNivel(escaladas, perfil, hoy)`:
- Por lugar (roca primero) para **vías**: máximo encadenado (cualquier estilo menos `pegues`) y máximo a vista o
  flash, en los últimos 90 días y de siempre (si difieren, se enseñan los dos).
- **Objetivo**: «Objetivo 7a en roca: te faltan N grados» con `distanciaGrados` desde el máximo encadenado en roca (de
  siempre); sin vías en roca, desde el de rocódromo con la nota «en rocódromo»; sin nada, el grado del perfil como
  ahora («Grado actual según tu perfil»).
- **Bloque**: una línea con el máximo encadenado (90 días).
- **Proyectos abiertos**: nombre, tipo, lugar, grado, pegues totales y fecha del último; los encadenados en los
  últimos 90 días salen como «Encadenado el …».
- Se mantienen el número de encadenes al límite y «Lo último que te frenó».
- Los encadenes con grado cuentan también para el logro «Primer encadene».

## 4. La pista (P-75, `sinEvidencia`)

Si en los últimos 90 días, en un mismo lugar y en vías, el máximo encadenado (trabajado) está **4 escalones o más**
(2 grados, p. ej. 6a a vista frente a 6c trabajado) por encima del máximo a vista o flash, «Tu perfil» muestra la pista: «Encadenas
bastante por encima de lo que haces a vista: trabajar la lectura y la táctica puede darte grado». Necesita al menos un
encadene a vista o flash y uno trabajado en esa ventana. Fuente: informe 2026-10-31 (tabla de señales derivadas: una
diferencia de ~1 grado es lo normal según consenso de foros, C; el umbral de 2 grados no tiene estudio). No cambia el
diagnóstico ni las sesiones.

## 5. Pruebas

- Grados: orden, escalas, inválidos, distancia; el check de la migración coincide con las listas.
- `vistaNivel`: ventana de 90 días, vía frente a bloque, a vista frente a trabajado, pegues no cuentan como encadene,
  objetivo desde roca o rocódromo, sin datos → perfil.
- Proyectos: agrupación por nombre normalizado, pegues sumados, paso a encadenado.
- Pista: sale con 4 escalones y no con 3; necesita los dos estilos; solo mismo lugar.
- `probar-bd`: checks nuevos.
- e2e: registrar una sesión al límite con un encadene; apuntar una suelta y verla en «Tu nivel»; proyecto con un día
  de pegues y luego encadenado.
