# Motor, tramo 2d: semáforo de dolor, autorregulación, consejos y dominadas

Fecha: 2026-10-27 · Estado: diseño aprobado en brainstorming
Depende de: 2a, 2b y 2c (en `master`, a798de7) y `docs/evidencia/parametros.md`.

## Decisiones del usuario

1. **Chequeo al pedir sesión**, no diario. P-50 se lee como «bienestar bajo en los 3 últimos chequeos dentro de 7
   días».
2. **5 zonas** de molestia sin lado: dedos, muñeca/antebrazo, codo, hombro y otra.
3. **RPE por encima del objetivo**: una sesión frena la subida (P-11); dos seguidas adelantan la descarga (P-50).
   Nunca se baja la carga por una sola sesión mala.
4. **Consejos pegados a la sesión**: como mucho 2 por sesión; los generales rotan sin repetirse en 7 días.
5. **Dominadas lastradas** (P-39): complemento opcional de 15 min en las fases de fuerza, como mucho 1 en 7 días,
   fuera de los días de dedos intensos.

## Enfoque

Una función pura nueva, `estadoAtleta`, resume el estado del escalador a partir de registros, chequeos y altas.
`proponerSesion` lo recibe en la petición y lo aplica como hoy aplica la fase: filtra candidatos, ajusta la carga
y añade explicaciones. Los consejos son otra función pura que se aplica a la propuesta ya hecha. `validarSesion`
no cambia: sus reglas son seguridad dura y no dependen del estado del día.

## 1. Tipos (`motor/autorregulacion-tipos.ts`)

```ts
export const ZONAS = ['dedos', 'muneca', 'codo', 'hombro', 'otra'] as const
export type Zona = (typeof ZONAS)[number]

export interface Molestia {
  zona: Zona
  dolor: number              // entero 0-10 (P-42)
  alarma?: boolean           // alguna señal de P-44 (chasquido, hinchazón, pérdida de fuerza o función…)
}

export interface RegistroSesion {
  sesionId: string           // id de una Sesion del historial
  fecha: string              // = fecha de la sesión
  rpe: number                // CR-10, 0-10 (P-34)
  duracionMin: number        // minutos reales, > 0
  molestias: Molestia[]      // una por zona como mucho
}

export interface Chequeo {
  fecha: string
  sueno: number              // 1-5 (5 = muy bien)
  fatiga: number             // 1-5 (5 = nada cansado)
  ganas: number              // 1-5
  molestias: Molestia[]
}

export interface Alta { zona: Zona; fecha: string }   // alta profesional que levanta un rojo (P-46)

export type Semaforo = 'verde' | 'ambar' | 'rojo'

export interface EstadoAtleta {
  zonas: Record<Zona, Semaforo>
  sinSubida: boolean                       // P-11/P-43: última sesión por encima del objetivo, o alguna zona en ámbar
  descargaAdelantada?: { desde: string; hasta: string; motivo: 'rpe' | 'bienestar' }   // P-50, 7 días
  chequeoBajoHoy: boolean                  // el chequeo de hoy tiene media ≤ 2
  escalonMultipresa?: number               // tope por P-46 tras un ámbar resuelto en dedos o muñeca
  explicaciones: Explicacion[]
}
```

Todas las entradas se validan (enteros en rango, fechas reales, sin zonas repetidas, `sesionId` existente en el
historial y con la misma fecha, un chequeo por día como mucho). Solo cuenta lo que ya ha pasado (fecha ≤ hoy).

`Peticion` gana `estado?: EstadoAtleta` y `consejosMostrados?: { id: string; fecha: string }[]`. Sin `estado`, el
motor se comporta como hasta ahora (las pruebas de 2a-2c no cambian); la app siempre lo pasa.

## 2. Semáforo de dolor (P-42 a P-46, P-64)

**Dolor vigente por zona**: el último valor dado para esa zona, en un registro o en un chequeo (el más reciente
por fecha; el mismo día manda el chequeo, que es el que se hace al pedir la sesión). Una zona sin datos es verde.

**Nivel** (P-43): 0-1 verde, 2-3 ámbar, 4 o más rojo. Cualquier `alarma` es rojo (P-44).

**Ámbar que pasa a rojo** (P-45): la misma zona en ámbar en 2 registros de sesión seguidos, o en ámbar (en
cualquier fuente) de forma continua durante más de 7 días.

**El rojo se queda** hasta que haya un `Alta` de esa zona con fecha posterior al último rojo, aunque el dolor baje
(P-46). Con el alta, la zona vuelve al nivel de su dolor vigente.

**Qué bloquea cada nivel** (P-64, nuevo, decisión de diseño):

| Zona | Ámbar | Rojo |
|---|---|---|
| dedos, muñeca, codo | sesiones de intensidad alta; dominadas | toda sesión de escalar o colgarse; dominadas. Quedan descanso y hombro sin carga |
| hombro | sesiones de intensidad alta; dominadas; hombro con carga (queda hombro sin carga) | toda sesión de escalar o colgarse; dominadas; hombro. Queda descanso |
| otra | sesiones al límite (bloque, vía, pegues, board) | solo descanso |

En ámbar tampoco sube la carga de la zona (P-43): `sinSubida` se activa. Con un rojo, la propuesta principal es
el descanso, y la explicación recomienda fisioterapeuta y dice que el motor no diagnostica. El test de dedos
(`evaluacion-dedos`) también se bloquea con ámbar en dedos, muñeca o codo.

**Retorno tras un ámbar** (P-46): si una zona dedos o muñeca estuvo en ámbar y vuelve a verde, la multipresa
vuelve al escalón anterior al de la sesión donde apareció la molestia. Escalones: 0 = 1 bloque al 70 %,
1 = 2 bloques al 70 %, 2 = 2 bloques al 80 % (los de 2b). Desde ahí se vuelve a progresar con sesiones válidas.

## 3. Autorregulación (P-11, P-34, P-50, P-63, P-65)

**RPE objetivo** (P-63, nuevo, decisión de diseño): sesiones de intensidad alta, máximo 8; suaves, máximo 5;
descanso y test de dedos, sin objetivo. «Por encima» = sRPE real (RPE × minutos reales, P-34) mayor que el
máximo × minutos previstos.

**Sesión válida para progresar** (P-11): tiene registro, quedó dentro del objetivo y sin dolor de 2 o más en
dedos o muñeca. La progresión de la multipresa de 2b cuenta solo sesiones válidas cuando hay `estado`.

**Freno** (P-11): si la última sesión con objetivo quedó por encima, `sinSubida`: la siguiente multipresa repite
el escalón de la anterior aunque toque subir.

**Descarga adelantada** (P-50), dura 7 días desde el día en que se cumple:
- 2 sesiones con objetivo seguidas por encima, o
- media de (sueño, fatiga, ganas) ≤ 2 en los 3 últimos chequeos, todos dentro de los últimos 7 días.

Mientras dura, `proponerSesion` usa `descargar(fase)`. La descarga programada de la temporada se mantiene.

**Chequeo de hoy bajo** (P-65, nuevo, decisión de diseño): media ≤ 2 en el chequeo de hoy. Las sesiones de
intensidad alta salen de los candidatos y se propone técnica o volumen suave, como dice el spec global.

## 4. Consejos (`motor/consejos.ts`, P-66)

```ts
export interface Consejo { id: string; texto: string; explicacion: Explicacion }
export function elegirConsejos(p: Peticion, propuesta: Propuesta): Consejo[]   // 0-2
```

Catálogo fijo, cada consejo con sus parámetros y su condición:

| id | Condición | Parámetros |
|---|---|---|
| `calentamiento` | principal intensa o test | P-49 |
| `descanso-pegues` | pegues, bloque o vía al límite | P-51, P-61 |
| `reposos-via` | vía al límite, 4x4 o pegues | P-52 |
| `lectura-via` | vía al límite o pegues | P-53 |
| `video-tecnica` | técnica | P-55 |
| `miedo-caer` | vía al límite o pegues, y limitante `cabeza` en el diagnóstico (si la app lo pasa) | P-62 |
| `vigilar-ambar` | alguna zona en ámbar | P-43, P-45 |
| `fisio-rojo` | alguna zona en rojo | P-43, P-44, P-46 |
| `sueno`, `proteina`, `peso`, `suplementos` | generales | P-56, P-57, P-58, P-59 |

Orden: primero los de seguridad (`fisio-rojo`, `vigilar-ambar`), luego los de la sesión principal y al final los
generales. Un consejo mostrado en los últimos 7 días (`consejosMostrados`) no se repite, salvo los de seguridad.
P-66 (nuevo, decisión de diseño): máximo 2 por sesión y rotación de 7 días. El limitante `cabeza` entra como
`Peticion.limitantePrincipal?` (lo da `diagnosticar`).

## 5. Dominadas (P-39)

`dominadas` pasa a `TIPOS_COMPLEMENTO`. El generador las añade como complemento de 15 min solo si:
- la fase es fuerza (de cualquier ciclo) y no es descarga;
- no hay ninguna en los 7 días anteriores ni en la sesión;
- la principal no es intensa de dedos y no hay sesión intensa de dedos ese día;
- codo y hombro están en verde (y no hay rojo en ninguna zona);
- sobra tiempo tras el resto de complementos (van detrás del hombro en prioridad).

Seguridad: una regla nueva en `validarSesion`, `dominadas-dia-dedos`, rechaza dominadas el mismo día que una
sesión intensa de dedos, y `dominadas-7dias` más de 1 en 7 días (P-39).

## 6. Parámetros nuevos en `parametros.md`

P-63 (RPE objetivo), P-64 (qué bloquea cada nivel por zona), P-65 (chequeo: escala 1-5, bajo = media ≤ 2),
P-66 (consejos: máximo 2, rotación 7 días). Todos `sinEvidencia`, decisión de diseño. Se regenera `metadatos.ts`.
P-39 se actualiza con el complemento de 15 min.

## 7. Pruebas

- Semáforo: cada umbral (1/2, 3/4), alarma, P-45 por repetición y por 7 días (frontera 7/8), rojo hasta el alta,
  el chequeo de hoy manda sobre el registro de hoy.
- Bloqueos: tabla de la sección 2 entera, por zona y nivel, contra `proponerSesion` en los contextos reales
  (martes con gente en rocódromo, jueves solo, casa).
- Autorregulación: freno tras 1 sesión por encima, descarga adelantada por RPE y por bienestar (3 chequeos con uno
  de hace 8 días no cuentan), duración de 7 días, chequeo de hoy bajo, sesiones no válidas no cuentan para subir,
  P-46 vuelve un escalón.
- Consejos: máximo 2, orden, rotación, seguridad siempre.
- Dominadas: solo fuerza, no en día de dedos, 1 en 7 días, bloqueadas por ámbar en codo u hombro.
- Simulación: 8 semanas de la semana real de Diego con un ámbar en dedos a mitad y un bloque de chequeos bajos.
- Sin `estado`, todas las pruebas de 2a-2c siguen pasando.

## Fuera de este tramo

Interfaz y persistencia (subproyecto 3). `Perfil.lesiones` sigue como texto informativo que el motor no lee.

## Implementado (rama `motor-autorregulacion`)

- **Cambio de interfaz**: `Peticion.seguimiento` (registros, chequeos, altas) en lugar de un `estado` ya calculado.
  `proponerSesion` calcula `estadoAtleta` para cada fecha que evalúa (también al buscar la ventana intensa: el
  chequeo de hoy no vale para mañana) y lo devuelve en `Propuesta.estado`, con sus explicaciones. Pasar `estado`
  a mano es un error. Las explicaciones de cada plan no cambian (una por bloque más la de la elección).
- **Progresión de multipresa**: `EstadoAtleta.sesionesNoValidas` y `retornoP46`; la plantilla recalcula el escalón.
  Con `seguimiento`, una sesión pasada sin registro no cuenta para subir (falla cerrado).
- **Dominadas**: sin cupo de fase (seguirían prohibidas como principal); el generador las añade como complemento en
  la fuerza fuera de la descarga, también detrás de una sesión de hombro. Un chequeo bajo también las quita (lo
  destapó la simulación: proponía dominadas lastradas el día de cansancio).
- **Consejos**: entre los no de seguridad, primero el que hace más que no ves (rotación real); la proteína se da
  también en gramos con el peso del perfil (P-57).

