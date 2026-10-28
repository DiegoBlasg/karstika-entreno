# App: pantalla «Mi semana» (huecos declarados y plan semanal)

Fecha: 2026-10-28 · Estado: aprobado en brainstorming, pendiente de revisión escrita

## 1. Problema

El motor ya planifica la semana si recibe los huecos que quedan (tramo 2e, P-67), pero la app no se los pasa: cada
sesión se decide sola, sin mirar el resto de la semana. Además, al registrar una sesión hay que volver a apuntar las
molestias que ya se dieron en el chequeo de ese día.

## 2. Objetivo

- Diego declara cada semana, **desde cero**, sus huecos: día, hora, compañía, lugar y minutos.
- «Mi semana» manda: lista los huecos con lo que el motor planea en cada uno y un botón **Preparar** que abre Entrenar
  ya relleno con ese hueco.
- Cualquier petición de sesión (desde un hueco o improvisada en Entrenar) pasa al motor los huecos que quedan después
  en esa semana.
- El formulario de registro sale con las molestias del chequeo de ese día.

Fuera de alcance: copiar semanas o patrones fijos (decisión de Diego: desde cero cada semana), modo cronómetro, tests
guiados y el resto de la entrega 2.

## 3. Datos

Migración `migraciones/002_huecos.sql`:

```sql
create table huecos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  inicio_min integer not null check (inicio_min between 0 and 1439),   -- minutos desde las 00:00
  compania text not null check (compania in ('solo', 'con-gente')),
  lugar text not null check (lugar in ('casa', 'rocodromo', 'roca')),
  minutos integer not null check (minutos between 10 and 600),          -- MINUTOS_DISPONIBLES
  creado_en timestamptz not null default now(),
  check (inicio_min + minutos <= 1440)                                   -- no cruza la medianoche
);
create index huecos_fecha on huecos (fecha);
```

- La hora se guarda en minutos enteros (como se comparan los solapes en `validarDatos`). Para el motor,
  `horaInicio = inicio_min / 60`.
- `DatosAtleta` gana `huecos: FilaHueco[]`, que se cargan con el resto de datos en `requerirDatos`.

**Reglas al añadir un hueco** (servidor, en `validarDatos` y en la acción). Mensajes en español:

1. No en un día pasado (`fecha >= hoy` en Madrid).
2. Como mucho **9 por semana natural** (lunes a domingo): el motor admite 8 huecos por delante del que se prepara (P-67).
3. Como mucho **2 por día** (`MAX_POR_DIA` del motor).
4. Sin solapes con otro hueco del mismo día (intervalos `[inicio, inicio + minutos)` en minutos enteros).

La inserción va con guarda atómica en SQL (`insert … select … where` cuenta los de la semana y del día y comprueba
solapes), como las demás guardas de `consultas.ts`, para que dos envíos simultáneos no se salten los topes.

**Borrar** un hueco nunca borra sesiones: la sesión aceptada en ese hueco se queda.

## 4. Lógica (pura, en `lib/datos/semana.ts`)

- **Hueco ocupado:** hay una sesión guardada (de `sesiones`, aceptada o libre) el mismo día cuyo intervalo
  `[horaInicio, horaInicio + duracionMin)` se solapa con el del hueco. Esa sesión ya está en el historial del motor.
- **`huecosPosteriores(d, entrada)`:** los huecos de la misma semana natural que `entrada.fecha` que empiezan después
  de `entrada` (mismo día con inicio posterior o días siguientes), que no se solapan con la sesión pedida y que no están
  ocupados, ordenados por fecha y hora, como `Hueco[]` del motor.
  - Si esa semana no tiene **ningún** hueco declarado, devuelve `undefined`: el motor decide como antes, día a día.
  - Si tiene huecos pero no queda ninguno posterior, devuelve `[]`: el motor usa el plan igualmente (spec 2e §9).
- **`prepararPropuesta`** añade `huecos: huecosPosteriores(d, e)` a la `Peticion`. Como `aceptar` vuelve a ejecutar
  `prepararPropuesta` con los datos de la base de datos, la propuesta aceptada coincide con la vista (si entre medias
  cambian los huecos, cambia la propuesta y `aceptar` lo detecta como ahora).
- **`vistaSemana(d, lunes, ahora)`:** para la semana que empieza en `lunes` devuelve:
  - la cabecera: lunes, domingo, fase y si es de descarga (con la temporada recalculada, `temporadaDe`);
  - cada hueco con un estado:
    - `pasado`: ya terminó (`fecha + inicio + minutos <= ahora`);
    - `ocupado`: con la sesión que lo ocupa (nombre, si es de carga alta y si está registrada);
    - `planeado`: con la sesión que planea el motor (nombre y si es de carga alta);
    - `libre`: el plan lo deja sin entrenar;
  - un aviso si no hay plan: zona en rojo («cada día se decide con el estado de ese día»), fuera de temporada (el
    mensaje de `prepararPropuesta`) o ningún hueco pendiente.
- **Cómo sale el plan:** se llama a `prepararPropuesta` con el **primer hueco pendiente** (ni pasado ni ocupado) como
  entrada. La principal (o su ausencia con `descanso`) es lo de ese hueco; `propuesta.semana` da el resto. Un hueco
  pendiente que no aparezca en `semana` (p. ej. zona en rojo) queda sin estado de plan y la vista lo muestra solo con
  el botón Preparar. La vista no guarda nada (ni chequeo ni consejos).

**Molestias en el registro:** `vistaHoy` adjunta a cada sesión las molestias del chequeo de su fecha. `TarjetaSesion`
pasa a `CamposMolestias` `iniciales = registro previo ?? molestias del chequeo ?? []`.

## 5. Pantalla

- **Menú:** Hoy · **Mi semana** · Entrenar · Evaluación · Perfil.
- **`/semana?lunes=AAAA-MM-DD`** (sin parámetro: la semana actual; solo se aceptan la actual y la siguiente):
  - Cabecera: «Semana 2–8 nov · Fuerza» (con «(descarga)» si toca) y enlaces «Semana siguiente →» / «← Esta semana».
  - Lista de huecos por día y hora: «Lun 9:00 · casa · solo · 60 min» y su estado:
    - planeado: nombre de la sesión, ★ si es de carga alta, botón **Preparar**;
    - libre: «Libre: no hace falta entrenar» y **Preparar** por si te apetece;
    - ocupado: nombre de la sesión, «Aceptada» o «Registrada», enlace a Hoy;
    - pasado: en gris, sin botones.
  - Cada hueco no pasado tiene ✕ para borrarlo; si está ocupado pide confirmación (la sesión no se borra).
  - **Añadir hueco:** día (desplegable con los días no pasados de esa semana), hora, con quién, dónde, minutos. Por
    defecto «casa · solo · 60»; al elegir rocódromo o roca los minutos pasan a 90. Se envía con `enviarSinVaciar`.
  - Semana vacía: texto de primer uso: «Declara los huecos que tienes esta semana. Cuantos más declares, mejor reparte
    el motor los días intensos.»
- **Preparar** enlaza a `/entrenar?fecha=…&hora=HH:MM&compania=…&lugar=…&minutos=…`. Entrenar lee esos parámetros
  (validados con las mismas reglas que el formulario; si alguno no vale se ignora y sale el valor por defecto). Si es
  hoy, pide el chequeo como siempre.
- **Resultado en Entrenar:** si la propuesta trae `semana`, debajo sale «Así queda tu semana» con cada hueco y su sesión
  (o «libre»), y las explicaciones del plan del motor como el resto.
- **Hoy:** una línea con el próximo hueco pendiente de la semana y lo planeado («Próximo hueco: mar 19:00 · Vía al
  límite ★») con enlace a Mi semana, usando `vistaSemana`.

## 6. Errores y pruebas

- Acciones de huecos (`añadirHueco`, `borrarHueco`) con `bd()` como las demás (re-comprueban la sesión), errores en
  `EstadoAccion` y mensajes en español.
- **Unitarias (vitest, `lib/datos`):**
  - `huecosPosteriores`: misma semana, solo posteriores, excluye ocupados y los que se solapan con la sesión pedida,
    `undefined` sin huecos declarados, `[]` cuando no queda ninguno.
  - Reglas de añadir: día pasado, 10.º de la semana, 3.º del día, solape.
  - `vistaSemana`: pasado, ocupado, planeado, libre, zona en rojo sin plan, fuera de temporada, semana vacía.
  - Molestias: el registro sale con las del chequeo y, si ya hay registro, con las del registro.
  - Parámetros de Entrenar: los válidos rellenan, los no válidos se ignoran.
- **`probar-bd`:** casos nuevos rechazados por las restricciones de `huecos` (hora fuera de rango, minutos fuera de
  rango, cruza la medianoche, compañía y lugar no válidos).
- **e2e:** declarar huecos, ver el plan, Preparar, aceptar y ver el hueco ocupado. Se ejecuta cuando exista la base
  de datos de Neon; hasta entonces, unitarias, `tsc` y `next build`.
