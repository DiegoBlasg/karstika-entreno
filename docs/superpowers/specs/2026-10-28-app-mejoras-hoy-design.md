# App: mejoras de Hoy (entrega 2, parte C)

Fecha: 2026-10-28 · Estado: aprobado en brainstorming, pendiente de revisión escrita

## 1. Objetivo

Hoy tiene tres problemas:

- **Una sesión aceptada con días de antelación no se revisa contra cómo llega Diego ese día.** Además, sin pasar por Entrenar no hay chequeo del día.
- **La pantalla es larguísima.** Cada sesión lleva el registro entero desplegado: RPE, minutos, 5 filas de molestias y hasta 6 desplegables de intentos.
- **No hay forma de apuntar un entrenamiento que no estaba planeado.**

Decisiones de Diego:

- El aviso ofrece **«Cambiarla por otra»**.
- Hoy **pide el chequeo** cuando hay una sesión de hoy sin registrar y aún no se ha hecho.

## 2. Chequeo en Hoy y aviso de sesión que no encaja

- **Tarjeta «¿Cómo llegas hoy?»:**
  - Sale arriba en Hoy cuando hoy hay alguna sesión sin registrar y no existe el chequeo de hoy.
  - Pide sueño, fatiga y ganas (1–5) y «¿Alguna molestia?».
  - Los campos salen de un componente común con Entrenar (`CamposChequeo`).
  - Al guardar se valida igual que el chequeo de Entrenar: `validarDatos(conChequeo(...))` y luego `guardarChequeo`.
  - **Ahora no** la oculta durante ese día: `localStorage` con la clave `chequeo-saltado:<fecha>` y try/catch. Si no se puede guardar, solo se oculta hasta recargar.
- **Motor:** se exporta `motivosNoEncaja(s: Sesion, e: EstadoAtleta): string[]`, con la misma regla que `bloqueadaPorEstado` (P-65, P-45):
  - Una lista no vacía si la sesión estaría bloqueada por el estado: solo descanso, solo hombro, sin carga alta o sin nada al límite.
  - Además, si incluye dominadas y hoy no tocan (`sinDominadas`).
  - Cada motivo va en una frase en español.
  - Una prueba comprueba que la lista no está vacía siempre que `bloqueadaPorEstado` bloquea.
- **Aviso:**
  - `vistaHoy` añade a cada tarjeta `noEncaja: string[]`. Solo se calcula en sesiones de **hoy**, aceptadas (con `propuesta`) y sin registrar, con el estado de hoy. En el resto la lista va vacía.
  - La tarjeta muestra «Con cómo llegas hoy, el entrenador ya no te propondría esta sesión:» seguido de los motivos.
  - Debajo va el enlace **Cambiarla por otra**, a `/entrenar?fecha=<hoy>&hora=HH:MM&minutos=<duración>&reemplaza=<id>`.
- **Reemplazo en Entrenar:**
  - `inicialEntrenar` lee `reemplaza`, que tiene que ser un uuid. El formulario lo lleva oculto y avisa: «Vas a cambiar la sesión de las HH:MM.»
  - **Comprobación:** `proponer` y `aceptar` comprueban con `datosSinReemplazada(d, id, hoy)` (puro) que esa sesión existe, es de hoy y no está registrada. Si no se cumple, el mensaje es claro. Con eso se prepara la propuesta como si la vieja no existiera.
  - **Al aceptar:** se sustituye con `sustituirSesion`, que solo borra la vieja si sigue sin registrar, en la misma sentencia que inserta la nueva. Después se insertan los consejos mostrados.
  - **Nada se pierde:** la vieja no se borra hasta aceptar la nueva.

## 3. Hoy más corto

- **Registro plegado:** en una sesión sin registrar, el formulario queda tras el botón **Terminar**. Corregir un registro sigue igual.
- **Molestias plegables:**
  - `CamposMolestias` gana `plegable`. Con él, «¿Alguna molestia? No / Sí».
  - Con «No», el formulario envía `dolor_<zona>=0` en campos ocultos, así que el servidor lee igual.
  - Arranca en «Sí» si las iniciales traen alguna molestia.
  - Se usa en el registro y en los chequeos de Hoy y de Entrenar.
- **Intentos con «+ intento»:** una fila por intento, hasta `MAX_INTENTOS`. Al corregir arranca con los intentos ya apuntados. Los nombres de campo siguen siendo `intento_<n>`.

## 4. Entrenamiento no planeado

- Al final de Hoy, **«Apuntar un entrenamiento que no estaba planeado»** abre un formulario con:
  - día: de hoy a 7 días atrás, como `corregible`;
  - qué hiciste e intensidad;
  - hora y minutos;
  - regleta y agarre, en los tipos con regleta;
  - RPE, minutos reales y molestias;
  - intentos, en los tipos con intentos.
- **Acción `apuntarEntrenamiento`:**
  - construye la sesión libre (`filaSesionLibre`), su registro y sus intentos;
  - valida con `validarDatos(conRegistro(conSesion(...)))`;
  - si `validarSesion` da avisos, los muestra con «Lo hice así de todos modos», como «Hice otra cosa»;
  - inserta sesión, registro e intentos en **una transacción** (`insertarSesionRegistrada`).

## 5. Pruebas

- **Unitarias:**
  - `motivosNoEncaja`: cada restricción y la coherencia con `bloqueadaPorEstado` en todas las combinaciones de tipos y estados.
  - `vistaHoy`: `noEncaja` solo en las de hoy aceptadas sin registrar, y `pedirChequeo`.
  - `datosSinReemplazada`: los tres errores y que quita la sesión.
  - `inicialEntrenar` con `reemplaza`.
  - Día permitido del entrenamiento libre.
- **e2e:**
  - sesión aceptada de hoy, chequeo bajo en Hoy, aviso, «Cambiarla por otra», aceptar y que la vieja ya no exista;
  - apuntar un entrenamiento no planeado.
