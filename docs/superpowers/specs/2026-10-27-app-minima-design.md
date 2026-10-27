# Karstika Entreno — App mínima (subproyecto 3)

Fecha: 2026-10-27 · Estado: aprobado en brainstorming, pendiente de revisión escrita

## 1. Objetivo y alcance

Primera interfaz del entrenador: una app web (Next.js App Router + Postgres de Neon + Vercel) que carga los datos del usuario,
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
- **El motor se ejecuta en el servidor.** Las pantallas leen de la base de datos en Server Components; las acciones
  (proponer, aceptar, registrar, alta) son Server Actions que llaman al motor y escriben en la base de datos.
- `lib/datos/`: funciones **puras** que traducen filas de la base de datos a tipos del motor (`Peticion`,
  `Seguimiento`, `EvaluacionDedos[]`, `IntentoLimite[]`) y la propuesta a filas. Sin base de datos dentro: reciben
  filas y devuelven objetos, para poder probarlas con vitest como el motor.
- `lib/servidor/`: acceso a la base de datos (consultas SQL con `@neondatabase/serverless`) y la sesión de acceso.
- `motor/` no cambia en este subproyecto salvo que una prueba de integración destape un fallo; si pasa, se arregla
  en el motor con su prueba y su parámetro, nunca con un parche en la app.

## 3. Datos (Postgres de Neon, desde Vercel)

Supabase no está disponible. La base de datos es un Postgres de Neon (plan gratuito) añadido desde el panel de Vercel
al proyecto de la app; Vercel pone `DATABASE_URL` en las variables de entorno. Un único usuario: las tablas no
llevan `user_id` (añadirlo para más usuarios será una migración).

| Tabla | Contenido |
|---|---|
| `perfil` | una sola fila (`id = 1`): `peso_kg`, `anos_escalando`, `lesiones text[]`, `grado_actual`, `grado_objetivo` (solo se muestran), `inicio_temporada`, `objetivo_temporada` (fechas), `aviso_aceptado_en` |
| `evaluaciones` | `fecha` (única), `peso_corporal_kg`, `lastre_kg`, `resistencia_s` (nulo), `tecnica` (nulo, 1-7) |
| `sesiones` | `id` (uuid, se usa como `Sesion.id`), `fecha`, `sesion jsonb` (la `Sesion` del motor), `propuesta jsonb` (el `SesionPlan` aceptado: bloques y explicaciones; nulo si es una sesión libre), `origen` (`propuesta` \| `libre`) |
| `registros` | `sesion_id` (PK, FK a `sesiones` con cascade), `rpe` (0-10), `duracion_min` (> 0), `molestias jsonb`, `registrado_en` |
| `chequeos` | `fecha` (única), `sueno`, `fatiga`, `ganas` (1-5), `molestias jsonb` |
| `altas` | `zona`, `fecha` |
| `consejos_mostrados` | `consejo_id`, `fecha` |
| `intentos_limite` | `sesion_id` (FK, cascade), `fecha`, `encadenado`, `motivo_caida` (nulo) |

- Restricciones CHECK con los mismos rangos que el motor (RPE y dolor enteros 0-10, escalas 1-5, zonas de `ZONAS`,
  motivos de `MotivoCaida`).
- Las consultas devuelven las fechas como texto `AAAA-MM-DD` (`fecha::text`), que es lo que espera el motor.
- **La temporada no se guarda.** Se recalcula en cada petición con `planificarTemporada(inicio, objetivo, { ajuste })`
  y la fase con `faseEnFecha(t, fecha, { descargasAdelantadas })` usando el `estadoAtleta` del seguimiento. El
  ajuste del ciclo 2 sale de `ajusteCiclo2(diagnosticar(evaluaciones, intentos, L))`, donde `L` es el lunes en que
  empieza el ciclo 2: así el reparto queda fijo durante todo el ciclo 2 aunque lleguen tests nuevos. El motor es
  determinista, así que sale igual cada vez y no puede desincronizarse.
- Migraciones SQL en `migraciones/`, aplicadas con `npm run migrar` (script que guarda en la tabla `migraciones` las
  ya aplicadas y ejecuta las nuevas en orden).
- Pruebas contra una **rama de Neon aparte** (`E2E_DATABASE_URL`), marcada con la tabla `_base_de_pruebas`. Los
  scripts que vacían tablas se niegan a tocar una base sin esa marca.

### Acceso

Una contraseña única (`CLAVE_ACCESO`, variable de entorno de Vercel). `/entrar` la compara y, si coincide, pone
una cookie `httpOnly`, `secure`, `sameSite=lax` firmada con HMAC-SHA256 (`SECRETO_SESION`) que caduca a los 90 días.
`proxy.ts` comprueba la firma en cada petición y manda a `/entrar` si falta o no vale. Tras 5 intentos fallidos
seguidos desde la misma IP, espera de 1 minuto (en memoria; basta para un solo usuario).

## 4. Pantallas (móvil primero, en español)

### Primer acceso

1. **Perfil con aviso médico:** formulario único. La primera vez incluye el aviso (la app no sustituye a un médico
   ni a un fisioterapeuta) con una casilla obligatoria; se guarda `aviso_aceptado_en`. Sin perfil no se puede entrar a
   ninguna otra pantalla.
3. **Evaluación:** formulario para meter los resultados de los tests (fecha, peso, lastre del mejor intento de 10 s,
   resistencia en segundos y técnica de 1 a 7, estas dos opcionales), validado con `validarEvaluacion`. Debajo, el
   historial de evaluaciones con opción de borrar una mal metida.

### Entrenar

1. **Día y hora:** por defecto hoy y la hora actual (zona horaria Europe/Madrid); se puede pedir un día futuro.
2. **Contexto:** compañía (solo / con gente), lugar (rocódromo / roca / casa) y minutos disponibles. Validado con
   `validarContexto`.
3. **Chequeo:** sueño, fatiga y ganas (1-5) y molestias por zona (dolor 0-10 y casilla «alarma»: chasquido,
   hinchazón, pérdida de fuerza o de función). Solo se pide si la fecha pedida es hoy. Se guarda con *upsert* por
   `fecha`: repetir la petición el mismo día sustituye el chequeo, así varias peticiones no cuentan como
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
- Si falla una escritura en la base de datos, la acción devuelve el error y la pantalla no cambia de estado.

## 6. Pruebas

- **Motor:** las 647 pruebas actuales siguen en verde; `npm test` y `npm run tsc` cubren también `lib/`.
- **`lib/datos/` (vitest):** filas → `Peticion` / `Seguimiento`, `SesionPlan` aceptado → fila (id nuevo, `Sesion`
  intacta), la regla de un chequeo por día, y un escenario de extremo a extremo con filas en memoria: perfil →
  evaluación → petición → aceptar → registro con RPE por encima → la siguiente petición sale frenada (P-11).
- **Acceso (vitest):** firma y comprobación de la cookie (válida, manipulada, caducada, con otro secreto).
- **Base de datos:** las migraciones se aplican en la rama de pruebas y un script comprueba que las CHECK rechazan
  valores fuera de rango.
- **Playwright:** entrar → Entrenar (contexto y chequeo) → aceptar → Hoy → Terminar → registro guardado.

## 7. Despliegue

- Proyecto nuevo en Vercel conectado al repo, con Neon añadido desde el panel (crea `DATABASE_URL`) y las variables
  `CLAVE_ACCESO` y `SECRETO_SESION`. Subdominio `*.vercel.app` por ahora.
- Las migraciones se aplican (`npm run migrar` con la `DATABASE_URL` de producción) antes de desplegar el código que
  las usa.
