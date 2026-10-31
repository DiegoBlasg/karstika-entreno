# Rediseño · mejoras tras probarlo: Vía, Semana, Biblioteca y dos fallos — diseño

Fecha: 2026-10-31 · Estado: aprobado por Diego con maquetas (compañero visual)

Diego probó el rediseño en el móvil y señaló cinco problemas. Este documento recoge lo decidido. Completa `2026-10-30-rediseno-movil-design.md`, que sigue vigente salvo en lo que aquí se cambia.

## Problemas detectados

1. **Vía:** empieza por abajo (hay que bajar toda la página), no se ven claras las fases ni las semanas y no hay una línea de tiempo a simple vista.
2. **Semana:** no es intuitiva. Mezcla avisos («Declara los huecos…», «No te quedan huecos pendientes», «Plan orientativo») y el formulario largo queda al final.
3. **Biblioteca:** es una lista de enlaces subrayados, y la ficha es un texto largo.
4. **Preparar sesión:** en Safari del iPhone los campos Día y Hora se montan uno sobre otro.
5. **Test:** varias pantallas invitan a «apuntar un test», pero el test lo propone el entrenador cuando toca.

## Decisiones

### Un color por fase

Cada fase tiene su color, también en Hoy (mini-vía) y en Vía:

| Fase | Color |
|---|---|
| Base | salvia `#8FB3A6` |
| Fuerza | lima `#C6F24E` |
| Resistencia | turquesa `#4FD1C5` |
| Rendimiento | naranja `#FF7A45` |
| Transición | gris `#6E7F78` |

- La semana objetivo sigue con el naranja de la cima.
- Lo hecho va en color pleno; lo futuro, al 28 % de opacidad.
- El texto oscuro (`fondo`) sobre cada color debe tener un contraste ≥ 4,5:1. Si el gris de transición no llega, el texto sobre él va en `texto`.

### Vía: pasos + carrusel de largos (opción C)

- **Arriba, una fila de pasos:**
  - un círculo por largo, numerado, con el color de su fase;
  - hechos ✓, el actual con anillo y los futuros apagados;
  - unidos por una línea, lima hasta el actual;
  - al final, ▲ la cima en naranja.
  - Cada paso se puede tocar y lleva a su tarjeta del carrusel.
- **Debajo, un carrusel horizontal** con una tarjeta por largo:
  - Se desliza con «scroll-snap».
  - Las tarjetas vecinas asoman por los lados para que se entienda que se puede deslizar.
  - Al entrar queda centrado en el largo actual.
  - Cada tarjeta lleva el número del largo y el ciclo, el nombre de la fase (con su color) y un anillo con las semanas (X de Y).
  - También lleva las sesiones hechas, el próximo test del largo y el objetivo de la fase en una línea.
  - Al tocarla se abre la hoja con sus semanas: descarga, test y sesiones hechas, como ahora.
  - La tarjeta de la cima lleva el grado objetivo.
- Debajo del carrusel van la **próxima reunión** (fecha y estado; al tocarla, su hoja con la evolución de los tests) y **«Qué ha cambiado por tus resultados»**.
- La vía vertical actual desaparece.

### Semana: agenda de 7 días (opción B)

- «Hueco» pasa a llamarse **«rato para entrenar»** en toda la interfaz. Los datos no cambian.
- **Cabecera:** «Tu semana», con el rango de fechas y la fase, y los controles «‹ Anterior» / «Siguiente ›».
- **Una fila por día, siempre los siete:**
  - Hoy va marcado.
  - Cada rato muestra la hora, el sitio y los minutos, y lo que toca (★ si es carga alta, «Libre: no hace falta entrenar» o el estado aceptada/registrada).
  - Cada rato tiene su «Preparar» y su borrar.
  - Los días sin ratos dicen «Sin ratos para entrenar».
  - Los días pasados van atenuados.
- **Añadir un rato:**
  - Cada día (de hoy en adelante) tiene un «+».
  - El «+» abre una hoja desde abajo con el formulario: el día ya elegido, la hora, con quién, dónde y los minutos.
  - Se acabó el formulario largo al final de la página.
- **Si la semana no tiene ratos**, un aviso único y claro: «Añade cuándo puedes entrenar esta semana con el + de cada día. Mientras tanto, esto es lo que haría el entrenador con tu semana habitual:». Debajo va el plan orientativo, en las mismas filas, sin botones.
- Desaparecen «Próximos días» y los avisos repetidos.

### Biblioteca: lista con miniaturas (opción B) y ficha (opción C)

- **Lista:**
  - Título «Biblioteca»; debajo, un buscador que filtra por nombre al escribir y chips de grupo («Todos» y uno por grupo).
  - Una fila por ejercicio, agrupada por grupo, con el dibujo en miniatura (o un icono del grupo si no tiene dibujo), el título, el material en una línea y un «›».
  - Cada fila mide al menos 44 px.
- **Ficha:**
  - «‹ Biblioteca» para volver y el dibujo grande en una tarjeta.
  - La etiqueta del grupo, el título y el «para qué» en una frase.
  - Chips con el material.
  - Los pasos numerados con círculos.
  - «Para si…» destacado en ámbar.
  - «Errores típicos» y «Por qué se hace» (los estudios) plegados.

### Fallos

- **Día y Hora en Safari:** los campos de fecha y hora nativos no pueden desbordar su columna. Para ello llevan `min-width: 0`, `width: 100%` y `appearance: none`, y el valor alineado a la izquierda. Vale para todos los campos de fecha y hora (Entrenar, rato para entrenar, test, registro libre).
- **Test:**
  - Progreso solo enseña el formulario de resultado cuando hay un test hecho sin apuntar (`testsSinResultado`). Si no, queda un enlace plegado y discreto, «¿Hiciste un test por tu cuenta?», que despliega el formulario.
  - El paso 3 del pie de vía deja de tener enlace para apuntar: queda solo el texto «El entrenador te lo propondrá cuando toque, en la base».
  - La hoja de una reunión deja de tener «Apuntar un resultado».

## Fuera de alcance

Escaladas (en pausa, se retoma después), modo offline y notificaciones.
