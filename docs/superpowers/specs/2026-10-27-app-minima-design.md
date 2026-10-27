# Karstika Entreno — App mínima (subproyecto 3)

Fecha: 2026-10-27 · Estado: aprobado en brainstorming, pendiente de revisión escrita

## 1. Objetivo y alcance

Primera interfaz del entrenador: una app web (Next.js App Router + Supabase + Vercel) que carga los datos del usuario,
llama al motor ya terminado (`motor/`) y guarda lo que propone y lo que el usuario hace. La app **no contiene lógica
de entrenamiento**: toda decisión sale del motor.

Se entrega en dos partes:

- **Entrega 1 (antes del lunes 2026-11-02, inicio de la temporada):** acceso, aviso médico, Perfil, Evaluación (formulario),
  Entrenar (contexto + chequeo + propuesta + aceptar), Hoy (sesión aceptada, registro al terminar, «No la hice»,
  «Hice otra cosa») y alta del fisioterapeuta para las zonas en rojo.
- **Entrega 2:** modo sesión con temporizador (suspensiones, 4×4, ARC) y tests guiados con temporizador.

Fuera de alcance (subproyecto 4): Plan, Progreso, Escaladas, Biblioteca, modo sin conexión, PWA instalable,
confirmación de datos atípicos, dominio propio.

## 2. Arquitectura

- Mismo repo `D:\karstika-entreno`. Next.js se instala en la raíz; `app/` (rutas) convive con `motor/`. Antes de
  escribir código se lee la guía de la versión instalada en `node_modules/next/dist/docs/`.
- **El motor se ejecuta en el servidor.** Las pantallas leen de Supabase en Server Components; las acciones
  (proponer, aceptar, registrar, alta) son Server Actions que llaman al motor y escriben en Supabase.
- `lib/datos/`: funciones **puras** que traducen filas de la base de datos a tipos del motor (`Peticion`,
  `Seguimiento`, `EvaluacionDedos[]`, `IntentoLimite[]`) y la propuesta a filas. Sin Supabase dentro: reciben
  filas y devuelven objetos, para poder probarlas con vitest como el motor.
- `lib/supabase/`: clientes de servidor y de navegador (`@supabase/ssr`) y tipos de la base de datos escritos a mano.
- `motor/` no cambia en este subproyecto salvo que una prueba de integración destape un fallo; si pasa, se arregla
  en el motor con su prueba y su parámetro, nunca con un parche en la app.

## 3. Datos (Supabase, proyecto nuevo)

Proyecto Supabase nuevo, independiente de Karstika. Todas las tablas llevan `user_id uuid not null default auth.uid()
references auth.users on delete cascade`, RLS activada y una política por operación limitada a `user_id = auth.uid()`.

| Tabla | Contenido |
|---|---|
| `perfiles` | `user_id` (PK), `peso_kg`, `anos_escalando`, `lesiones text[]`, `grado_actual`, `grado_objetivo` (solo se muestran), `inicio_temporada`, `objetivo_temporada` (fechas), `aviso_aceptado_en` |
| `evaluaciones` | `fecha`, `peso_corporal_kg`, `lastre_kg`, `resistencia_s` (nulo), `tecnica` (nulo, 1-7) |
| `sesiones` | `id` (uuid, se usa como `Sesion.id`), `fecha`, `sesion jsonb` (la `Sesion` del motor), `propuesta jsonb` (el `SesionPlan` aceptado: bloques y explicaciones; nulo si es una sesión libre), `origen` (`propuesta` \| `libre`) |
| `registros` | `sesion_id` (PK, FK a `sesiones` con cascade), `rpe` (0-10), `duracion_min` (> 0), `molestias jsonb`, `registrado_en` |
| `chequeos` | `fecha`, `sueno`, `fatiga`, `ganas` (1-5), `molestias jsonb`; **único por (`user_id`, `fecha`)** |
| `altas` | `zona`, `fecha` |
| `consejos_mostrados` | `consejo_id`, `fecha` |
| `intentos_limite` | `sesion_id` (FK, cascade), `fecha`, `encadenado`, `motivo_caida` (nulo) |

- Restricciones CHECK con los mismos rangos que el motor (RPE y dolor enteros 0-10, escalas 1-5, zonas de `ZONAS`,
  motivos de `MotivoCaida`).
- **La temporada no se guarda.** Se recalcula en cada petición con `planificarTemporada(inicio, objetivo, { ajuste })`,
  donde `ajuste = ajusteCiclo2(diagnosticar(evaluaciones, intentos, fecha))`, y la fase con `faseEnFecha(t, fecha,
  { descargasAdelantadas })` usando el `estadoAtleta` del seguimiento. El motor es determinista, así que sale igual
  cada vez y no puede desincronizarse.
- Migraciones SQL en `supabase/migrations/`, aplicadas a mano en el SQL Editor (no hay CLI con token).

### Acceso

Supabase Auth con email y contraseña. El registro público queda desactivado en el panel (solo existe la cuenta de
Diego). RLS deja la app lista para más usuarios sin cambiar el esquema. Rutas protegidas por el proxy/middleware de la
versión instalada de Next.js; sin sesión, a `/entrar`.

## 4. Pantallas (móvil primero, en español)

### Primer acceso

1. **Aviso médico:** la app no sustituye a un médico ni a un fisioterapeuta. Se acepta una vez (`aviso_aceptado_en`).
2. **Perfil:** formulario único. Sin perfil completo no se puede entrar a Entrenar.
3. **Evaluación:** formulario para meter los resultados de los tests (fecha, peso, lastre del mejor intento de 10 s,
   resistencia en segundos y técnica de 1 a 7, estas dos opcionales), validado con `validarEvaluacion`. Debajo, el
   historial de evaluaciones con opción de borrar una mal metida.

### Entrenar

1. **Día y hora:** por defecto hoy y la hora actual (zona horaria Europe/Madrid); se puede pedir un día futuro.
2. **Contexto:** compañía (solo / con gente), lugar (rocódromo / roca / casa) y minutos disponibles. Validado con
   `validarContexto`.
3. **Chequeo:** sueño, fatiga y ganas (1-5) y molestias por zona (dolor 0-10 y casilla «alarma»: chasquido,
   hinchazón, pérdida de fuerza o de función). Solo se pide si la fecha pedida es hoy. Se guarda con *upsert* por
   (`user_id`, `fecha`): repetir la petición el mismo día sustituye el chequeo, así varias peticiones no cuentan como
   varios chequeos bajos.
4. **Propuesta:** la app arma la `Peticion` (perfil, historial, fase, evaluación vigente, seguimiento,
   `limitantePrincipal = diagnostico.limitantes[0]`, consejos mostrados) y llama a `proponerSesion` y a
   `elegirConsejos`. Muestra:
   - la principal y hasta 2 alternativas, cada una con sus bloques, ejercicios, cargas exactas y un «¿Por qué?» que
     despliega sus explicaciones con los parámetros citados;
   - o el descanso con su motivo y la próxima ventana intensa;
   - el semáforo de zonas que no estén en verde;
   - hasta 2 consejos.
5. **Aceptar** una opción: inserta la fila de `sesiones` (con un `id` nuevo en lugar del `propuesta-…` del motor) y
   las filas de `consejos_mostrados` de los consejos que se vieron. Antes de insertar se vuelve a ejecutar el motor
   con los datos actuales y se comprueba con `validarSesion` que la sesión sigue siendo válida; si no, se avisa y se
   recarga la propuesta. Solo las sesiones aceptadas entran en el historial.

### Hoy

- Las sesiones aceptadas del día (normalmente una) con sus bloques, o un enlace a Entrenar si no hay ninguna. Si hay sesiones pasadas sin
  registro, un aviso para apuntarlas (el motor no las cuenta para progresar).
- **Terminar:** registro con RPE (0-10), minutos reales, molestias por zona y, si la sesión es de vía al límite,
  pegues o bloque al límite, los intentos al límite (encadenado o motivo de caída). Validado con
  `validarSeguimiento` antes de guardar.
- **No la hice:** borra la sesión aceptada (y sus registros, en cascada).
- **Hice otra cosa:** sustituye la sesión por una sesión libre (`origen = libre`): tipo, intensidad, hora y minutos
  de lo que se hizo de verdad, validada con `validarSesion` contra el historial solo para avisar (lo hecho, hecho
  está: se guarda igual), y después el registro. Los descansos de dedos se calculan con el historial real.
- **Alta del fisioterapeuta:** cada zona en rojo muestra «Me ha dado el alta el fisio», con confirmación; inserta una
  fila en `altas`. Con una zona en rojo, el aviso médico se repite en la pantalla.

## 5. Errores

- Validación con los validadores del motor; el mensaje de error del motor se muestra en español tal cual.
- La base de datos repite los rangos con CHECK, como última barrera.
- Si el motor no tiene ninguna opción, se dice tal cual, con su explicación (`autorregulacion.sin-opciones`).
- Si el motor lanza un error inesperado: «No se ha podido preparar la sesión», con el detalle desplegable. Nunca se
  inventa una sesión ni se muestra una propuesta a medias.
- Si falla una escritura en Supabase, la acción devuelve el error y la pantalla no cambia de estado.

## 6. Pruebas

- **Motor:** las 647 pruebas actuales siguen en verde; `npm test` y `npm run tsc` cubren también `lib/`.
- **`lib/datos/` (vitest):** filas → `Peticion` / `Seguimiento`, `SesionPlan` aceptado → fila (id nuevo, `Sesion`
  intacta), la regla de un chequeo por día, y un escenario de extremo a extremo con filas en memoria: perfil →
  evaluación → petición → aceptar → registro con RPE por encima → la siguiente petición sale frenada (P-11).
- **RLS:** script contra el proyecto real con dos usuarios de prueba: B no puede leer, insertar, modificar ni borrar
  filas de A en ninguna tabla. Los usuarios de prueba se borran al terminar.
- **Playwright:** entrar → Entrenar (contexto y chequeo) → aceptar → Hoy → Terminar → registro guardado.

## 7. Despliegue

- Proyecto nuevo en Vercel conectado al repo, con las variables de Supabase. Subdominio `*.vercel.app` por ahora.
- Las migraciones se aplican antes de desplegar el código que las usa.
