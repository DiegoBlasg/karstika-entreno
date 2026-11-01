# La semana que la app aprende: cuántos días entrenas y cuáles suelen ser

Fecha: 2026-11-01 · Rama: `semana-aprendida`

## Por qué

Al quitar los ratos, el motor genera cada entreno sin saber qué otros días vas a entrenar esa semana, y reparte la
carga a ciegas (por ejemplo, gasta el lunes la vía al límite que el martes, con gente y cuerda, aprovecharía mejor).
El motor ya sabe planificar la semana si le pasan los huecos que quedan (P-67, `planificarSemana`); falta de dónde
sacarlos sin pedirle a Diego que los declare.

## Decisiones de Diego (2026-11-01)

- Lo único que se pregunta es **cuántos días sueles entrenar por semana**: 1 · 2 · 3–4 · 5–6 · Todos (en Yo).
- La app **aprende** de lo que haces (qué días, mañana o tarde, dónde, con quién, minutos).
- Diego sigue generando **día a día**; no hay «Generar la semana».
- Lo que la app supone se **ve** en Semana, en una línea discreta.

## 1. Dato nuevo

Migración `006_dias_semana.sql`: `alter table perfil add column dias_semana text check (dias_semana in ('1', '2',
'3-4', '5-6', 'todos'));` (nulo = sin contestar). La rama `escaladas` renumerará su migración a 007.

En Yo (`FormularioPerfil`), `Opciones` «¿Cuántos días sueles entrenar por semana?». Mientras esté sin contestar, la
línea de Semana invita a contestarla (enlace a Yo) y el motor se comporta como ahora (sin huecos).

## 2. Lo aprendido (`lib/datos/semana-supuesta.ts`, puro)

- **Historial**: sesiones **registradas** de las 6 semanas naturales anteriores a la actual con `propuesta.contexto`
  (las generadas; las libres no tienen contexto y no cuentan).
- **Ratos frecuentes**: por día de la semana, cuántas de esas semanas hubo sesión ese día; para cada día, la franja
  (mañana/tarde) y el contexto (dónde, con quién, minutos) más repetidos.
- **Días objetivo** de la semana, según la respuesta:
  - `1` → 1, `2` → 2, `todos` → 7;
  - `3-4` y `5-6` → la media de días con sesión por semana de las semanas con historial, redondeada y dentro del rango;
    sin historial (< 3 semanas con alguna sesión), **el mínimo del rango** (3 o 5). Suponer de menos es lo prudente:
    si la app cuenta con días que luego no entrenas, guarda carga para nada.

## 3. Huecos supuestos al generar

`semanaSupuesta(d, fecha, franja, contexto)` devuelve los huecos (`Hueco` del motor) que se pasan a
`prepararPropuesta` cuando se genera un entreno:

- Quedan por cubrir: `objetivo − días de la semana que ya tienen sesión` (contando el día que se genera).
- Candidatos: los días **posteriores** al que se genera, hasta el domingo, sin sesión, dentro de la temporada.
- Se eligen primero los candidatos con más semanas de historial (empate: el más cercano); si faltan, se reparten los
  que quedan **espaciados** (uno sí y uno no desde el día siguiente, y si no llega, los que falten en orden).
- Cada hueco lleva la franja y el contexto aprendidos de ese día; si ese día no tiene historial, la franja y el
  contexto del entreno que se está generando.
- Como mucho 8 (P-67). `multipresaEnCasa` sale del perfil, como ahora.
- Sin `dias_semana` → sin huecos (como ahora).

`prepararPropuesta` deja de recibir los huecos de fuera: los calcula con `semanaSupuesta` a partir de la entrada.
«Otra opción» usa la misma suposición.

## 4. Lo que se ve

- **Semana** (la de esta semana): debajo de la cabecera, si hay suposición para hoy en adelante, una línea en gris:
  «Para repartir la carga, la app cuenta con que entrenarás también el jueves por la tarde y el sábado por la mañana
  (lo que sueles hacer).» Sin historial: «… (repartidos en la semana, aún no sé qué días sueles entrenar)». Sin
  respuesta en Yo: «Dime en Yo cuántos días sueles entrenar y repartiré mejor la carga de la semana.»
- Si el plan deja libre el día que generas para guardar carga para otro (P-67), la hoja «Generar entreno» ya lo
  muestra como descanso con su motivo y alternativas suaves.

## 5. Parámetro

P-74 «Semana supuesta»: el valor de §2-§3 (6 semanas de historial, mínimo del rango sin historial, días espaciados).
`sinEvidencia`, con la razón escrita: es la forma de que el reparto de P-67 funcione sin pedir los días; el mínimo del
rango, por prudencia.

## 6. Pruebas

- `semanaSupuesta`: sin respuesta → vacío; con respuesta y sin historial → mínimo del rango, espaciado, con el
  contexto del entreno; con historial → los días más frecuentes y su franja/contexto; días con sesión fuera;
  objetivo ya cubierto → vacío; tope de 8; fuera de temporada.
- `prepararPropuesta` con historial → `propuesta.semana` presente.
- Yo guarda `dias_semana`; `probar-bd` rechaza un valor desconocido.
- e2e: contestar en Yo y ver la línea de Semana.
