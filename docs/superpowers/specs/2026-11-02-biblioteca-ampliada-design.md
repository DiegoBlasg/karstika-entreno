# Biblioteca ampliada

Fecha: 2026-11-02 · Rama: `biblioteca-ampliada` · Base: `docs/evidencia/informe-2026-10-31-tests-ejercicios.md`
(§«Los ejercicios con ensayo están en el multipresa; el resto es oficio de entrenador»).

## Decisión de Diego (2026-11-02)

Fichas nuevas **y** que el entrenador use las de técnica, cabeza y movilidad. La resistencia gana fichas de consulta;
sus sesiones no cambian.

## 1. Fichas nuevas

Cada ficha lleva `lugares` (rocódromo, roca, casa), su cualidad (grupo) y, en «Para qué», la fuente y el nivel.

| id | grupo | lugares | en el plan |
| --- | --- | --- | --- |
| `pies-silenciosos` | técnica | rocódromo, roca | sí (técnica, rotación) |
| `manos-pegadas` | técnica | rocódromo | sí (rotación) |
| `mismo-lado` | técnica | rocódromo | sí (rotación) |
| `placa-sin-manos` | técnica | rocódromo | sí (rotación; con destrepe) |
| `caidas-progresivas` | cabeza y táctica | rocódromo, roca | sí (si te limita la cabeza, P-76) |
| `respiracion-voy` | cabeza y táctica | rocódromo, roca | sí (intentos al límite) |
| `tactica-encadene` | cabeza y táctica | roca | sí (pegues a un proyecto) |
| `continuidad-5x3` | resistencia | rocódromo | consulta |
| `up-down-up` | resistencia | rocódromo, roca | consulta |
| `repetir-vias` | resistencia | rocódromo, roca | consulta |
| `inthangs` | resistencia | rocódromo, casa | consulta |
| `suspensiones-largas` | fuerza de dedos | rocódromo, casa | consulta |
| `abrahangs` | fuerza de dedos | rocódromo, casa | consulta |
| `intermitentes-80` | resistencia | rocódromo, casa | consulta |
| `finger-curls` | fuerza de dedos | rocódromo, casa | consulta (prioridad baja: no aporta frente a la isométrica) |
| `paso-alto` | movilidad y core | casa | sí (core y movilidad) |
| `tobillo` | movilidad y core | casa | sí (core y movilidad) |
| `dedos-en-barra` | fuerza de dedos | casa | «no se propone» (sin evidencia) |
| `campus` | potencia y tirón | rocódromo | «no se propone» (P-13, menos de 2 años) |

La ficha `extensores-dedos-banda` cita además el ensayo de Devise 2023 (extensión intermitente al 80 %).
Las suspensiones con más carga que la de la app (max hangs) no entran: siguen excluidas para menos de 2 años (P-01).

`Ficha` gana `lugares: Lugar[]` y `uso: 'plan' | 'consulta' | 'no'`. La ficha muestra «Te lo propone el
entrenador», «De consulta: el entrenador no lo programa» o «No se propone» con el motivo.

## 2. Biblioteca

Grupos por cualidad: Fuerza de dedos · Resistencia · Potencia y tirón · Técnica · Cabeza y táctica · Hombro ·
Movilidad y core (las fichas actuales se reparten en ellos). Encima, además de la búsqueda y los grupos, un filtro por
lugar (Todos · Rocódromo · Roca · Casa).

## 3. El entrenador las usa

- **Técnica, ejercicio de la semana** (`plantilla.tecnica`): un ejercicio más dentro del bloque de práctica, sin
  alargar la sesión: «Ejercicio de la semana: …, 10 min». Rota por semana natural (lunes a domingo) en el orden pies
  silenciosos → manos pegadas → mismo lado → placa sin manos y destrepe, según el número de semana (días desde una fecha
  fija entre 7, módulo 4): la misma semana, el mismo ejercicio. Fuente: entrenadores (C).
- **Caídas progresivas (P-76, sinEvidencia)**: si `limitantePrincipal === 'cabeza'`, la primera `via-cuerda-limite`
  de la semana natural **en rocódromo** empieza, tras el calentamiento, con un bloque de 10 min: 3-5 caídas,
  subiendo un escalón (top-rope → chapa a la cintura → a los pies → por encima) solo sin ansiedad. Si no cabe, se quita
  un intento al límite (al menos queda 1). El consejo `miedo-caer` sigue igual.
- **Respiración y «voy»**: la ficha `respiracion-voy` se enlaza en cada intento al límite de vía y de pegues
  (además de su ficha actual: el paso tiene `fichas` como lista; el ejercicio gana `fichasExtra?: string[]`).
  Los pegues enlazan también `tactica-encadene`.
- **Core y movilidad**: la parte de movilidad suma paso alto 2 × 8 por lado y tobillo 2 × 10.

## 4. Pruebas

Fichas: todas las de `FICHA_IDS` tienen grupo, lugares y uso; las «plan» aparecen en alguna plantilla y las «consulta»
o «no» en ninguna. Rotación del ejercicio de técnica (4 semanas seguidas, 4 ejercicios distintos y vuelta a empezar).
Caídas: solo con cabeza, solo en rocódromo, solo la primera de la semana, y quitan un intento si no caben. Filtros de
la Biblioteca. e2e: abrir desde la Biblioteca el filtro «Casa» y una ficha nueva.
