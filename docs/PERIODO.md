# Periodo financiero («Mi mes empieza el día…»)

> Alternativa **B**, aprobada por Eric el 07-11-2026. La alternativa C
> («cuenta para…» en un ingreso concreto) queda para una fase futura.
> Código: `src/lib/periodo.js`. Pruebas: `src/lib/periodo*.test.js`, `tests/e2e/periodo.mjs`.

## 1. Definición formal

- **S** es el día de inicio del periodo: un entero con `1 ≤ S ≤ 28`.
  - El máximo es 28 porque es el último día que existe en todos los meses, febrero incluido.
  - Cualquier otro valor (0, 29–31, null, texto…) se trata como 1.
- **`periodoDe(fecha 'AAAA-MM-DD', S)`** devuelve la clave `'AAAA-MM'` del periodo al que pertenece la fecha:

| Caso | Resultado |
|---|---|
| S = 1 | el mes natural de la fecha (`fecha.slice(0, 7)`), exactamente como antes |
| día(fecha) < S | el mes natural de la fecha |
| día(fecha) ≥ S | el mes natural **siguiente**; diciembre pasa a enero del año siguiente |

- **Rango del periodo K:** va del **día S del mes anterior a K** al **día S−1 del mes K**, ambos incluidos. Con S = 1, del 1 al último día de K.

**Ejemplos con S = 28**

| Fecha | Periodo |
|---|---|
| 27-10-2026 | octubre 2026 |
| 28-10-2026 … 27-11-2026 | **noviembre 2026** |
| 28-11-2026 | diciembre 2026 |
| 27-12-2026 | diciembre 2026 |
| 28-12-2026 … 27-01-2027 | **enero 2027** (cambio de año) |

**Duración del periodo:** es la del mes anterior a K, así que va de 28 a 31 días.
- Con S = 28, «marzo 2027» va del 28-02 al 27-03: 28 días.
- En 2028 (bisiesto), el mismo periodo dura 29 días.

**Propiedades (todas probadas):**
1. Cada fecha pertenece a **un único** periodo; no hay huecos ni solapes, y los periodos son consecutivos.
2. Con S = 1, el resultado es idéntico al mes natural en todas las fechas de 2023-12 a 2028-03.
3. Solo reclasifica: no cambia la fecha, el importe ni el número de movimientos.
4. El patrimonio es un stock hasta una fecha, así que no depende de S.

**Funciones auxiliares** (`periodo.js`):
- `rangoPeriodo(K)`: primer y último día del periodo.
- `diasDelPeriodo(K)`: número de días del periodo.
- `diaEnPeriodo(fecha)`: posición dentro del periodo, empezando en 1.
- `fechaEnPeriodo(K, n)`: el día n del periodo; si n supera la duración, devuelve el último día.
- `periodoActual()`: el periodo en curso.
- `textoRangoPeriodo(K)`: «28 oct – 27 nov»; vacío con S = 1.
- `mesNatural(fecha)` y `mesNaturalActual()`: para lo que es calendario.

## 2. Una sola fuente

- **El motor lee el día de inicio de un solo sitio.**
  - `configurarPeriodo(S)` lo fija `App.jsx` en cada render, a partir del perfil.
  - Todo el motor lo lee con `diaInicioPeriodo()`.
- **`claveMes()` y `claveMesActual()` (movimientosUtils) llaman a `periodoDe`.** Por eso todo lo que ya agrupaba por mes pasa a agrupar por periodo sin calcularlo por su cuenta:
  - `filtrarMesActual`, `filtrarPorMes`, `agregarPorMes`, `rangoMeses`;
  - medias, `estimacionGastoMensual`, `diasRestantesDelMes`;
  - `bolsasConsolidadas`, la predicción, `pildoras`.
- **Al cambiar el ajuste**, App recalcula sus derivados (`diaInicio` está en sus dependencias) y vuelve a montar el contenido (`key` de `<main>`), así que **todas** las pantallas se recalculan juntas.

### Clasificación de los usos del mes (auditoría de la propuesta)

| Uso | Ahora |
|---|---|
| Motor (`movimientosUtils`): filtros, agregados, medias, estimación, días restantes, consolidación | **periodo** (vía `claveMes`) |
| `analisis.js`: `delMes`, `contextoMes` («día X de Y» es la posición en el periodo), ingreso habitual | **periodo** |
| `inicio.js`: resumen del mes, ritmo «hasta el mismo día», balance (días 1–3 = cierre del anterior), evolución y cambio de patrimonio (cierre = último día del periodo) | **periodo** |
| `presupuesto.js`: categorías frente a la media, límites | **periodo** |
| Presupuesto en porcentaje: base = ingresos del periodo en curso | **periodo** |
| `historial.js` (Movimientos Año → Periodo): el año es el del periodo | **periodo** |
| Fulcro: `respuestasLocales` («este mes», «mes pasado», meses por nombre, trimestres, años, «lo que va de mes», comparativas, «hasta fin de mes»), `contextoFulcro`, `resumenParaIA`, calculadora de verificación | **periodo**. Días y semanas («ayer», «últimos 30 días», «esta semana») siguen en calendario |
| Pantallas: selector de periodo, Movimientos, Inversión mensual, Inversiones, Planificación (próximos periodos), Presupuesto v5 (raya «a estas alturas») | **periodo** |
| Fijos y avisos de cobro (`useRecurrentes`, `conciliarFijos`, `Recurrentes`, `AvisosCobros`), calendario de Base, periodicidad, suscripciones | **mes natural** (`mesNatural`): un recibo «el día 5 de cada mes» es calendario, no periodo |
| Generadores de datos de ejemplo, informe semanal (`reporteSemanal`), recordatorios por email (miden días sin apuntar, con `created_at`) | **calendario**, sin cambios |

**No ha hecho falta parar por ningún módulo.** El único que no conoce el día del usuario es el informe semanal del servidor, y es semanal (calendario) por definición. Fulcro en el servidor recibe los agregados ya calculados en el cliente con el periodo del usuario.

## 3. Persistencia y seguridad

- **Columna:** `perfiles.dia_inicio_periodo smallint not null default 1`, con un `check` de 1 a 28.
  - Fichero: `supabase-schema-periodo.sql`, **solo para palanca dev**.
  - Es aditiva: los perfiles existentes quedan en 1, es decir, el comportamiento de antes.
  - RLS: se aplican las políticas que `perfiles` ya tiene; cada usuario solo lee y escribe su fila.
- **Mientras la columna no exista**, el ajuste se guarda en el navegador del usuario (`palanca_dia_inicio_periodo_<usuario>`), igual que otros ajustes.
  - Lo que manda está en `src/lib/periodoVista.js`: primero la columna, luego el navegador, y si no hay nada, 1.

## 4. Interfaz

- **Tu cuenta → «Tu mes financiero».**
  - Un selector: «Mi mes empieza el día…» (1–28).
  - Un ejemplo con fechas reales: «del 28 de octubre al 27 de noviembre cuenta como noviembre».
  - Una **vista previa antes de guardar**: los 4 últimos periodos con entra, sale, ahorro y nº de movimientos, más el ahorro de antes cuando cambia.
  - Un aviso: solo cambia la clasificación; las fechas, los importes, el nº de movimientos y el patrimonio no cambian.
- **Con S ≠ 1, las etiquetas de periodo llevan su rango:**
  - el selector de Análisis: «Noviembre de 2026 · 28 oct – 27 nov»;
  - la cabecera de cada bloque en Movimientos.
- **Los textos de altura** dicen «a día 11 de tu periodo».
- **El día del ingreso habitual** se muestra como el día real del mes («hacia el día 28»).

## 5. Pruebas

- `periodo.test.js`: la definición formal.
  - día 1 = mes natural;
  - el ejemplo del 28;
  - cambio de año;
  - duraciones de 28, 29, 30 y 31 días;
  - sin huecos ni solapes para S ∈ {1, 2, 15, 25, 28};
  - valores fuera de rango.
- `periodo.equivalencia.test.js`: **la prueba más importante.**
  - Compara la foto de unos 38 resultados de todos los módulos que agrupan por mes, tomada con el código **anterior**, con la salida del código nuevo con día 1.
  - Usa 7 conjuntos de datos (el cliente de 3 años, Laura y 5 perfiles extremos) y 6 fechas «hoy» de borde.
  - Resultado: idéntica.
- `periodo.escenarios.test.js`:
  - nómina el día 28;
  - dos nóminas en un mismo periodo;
  - gastos del 28 al 31;
  - cambio de año;
  - meses de distinta duración;
  - periodos sin movimientos;
  - presupuesto en porcentaje;
  - **invariantes**: para S ∈ {1, 2, 10, 15, 25, 27, 28}, patrimonio y bolsas idénticos en varias fechas, suma de periodos = total al céntimo, nº de movimientos igual y datos sin mutar.
- `periodoVista.test.js`:
  - la vista previa no cambia la configuración activa;
  - los perfiles sin la columna dan 1.
- `tests/e2e/periodo.mjs`, con y sin la columna:
  - vista previa antes de guardar;
  - guardado;
  - mismo patrimonio y mismo nº de movimientos en pantalla;
  - el rango visible en Movimientos;
  - persistencia al recargar;
  - volver al día 1 lo deja todo como estaba.
