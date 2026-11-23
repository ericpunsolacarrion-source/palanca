# Palanca — Arquitectura de referencia v3

**Motor financiero central y sistema de información multifuente**
Fecha: 21/11/2026 · Estado: **propuesta para revisar, no aprobada** · Parte de: `docs/MOTOR.md` (la Constitución), la arquitectura consolidada y la revisión crítica v2.

> **No he cambiado nada.** No he tocado ningún archivo del proyecto, ni datos, ni la base de datos, ni Vercel, ni los conectores, ni los permisos. Este documento está fuera del repositorio, en mi carpeta de trabajo.
>
> **Etiquetas:**
> - **[C] comprobado:** lo he visto en el código o en los `.sql` del repositorio, con su ruta;
> - **[S] supuesto:** no lo he podido verificar;
> - **[P] propuesta:** algo nuevo.

---

## 0. Resumen en una página

1. **La v2 se queda corta para lo que pide esta versión.** Estaba pensada para una persona con un Excel. Ahora tiene que servir para muchas personas con varias fuentes a la vez. **El fallo de fondo:** la identidad de un movimiento era una única `ref_externa` guardada en la propia fila. Cuando un mismo gasto llega del banco, del Excel y de Fulcro, eso no funciona: hay **un solo hecho** pero **tres evidencias**.

2. **La pieza nueva central son tres capas separadas** (sección 4):
   - **Observaciones:** lo que dice cada fuente. Se guarda tal cual llega y no se cambia nunca.
   - **Hechos:** lo que ha pasado de verdad. Están versionados, como manda la Constitución.
   - **Estado derivado:** saldos, patrimonio, flujos y residuos. Siempre se calcula, nunca se guarda.

   Cada fuente es un **adaptador** que solo produce observaciones. El motor es el único que decide qué hechos existen. **Añadir una fuente nueva no toca el motor.**

3. **La Constitución se mantiene.** Esta arquitectura es su «Fase 2». Hacen falta **7 enmiendas**, todas explícitas (sección 20.2). Dos ya estaban pendientes: los apuntes derivados y el patrimonio anclado. Las otras cinco son nuevas: la excepción RGPD, la unidad mínima de cada moneda, separar procedencia de canal, activar la capa «valor ≠ coste» y la auditoría «tal como se registró».

4. **Cuatro decisiones de la v2 cambian:**
   - **Identidad:** pasa de `ref_externa` única en el movimiento a una tabla de observaciones vinculadas (sección 10).
   - **Borrado:** en vez de un *trigger* que hace de policía, todas las escrituras pasan por funciones, y los permisos directos de escritura se retiran (sección 9).
   - **Los cargos de tarjeta pendientes** no son hechos: se quedan como observaciones hasta que se liquidan (sección 10.4).
   - **El Excel bidireccional:** Palanca **nunca escribe en tu hoja original**. Escribe en un archivo propio de Palanca (sección 8.3). Es la forma de cumplir a la vez «Excel intocable» y «sincronización en los dos sentidos».

5. **Tres hallazgos nuevos y comprobados** que afectan al plan:
   - `borrar_mi_cuenta()` borra **cualquier tabla** que tenga `usuario_id` (`supabase-schema-metricas.sql:657`) [C]. Es bueno para el RGPD, pero **chocará** con las tablas de historial «de solo añadir». Hay que diseñar la excepción a propósito (sección 9.4).
   - **El límite de Vercel Hobby es de 12 funciones y ya usamos 10** (`api/`, sin contar los archivos que empiezan por `_`) [C]. La sincronización, los webhooks y Open Banking **no caben** como funciones sueltas: hace falta **un único punto de entrada** (sección 7.5).
   - **Hoy, la identidad de una importación es justo el hash que el encargo prohíbe:** `claveDuplicado = fecha|tipo|importe|nota` (`src/lib/importarCsv.js:310`) [C]. Funciona mientras la fuente es una sola, no con varias.

6. **Orden:** primero proteger (versiones y nada de borrados), después corregir (céntimos, claves foráneas, FIFO), luego cuentas y saldos reales, y **solo entonces** el sistema multifuente y las integraciones. Detalle en las secciones 18 y 19.

---

## 1. Diagnóstico de la arquitectura actual

### 1.1 Lo que hay hoy (comprobado)

| Pieza | Dónde | Estado |
|---|---|---|
| Motor único en céntimos | `src/lib/movimientosUtils.js` (`bolsas`, `totalesDe`, `centimosDe`, `sumaImportes`), empaquetado para el servidor en `api/_motor.js` | ✅ una sola fuente de cálculo para la app, Fulcro y el conector [C] |
| Significado de cada movimiento | El **nombre de la categoría** (`Inversion`, `Ahorro`, `Desde ahorro`, `Ajuste`, `Devoluciones`) en `categorias.js` | 🔴 contradice E5, E6 y N7: manda la semántica [C] |
| Venta de inversión | `bolsas()`: «invertido −= min(cobrado, invertido)» | 🔴 no usa el coste: ganancias y pérdidas mal reconocidas [C] |
| Cuentas | No existen. `fuentes` es una **etiqueta** (pagador o plataforma) con `on delete set null` (`supabase-schema-fuentes.sql`) | ⚫ [C] |
| Historial | `delete` físico en **5 sitios** de la app (`MovimientosV5.jsx:88`, `ImportarHistorial.jsx:489`, `RegistroMovimiento.jsx:172`, `Inversiones.jsx:208`, `ListaMovimientos.jsx:231`), más `useRecurrentes.js:363`, y en **3** del conector (`api/_mcpNucleo.js:292,311,689`) | 🔴 contradice H1 y N1 [C] |
| Saldos reales | Movimientos «Ajuste» que **sí** suman al patrimonio (`ajustes.js: crearAjuste`) | 🔴 contradice N5 [C] |
| Identidad de lo importado | `claveDuplicado(fecha, tipo, importe, nota)` | 🟠 sirve con una fuente, no con varias [C] |
| Capturas | `api/leer-capturas.js` lee movimientos y **descarta saldos, totales y pendientes** (línea 45). `fusionarCapturas` evita duplicar los solapes entre capturas | ✅ base útil · ⚫ no lee saldos ni posiciones [C] |
| Importación | `importarCsv.js` descarta las operaciones pendientes o rechazadas (`OPERACION_NO_HECHA`, línea 305) | ✅ [C] |
| Fulcro | Lee y responde. **No escribe movimientos** (`api/consultor.js` solo registra el uso) | ⚫ el registro por conversación no existe [C] |
| Conector de Claude | OAuth revocable; 12 herramientas; las de escritura piden vista previa y confirmación | ✅ · 🔴 tiene herramientas de borrado (D6) [C] |
| Esquema real de producción | `movimientos.importe_centimos` existe en producción, pero **no** en ningún `.sql` del repositorio | 🔴 deriva entre el repositorio y producción [C] |
| Supresión RGPD | `borrar_mi_cuenta()` dinámica, con 5 pasadas por las claves foráneas (`supabase-schema-metricas.sql:657`) | ✅ · ⚠ choca con tablas de solo añadir [C] |
| Límite de funciones | 10 de 12 en Vercel Hobby (`tests/api/limiteVercel.test.js` lo vigila) | ⚠ [C] |
| Copias de seguridad | Volcado manual hecho y comprobado el 21/11 (667 KB, tablas con datos) | 🟡 falta la prueba de restaurar [C] |

### 1.2 Qué impide la visión de producto

| Capacidad pedida | Qué lo impide hoy |
|---|---|
| Separar el banco, el efectivo del bróker y las posiciones | No hay cuentas: «Aportación al bróker» es un traspaso a una bolsa de ahorro genérica |
| Ganancias y pérdidas realizadas y no realizadas | No hay activos, unidades ni coste por lote, ni valoración |
| Varias fuentes sin duplicar | Una sola clave por hash; ningún vínculo entre fuente y hecho |
| Corregir el pasado con rastro | Los borrados y ediciones son físicos |
| Saldo real frente a saldo calculado | El ajuste es un tapón dentro del patrimonio |
| Excel en los dos sentidos | No hay identidad de fila ni registro de sincronizaciones; escribir en la hoja del usuario está prohibido |
| Pasivos | No existen |
| Otras monedas | Todo se da por EUR |

### 1.3 Ejemplo del encargo con la regla actual (la Fase 1)

5.000 € en el banco → transfieres 3.000 € al bróker → compras por 1.000 € → vendes una parte por 400 € netos, cuyo coste era de 300 €.

- **Hoy, Palanca diría:** invertido **600 €** (1.000 − 400) y patrimonio **5.000 €**.
- **Lo correcto:** coste vivo **700 €** y patrimonio **5.100 €**, porque la venta tuvo **+100 €** de ganancia.
- **El fallo es el mismo** que ya vimos con datos reales, pero con el signo contrario: con pérdidas, Palanca sobrevalora; con ganancias, infravalora.

El ejemplo completo y correcto está en la sección 5.3.

---

## 2. Qué se conserva

| Se conserva | Por qué |
|---|---|
| **La Constitución entera** (E, T, P, H, C, R, N, F) | Es correcta y más estricta que el código. El problema es que el código no la cumple |
| **Motor puro, una sola fuente de cálculo**, empaquetado para el servidor | Es justo lo que pide «el motor no depende de la fuente». Ya funciona |
| **Céntimos enteros en el núcleo** | Ya está aplicado (P1–P3) y probado con fuzz (`motorInvariantes.test.js`) |
| **`App.jsx` carga todo y las pantallas derivan** | Coherente con «el estado derivado no se guarda» |
| `recurrentes`, `planificaciones` y `recurrentes_confirmaciones` | Las previsiones ya están separadas de lo real |
| Lectores: `importarCsv.js`, `plantillaPalanca.js`, `leerArchivo.js`, `mapear-columnas`, `leer-capturas`, `fusionarCapturas` | Pasan a ser **adaptadores**, sin reescribirlos |
| `comercios_alias` + `claveComercio` (`docs/IDENTIDAD.md`) | Es la identidad de comercio que necesita la deduplicación |
| El conector OAuth, con vista previa y `confirmar` | Ya es el patrón de «propone → ratifica» que pide F4 |
| RLS `usuario_id = auth.uid()::text` | Se mantiene y se **refuerza** con claves foráneas compuestas |
| La base de `borrar_mi_cuenta()` dinámica | La supresión RGPD ya cubre las tablas futuras; solo hay que coordinarla con el historial |

## 3. Qué hay que cambiar

| Cambia | De → a | Sección |
|---|---|---|
| Semántica por categoría | `tipo_evento` controlado; la categoría pasa a ser solo un motivo | 4.2 |
| Venta | FIFO por activo y usuario, con coste desconocido explícito | 6 |
| Ajuste-tapón | Atestación con residuo aparte | 11 |
| Borrado y edición físicos | Funciones `editar_hecho`, `anular_hecho` y `restaurar_version`, con historial; sin permiso de borrar | 9 |
| `importe` numeric + `importe_centimos` | Una sola representación canónica: `importe_minor` bigint | 9.6 |
| `fuentes` como etiqueta | Se queda como etiqueta («pagador o comercio»). Las conexiones de datos van en una tabla **nueva**, `conexiones`, para no mezclar dos ideas con el mismo nombre | 7 |
| `claveDuplicado` como identidad | Observaciones vinculadas + puntuación + propuestas | 10 |
| Importaciones no atómicas | `registrar_lote` en una transacción, idempotente y con huella del contenido | 7.4 |
| Herramientas de borrado del conector | Retiradas (D6); el conector **anula** con vista previa | 9 |
| Funciones sueltas en `api/` | Un único punto de entrada para la ingesta (`/api/ingesta`) | 7.5 |

---

## 4. Arquitectura del motor financiero central

### 4.1 Las tres capas

```
 FUENTES                ADAPTADORES                 NÚCLEO                         SALIDAS
 manual ─┐                                     ┌─────────────────────┐
 Excel ──┤   leer → normalizar → validar       │ HECHOS versionados  │──► motor puro ──► estado derivado
 Sheets ─┤   (uno por fuente; sin cálculo      │ (movimientos +      │      (saldos, patrimonio,
 banco ──┼─► financiero)  ──► OBSERVACIONES ──►│  atestaciones)      │       flujos, FIFO, residuos)
 bróker ─┤       inmutables, con procedencia   └─────────▲───────────┘              │
 captura ┤                    │                          │ propuestas                │
 Fulcro ─┤                    └──► CONCILIADOR (dedupe, ─┘ ratificadas      exportadores (Sheets,
 Claude ─┘                         discrepancias)          (usuario/política) CSV, informes) ──► conexiones
```

- **Observación:** «la fuente X dijo esto, sobre esta cuenta, en este momento». Es inmutable: si la fuente cambia de opinión, llega **otra** observación.
- **Hecho:** «esto ocurrió». Hay dos clases:
  - **movimientos**, que generan apuntes;
  - **atestaciones**, que no generan apuntes y producen el residuo (N5).
  
  Los dos están versionados (H1, H6).
- **Motor:** una función pura `estado(hechos vigentes, fecha, version_motor)`. **No lee observaciones.** Esto garantiza que ninguna fuente tenga su propio cálculo financiero.
- **Conciliador:** compara las observaciones con los hechos y produce **propuestas**: crear, vincular, actualizar, anular o discrepancia. Nunca escribe hechos por su cuenta. Lo hace una función atómica cuando el usuario ratifica, o una **política que el propio usuario definió** (F4).

### 4.2 Vocabulario estructural (`tipo_evento`)

| tipo_evento | Apuntes (E = exterior, C = cuenta de efectivo, P(a) = posición a coste, D = pasivo) | Δ patrimonio a coste | Flujo |
|---|---|---|---|
| `ingreso` | E → C | +X | ingreso |
| `gasto` | C → E | −X | gasto (consumo) |
| `devolucion` | E → C | +X | −gasto de su categoría |
| `correccion_ingreso` | C → E | −X | −ingreso |
| `transferencia` | C₁ → C₂ | 0 | — |
| `compra` | C → P(a): bruto + comisión + impuestos de la operación | 0 | — |
| `venta` | P(a) → C: K; ganancia E → C: R−K; pérdida P(a) → E: K−R | R − K | resultado realizado (no es flujo de ahorro, D4) |
| `dividendo` / `interes` | E → C: neto; la retención, aparte | +neto | ingreso financiero (neto) |
| `comision` (suelta: custodia, mantenimiento) | C → E | −X | gasto financiero |
| `traslado_posicion` | P(a)@cuenta₁ → P(a)@cuenta₂; los lotes conservan fecha y coste | 0 | — |
| `saldo_inicial` | E → C (o E → P(a), lote de apertura) | +X | — (capital anterior a los datos) |
| `disposicion_prestamo` | D → C: recibes el dinero y la deuda crece | 0 | — |
| `amortizacion` | C → D: pagas el principal | 0 | — |
| `interes_deuda` | C → E | −X | gasto financiero |
| `operacion_corporativa` | reescala las unidades de los lotes | 0 | — |

Leyenda: R = importe neto cobrado; K = coste FIFO asignado.

**Por qué los pasivos son bolsas negativas y no algo aparte:** la Constitución lo prevé de forma expresa («una deuda es una bolsa negativa por diseño», §8). Así:
- pedir un préstamo **no cambia** el patrimonio: entra dinero y entra deuda;
- pagar el principal tampoco;
- solo los intereses lo bajan.

No hay nada que «restar dos veces», porque el pasivo **es** una bolsa y se suma una vez, con su signo. Detalle en la sección 5.4.

### 4.3 Módulos (dividir sin duplicar)

`movimientosUtils.js` se queda como **fachada**, con la misma interfaz que hoy, para que las pantallas no cambien. Por dentro:

| Módulo | Responsabilidad | Viene de |
|---|---|---|
| `motor/deducir.js` | `deducirTipo(movimiento de la Fase 1)` → `tipo_evento`. Reproduce **al céntimo** la regla actual | `categorias.js`, `bolsas()` |
| `motor/traducir.js` | hecho → apuntes | nuevo |
| `motor/cuentas.js` | saldo calculado, saldo anclado y residuo por cuenta | `bolsas()`, `ultimaReconciliacion` |
| `motor/lotes.js` | FIFO, coste vivo, realizado, coste desconocido | nuevo |
| `motor/flujos.js` | ingresos, gastos, ahorro, ratio | `totalesDe`, `gastoPorCategoria` |
| `motor/valor.js` | valor de mercado, no realizado, cobertura de la valoración | nuevo (F2b) |
| `motor/patrimonio.js` | a coste, anclado, a mercado, pasivos | `bolsas()` |
| `motor/rendimiento.js` | aportaciones netas, rentabilidad ponderada por dinero (XIRR) y por tiempo (TWR), solo con datos completos | nuevo |
| `motor/fiscal.js` | **informe** por ejercicio. Nunca lo lee el patrimonio | nuevo, P5 |
| `conciliador/*.js` | puntuar, proponer, discrepancias. **No calcula dinero**: usa el motor | `fusionarCapturas`, `claveComercio`, `cuadrar_con_excel` |

`VERSION_MOTOR` es una constante que se publica con cada cambio de reglas. Con los mismos hechos y la misma versión, el resultado es idéntico byte a byte.

---

## 5. Modelo de cuentas y patrimonio

### 5.1 Cuentas

| clase | naturaleza | grupo en pantalla | Ejemplos |
|---|---|---|---|
| `corriente` | activo | Bancos | BBVA, ING |
| `ahorro` | activo | Ahorro | cuenta remunerada, depósito |
| `broker` | activo (efectivo + posiciones dentro) | Inversión | Trade Republic, MyInvestor, Interactive Brokers |
| `cripto` | activo (efectivo en moneda normal + activos cripto dentro) | Cripto | un exchange, una cartera |
| `efectivo` | activo | Efectivo | cartera, hucha |
| `tarjeta_credito` | pasivo | Pasivos | tarjeta de crédito con liquidación mensual |
| `prestamo` / `hipoteca` | pasivo | Pasivos | préstamo personal, hipoteca |

- Cada cuenta tiene **una moneda**. Hay que poder **añadirla, archivarla y restaurarla**, pero **nunca borrarla** si tiene hechos.
- **Proveedor** = la entidad (BBVA, Trade Republic). **Conexión** = cómo llegan sus datos. Una cuenta puede tener **ninguna, una o varias conexiones**: manual, extracto y API.
- **Las tarjetas de débito no son cuentas:** son un **medio de pago** de una cuenta corriente.
- **Una tarjeta de crédito sí es una cuenta de pasivo.** Sus compras son `gasto` desde la tarjeta (la deuda crece). El recibo mensual es una `transferencia` del banco a la tarjeta, **no es gasto**. Esto evita el error más típico de los agregadores: contar la compra y también el recibo de la tarjeta.

### 5.2 Las magnitudes, sin confundirlas

Todas se calculan por cuenta y por fecha D, y luego se suman por grupo y en total.

| Magnitud | Definición | Fórmula | Si falta información |
|---|---|---|---|
| **Saldo calculado** | Lo que dicen tus hechos | Σ apuntes de la cuenta con fecha ≤ D | Siempre existe |
| **Saldo atestado** | Lo que dijo una fuente sobre el saldo real | La atestación vigente de ese día (con su tipo: contable o disponible) | No existe |
| **Saldo anclado** | La última verdad conocida, puesta al día | atestación a (≤ D) + Σ apuntes entre a y D | Sin atestación: igual al calculado y marcado «no verificado» |
| **Residuo** | Lo que tus hechos no explican | atestado − anclado previsto, por tramo | **Nunca se suma (N5)** |
| **Efectivo en plataformas** | Lo líquido dentro de brókers y cripto | Σ saldos calculados (o anclados) de las cuentas `broker` y `cripto` | Igual que cualquier cuenta |
| **Aportaciones netas a inversión** | Tu dinero que cruzó de cuentas no inversoras a inversoras | Σ transferencias que entran en cuentas de inversión − Σ las que salen | Antes del primer dato: el saldo inicial de la cuenta de inversión, marcado |
| **Coste vivo** | Lo que costó lo que aún tienes | Σ coste de los lotes abiertos (FIFO) | Lote de coste desconocido: aparte, sin inventar |
| **Valor de mercado** | Lo que vale hoy | Σ unidades × precio, o la última valoración ≤ D | Sin valoración: «valorado a coste», marcado |
| **Realizado** | Resultado de lo vendido | Σ (R − K) | K desconocido: «no calculable» |
| **No realizado** | Resultado «en papel» | valor de mercado − coste vivo, solo de las posiciones valoradas | Posición sin valorar: no entra en la suma |
| **Pasivos** | Lo que debes | Σ saldos de las cuentas de pasivo (negativos) | Sin datos de la deuda: no se inventa; se avisa si hay pagos de préstamo sin cuenta de pasivo |
| **Patrimonio a coste** (canónico, E2) | Lo tuyo según tus hechos | Σ saldos calculados de todas las cuentas + coste vivo | Siempre existe |
| **Patrimonio anclado** | Lo mismo, con los saldos reales | Σ saldos anclados + coste vivo, con su **cobertura** | Se dice qué cuentas están verificadas y desde cuándo |
| **Patrimonio a mercado** | A precios actuales | Σ saldos anclados + valor de mercado | Con cobertura de valoración |
| **Diferencias pendientes** | Lo que hay que mirar | Σ residuos abiertos + discrepancias sin resolver | — |

**Regla de nombres:**
- «**Verificado**» solo se puede decir si **todas** las cuentas activas tienen una atestación en la misma fecha y no hay hechos posteriores.
- Si no, se dice «**anclado**», con su cobertura. Por ejemplo: «3 de 4 cuentas, verificado hasta el 18/11».

### 5.3 El ejemplo del encargo, correcto

10 acciones a 100 € · vendes 3 a 135 € (405 € brutos − 5 € de comisión = 400 € netos) · precio de hoy, 140 €.

| Paso | Banco | TR efectivo | Coste vivo | Valor | Aportación neta | Realizado | Patrimonio a coste | A mercado |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| 0. Saldo inicial | 5.000 | 0 | 0 | — | 0 | — | 5.000 | 5.000 |
| 1. Transferencia de 3.000 € | 2.000 | 3.000 | 0 | — | **3.000** | — | **5.000** | 5.000 |
| 2. Compra de 10 acciones a 100 € | 2.000 | 2.000 | 1.000 | 1.000 | 3.000 | — | 5.000 | 5.000 |
| 3. Venta de 3 (R = 400; K = 300) | 2.000 | **2.400** | 700 | — | 3.000 | **+100** | **5.100** | — |
| 4. Valoración: 7 acciones × 140 € | 2.000 | 2.400 | 700 | **980** | 3.000 | +100 | 5.100 | **5.380** |

**Comprobaciones:**
- Patrimonio a coste: 5.000 + 100 (realizado) = **5.100** ✓.
- A mercado: 5.100 + 280 (no realizado: 980 − 700) = **5.380** ✓.
- Resultado de la plataforma: (2.400 + 980) − 3.000 aportados = **380** = 100 + 280 ✓.
- La transferencia no cambió nada (E4). La compra tampoco: la comisión, si la hubiera, iría dentro del coste.

**Lo que se enseña en «Inversión»:**

| Métrica | Valor | Qué contesta |
|---|--:|---|
| Has aportado | 3.000 € | «¿Cuánto dinero mío he metido?» |
| Efectivo sin invertir | 2.400 € | «¿Cuánto tengo parado en el bróker?» |
| Coste de lo que tienes | 700 € | «¿Cuánto me costó lo que aún tengo?» |
| Vale hoy | 980 € (a 21/11) | «¿Cuánto vale?» |
| Ganado ya | +100 € | «¿Qué gané al vender?» |
| Ganancia en papel | +280 € | «¿Qué ganaría si vendo hoy?» |
| **Resultado total** | **+380 € sobre 3.000 € aportados** | «¿Me ha ido bien?» |

**Cómo se mantiene limpia la «aportación»:**
- **Retirada:** la resta.
- **Venta:** no la cambia, porque el dinero se queda en el bróker.
- **Dividendo:** no la cambia; es resultado.
- **Traslado de posición:** no la cambia, porque no cruza de una cuenta no inversora a una inversora.

### 5.4 Pasivos sin restar dos veces

- Cada deuda es **una** cuenta de pasivo. El patrimonio la suma **una vez**, con signo negativo.
- **En pantalla:** «Pasivos: 120.000 €» (en valor absoluto) y «Patrimonio neto = activos − pasivos». Las dos cifras salen de la misma suma, no de dos cálculos distintos.
- **La cuota de la hipoteca son dos hechos:**
  - `amortizacion`: el principal, que es neutro;
  - `interes_deuda`: los intereses, que son gasto financiero.
  
  Si el banco solo da la cuota total, el adaptador propone el reparto con el cuadro de amortización, si el usuario lo tiene, o la deja como «cuota sin desglosar», marcada.
- **Un descubierto en la cuenta corriente** sigue siendo **liquidez negativa** de esa cuenta. No se convierte en pasivo. La diferencia está en la **clase** de la cuenta, no en el signo.
- **Invariante:** ninguna cuenta corriente con saldo negativo aparece en el grupo «Pasivos», y ningún pasivo aparece como «liquidez».
- **La vivienda u otros bienes** quedan fuera de alcance en la v3. Si se añaden, serían una clase `bien` con valoración manual. Sin eso, el «patrimonio neto» con hipoteca **sale artificialmente negativo**, y hay que decirlo en la pantalla (D23).

### 5.5 Presentación agrupada

```
Patrimonio  48.320 €   ▸ anclado · 3 de 4 cuentas · verificado hasta el 18/11
            a mercado 51.105 €   ·   diferencias por revisar: 1

Bancos       12.410 €  ▾      BBVA corriente   12.300 €  ✓ 18/11 (extracto)
                                ING              110 €    · calculado
Ahorro        8.000 €  ▸
Inversión    27.910 €  ▸      (efectivo 2.400 · coste 25.510 · vale 28.695)
Cripto            0 €  ▸ archivado
Pasivos           —            (ninguno)
```

- **La agrupación es solo de pantalla.** Cada grupo es la suma de sus cuentas, y una cuenta pertenece a un solo grupo.
- Cada cuenta enseña su **estado**: ✓ verificado (con fecha y fuente), · calculado, ⚠ diferencia por revisar o ⏳ desactualizado (más de 31 días, configurable).
- **Detalle de una cuenta:** saldo calculado frente al atestado, línea temporal de atestaciones, residuo por tramo, conexiones y «¿de dónde sale esta cifra?» (sección 12).

---

## 6. Modelo de inversiones

### 6.1 Tres capas que no se mezclan

| Capa | Pregunta | Reglas | Toca el patrimonio |
|---|---|---|---|
| **Medición patrimonial** | ¿Cuánto tengo? | FIFO por activo y usuario, entre todas las plataformas; coste con comisiones | Sí: es la única |
| **Rendimiento** | ¿Cómo me ha ido? | Aportaciones netas, XIRR y TWR, solo si el historial está completo | No |
| **Fiscalidad** | ¿Qué declaro? | Por clase de activo y normativa; foto por ejercicio | **Nunca** |

### 6.2 Activos y lotes

- **`activos`:** isin (único por usuario si existe), ticker, nombre, clase (`accion`, `etf`, `fondo`, `bono`, `cripto`, `otro`), moneda de cotización y `grupo_homogeneo` (para FIFO entre plataformas).
- **Los lotes no se guardan:** se **calculan** a partir de las compras, ventas y traslados vigentes. Solo se congela una foto en los cierres fiscales (sección 9.5).

### 6.3 Comisiones, impuestos y retenciones (cada cosa una sola vez)

| Operación | Columnas | Regla | Efecto |
|---|---|---|---|
| Compra | `bruto_minor`, `comision_minor`, `impuesto_op_minor` (p. ej. el impuesto sobre transacciones financieras español [S]), `importe_minor` = total pagado | `importe = bruto + comisión + impuesto` (CHECK) | Coste del lote = `importe` |
| Venta | `bruto_minor`, `comision_minor`, `importe_minor` = neto cobrado | `importe = bruto − comisión` | R = `importe` |
| Dividendo o interés | `bruto_minor`, `retencion_origen_minor`, `retencion_destino_minor`, `importe_minor` = neto | `importe = bruto − retenciones` | Ingreso financiero = neto (igual que la nómina, que va en neto). Bruto y retenciones, para el informe fiscal |
| Comisión suelta | `importe_minor` | Sin `bruto` ni `comision` | Gasto financiero |

- **Si el bróker da la comisión en una línea aparte**, el adaptador la **funde** en la operación: las dos observaciones se vinculan al mismo hecho.
- **Invariante:** una comisión se registra **o** dentro de una compra o venta **o** como hecho `comision`, nunca las dos. El conciliador lo comprueba al vincular: misma fecha, mismo activo y mismo importe que la comisión de una operación vinculada → se propone fundir.

### 6.4 Información incompleta

| Situación | Tratamiento |
|---|---|
| Venta con unidades | FIFO; el reparto de céntimos, por resto mayor (P4) |
| Venta total sin unidades (`cierra_posicion`) | Consume todos los lotes |
| **Venta parcial sin unidades** | **No se adivina.** K = «pendiente»; realizado «no calculable»; tarea para el usuario |
| **Posición con coste desconocido** | **Lote de apertura con `coste_conocido = false`.** Se mantiene identificada como tal en todas las pantallas |
| **Venta de un lote con coste desconocido** | **El cobro NO se convierte en ganancia.** Patrimonio: el efectivo sube R y el lote desaparece. Como su coste era desconocido, **se trata como capital anterior a los datos** (el Δ patrimonio lo explica el `saldo_inicial` implícito del lote). Realizado: «no calculable» |
| Compras anteriores al primer dato | Igual: lote de apertura de coste desconocido, o el coste que indique el usuario (procedencia manual) |
| Rentabilidad con huecos | XIRR y TWR **no se muestran**. Se ve «faltan compras anteriores a 05/2023 para calcular la rentabilidad» |
| Traslado entre plataformas | `traslado_posicion`: los lotes conservan fecha y coste. La aportación neta no cambia |
| Desdoblamiento o agrupación | `operacion_corporativa`: unidades × factor, coste igual |
| Multidivisa | Coste en la moneda de liquidación (normalmente EUR, la del bróker). Si el bróker liquida en USD: la cuenta es en USD y la conversión pertenece a la capa de valor (F2b) |

**Contradicción a resolver (D26):** con coste desconocido, ¿el patrimonio a coste sube con el cobro?
- **Hoy:** con el tope de `bolsas()`, el exceso cuenta como ganancia.
- **La v3 propone:**
  1. el lote de apertura **sí** está en el patrimonio, con un coste estimado de 0 marcado como desconocido;
  2. **o** pedir el valor de apertura al usuario.

  **Recomiendo la 2**, con la 1 como alternativa marcada. Es una decisión de producto.

### 6.5 Fiscalidad (capa aparte, con validación pendiente)

Se mantiene la tabla de la revisión crítica v2. El resumen:
- **Acciones y ETF:** FIFO, con la regla de recompra de 2 meses.
- **Fondos no cotizados:** regla de 1 año, y los traspasos entre fondos no tributan.
- **Bonos:** rendimiento del capital mobiliario.
- **Cripto:** FIFO por moneda; cambiar una cripto por otra tributa.
- **Dividendos:** con su retención.
- **Compensación:** con su límite y caducidad a los 4 años.

**Antes de construir esta capa, hay que validarlo con un asesor fiscal** (D-fiscal). La capa fiscal **no forma parte del producto principal**. Palanca analiza; **no recomienda comprar ni vender**.

---

## 7. Arquitectura multifuente y adaptadores

### 7.1 Contrato común de un adaptador

```
adaptador.leer(entrada, contexto) → Lote {
  conexion_id, idempotencia, hash_contenido,
  observaciones: [ ObservacionNormalizada ],
  avisos: [ {fila, motivo} ]
}

ObservacionNormalizada =
  | { clase: 'movimiento', cuenta_hint, fecha_efectiva, fecha_valor?, importe_minor, moneda,
      signo, concepto, contraparte?, id_externo?, ref_bancaria?, estado_fuente: 'pendiente'|'liquidado'|'revertido',
      tipo_hint?, categoria_hint?, activo_hint?, unidades?, bruto?, comision?, retenciones? }
  | { clase: 'saldo', cuenta_hint, fecha_saldo, tipo_saldo: 'contable'|'disponible', importe_minor,
      moneda, incluye_pendientes? }
  | { clase: 'posicion', cuenta_hint, activo_hint, fecha, unidades?, valor_minor?, coste_minor? }
```

- **El adaptador NO calcula dinero:** no suma, no deduce el patrimonio y no decide si algo es un duplicado. Solo **traduce el formato** y marca lo que no entiende.
- **Cada adaptador declara su capacidad:** qué clases de observación da, si trae IDs externos, si distingue pendientes, cuánto historial ofrece, la granularidad, la moneda, y si sabe a qué fecha corresponde el saldo («a fecha de»).

### 7.2 Catálogo de adaptadores

| Fuente | Reutiliza | IDs externos | Confianza por defecto | Estado |
|---|---|---|---|---|
| Manual (app) | formularios actuales | — | alta (el usuario lo declara) | existe |
| Plantilla Palanca y CSV | `importarCsv.js`, `plantillaPalanca.js` | no (huella + ordinal) | media | existe; hay que llevarlo al contrato |
| Excel de formato libre | `leerArchivo.js` + `mapear-columnas` (IA) | no | media-baja: el mapeo lo decide la IA y se confirma | existe |
| Google Sheets | API de Sheets (solo lectura) | ID de fila de Palanca, si es su archivo | media | nuevo |
| Extracto (PDF o CSV del banco) | `importarCsv.js` | a veces (referencia) | alta en importes, media en conceptos | parcial |
| Captura (movimientos) | `leer-capturas` + `fusionarCapturas` | no | media-baja | existe |
| Captura (saldo o posiciones) | `leer-capturas`, ampliado | no | **baja**: la fecha puede ser antigua y puede faltar algo | nuevo |
| Fulcro (conversación) | `consultor.js` + el motor | — | depende del caso (7.3) | nuevo |
| Claude (conector) | `api/_mcpNucleo.js` | idImportacion | la del contenido | existe |
| Open Banking (agregador) | — | **sí** (id de transacción, pendiente → liquidado) | alta | futuro |
| Bróker por API o informe (por ejemplo, el informe de Interactive Brokers) | — | sí | alta | futuro |
| Cripto (API de solo lectura) | — | sí | alta en unidades, media en el valor en EUR | futuro |

### 7.3 Procedencia, canal y confianza (enmienda A4)

La Constitución define una sola **procedencia**: `manual`, `regla` o `importado`. Con varias fuentes hacen falta tres cosas separadas:
- **procedencia** (F4): quién declara la verdad (`manual`, `regla`, `importado`, `sugerido`). `sugerido` es lo que deduce una IA, por ejemplo de una foto.
- **canal:** por dónde llegó (`app`, `fulcro`, `claude`, `excel`, `sheets`, `extracto`, `captura`, `api`).
- **confianza** de la observación: alta, media o baja, con su **motivo** (por ejemplo, «captura sin fecha visible»).

Ejemplos:
- «Fulcro, apunta 12 € de café» es `manual` por el canal `fulcro`: lo declara el usuario.
- «Fulcro, mira esta foto del ticket» es `sugerido` por el canal `fulcro`. Necesita que el usuario lo ratifique.

### 7.4 Ingesta atómica e idempotente (cubre el punto 10.5 del encargo)

- **`lotes`:** `id` (la **clave de idempotencia**, que da quien llama), `conexion_id`, `hash_contenido` (sha256 de las observaciones normalizadas, en orden canónico), `estado` y contadores.
- **`registrar_lote(id, hash, observaciones)`:**
  1. bloqueo en la transacción por (usuario, conexión): `pg_advisory_xact_lock`. Dos importaciones a la vez **se ponen en cola**, no se mezclan;
  2. si `id` existe con el **mismo** hash, devuelve el resultado anterior y no hace nada;
  3. si `id` existe con **otro** hash, da error `LOTE_CONFLICTO`. Así una clave **nunca** se reutiliza en silencio con otro contenido;
  4. inserta las observaciones y ejecuta el conciliador, que solo **propone**;
  5. confirma todo o nada.
- **`confirmar_propuestas(lote_id, decisiones, huella_estado)`:** aplica las propuestas aceptadas **en una transacción**, solo si la huella del estado actual de los hechos afectados coincide con la de la vista previa. Si algo cambió entre la vista previa y la confirmación, no aplica nada y pide revisar.
- **Unidad lógica:** una compra y su línea de comisión, o los dos lados de una transferencia, se confirman **juntas o ninguna**. Así una importación nunca queda a medias.

### 7.5 Dónde corre (restricción comprobada)

En Vercel Hobby quedan **2 de 12 funciones** libres [C]. Propuesta:
- **`/api/ingesta`**: un único punto de entrada para los adaptadores del servidor, con el tipo de fuente como parámetro;
- **`/api/sync`**: el cron de sincronizaciones y los webhooks de proveedores, con firma comprobada;
- todo lo demás, en archivos `_*.js`, que no cuentan para el límite.

Si hacen falta más, la alternativa es el plan Pro de Vercel o Supabase Edge Functions (D27).

---

## 8. Sincronización bidireccional

### 8.1 Principios

1. **Cada dirección tiene su destino.** Entrar = leer una fuente. Salir = escribir en un destino **propiedad de Palanca**. Nunca se lee y se escribe el mismo rango de celdas.
2. **Nada externo sobrescribe en silencio lo confirmado.** Un hecho ratificado (manual o confirmado) solo cambia con una versión nueva que alguien aprueba: el usuario, o una política suya que lo permita para esa fuente y ese campo.
3. **Todo es idempotente:** repetir una sincronización da el mismo resultado.

### 8.2 Elementos

| Elemento | Diseño |
|---|---|
| Origen | `conexion_id` en cada observación y en cada lote |
| Idempotencia | (conexión, id externo) o (conexión, huella + ordinal) + `hash_contenido` |
| Duplicados | Conciliador (sección 10) |
| Modificaciones | Mismo id externo con otro contenido → propuesta «actualizar», con diferencias campo a campo |
| Conflictos | **Fusión a tres bandas** por campo: base = la versión del hecho que se sincronizó por última vez con esa conexión (`vinculo.version_base`). Si solo cambió un lado, se aplica según la autoridad del campo. Si cambiaron los dos, va a la cola de conflictos |
| Bucles | Cada exportación lleva el `hecho_id` y la `version`. Una observación que entra con un `hecho_id` cuya versión vigente **es** la que exportamos es un **eco**: se ignora. Además, Palanca **no lee** sus propios destinos como fuente, salvo la pestaña de «cambios del usuario» (8.3) |
| Reintentos | Un cursor por conexión; si un lote falla, se repite igual (idempotente) |
| Registro | `lotes` = una sincronización: inicio, fin, cursor desde y hasta, contadores (nuevas, vinculadas, conflictos, errores) y errores por observación |
| Errores parciales | Cada observación tiene su estado (`ok`, `aviso`, `error`). Las unidades lógicas que están bien se confirman y las que fallan se quedan en la bandeja, sin romper el lote |
| Permisos | Lo mínimo para cada dirección (8.3) |
| Pausar y reanudar | `conexiones.estado`: `activa`, `pausada`, `revocada` o `error`. En pausa se conserva el cursor; al reanudar, se sigue desde donde se dejó |
| Eliminaciones en la fuente | Una fila que desaparece genera la propuesta «¿anular?». **Nunca se anula sola** si el hecho tiene otra evidencia o fue confirmado a mano |

### 8.3 Excel y Google Sheets (cubre el punto 10.6 del encargo)

**Contradicción detectada:** el encargo pide sincronizar en los dos sentidos, y una regla tuya anterior dice que **el Excel es intocable**. Las dos cosas solo se cumplen a la vez así:

| Dirección | Destino | Permiso | Identidad de la fila |
|---|---|---|---|
| **Entrada desde tu hoja** | Tu Excel o Sheet **original** | **Solo lectura** (`spreadsheets.readonly`, o la cuenta de Google en modo Lector) | Huella (conexión, hoja, fecha, importe, concepto normalizado) + **ordinal** entre filas idénticas (la regla de `fusionarCapturas`). **Es frágil:** si cambias el importe y el concepto a la vez, sale «posible modificación», que confirmas tú |
| **Salida hacia una hoja** | **Un archivo que crea Palanca** («Palanca · mis movimientos»), con el permiso `drive.file`: solo ve los archivos que crea ella | Escritura **solo en ese archivo** | Columna oculta `ID Palanca` = `hecho_id` + versión |
| **Cambios hechos en esa hoja** | Pestaña «Cambios» del archivo de Palanca | Lectura | Con `ID Palanca` se compara exactamente; sin él, es una fila nueva |

- **Si un usuario sí quiere que Palanca escriba en su hoja original**, se ofrecerá más adelante: añadir una columna `ID Palanca` con su permiso expreso, que se puede retirar. **No es necesario** para la sincronización en los dos sentidos.
- **Varias hojas u orígenes:** la huella incluye la conexión y la hoja. La misma fila en dos hojas son **dos observaciones** que el conciliador puede vincular al mismo hecho; nunca se convierten en dos hechos de forma automática.

### 8.4 Autoridad por campo (en vez de una jerarquía fija)

| Campo | Quién manda por defecto | Por qué |
|---|---|---|
| Importe y fecha de un cargo **liquidado** | Banco por API > extracto > captura > manual | El banco es quien lo ejecuta |
| Existencia de un cargo | Banco por API; lo manual solo se confirma al vincularlo | — |
| Categoría, nota y reparto | **Usuario** > regla del usuario > IA > banco | Es interpretación, no un hecho |
| Unidades y precio de una operación | Bróker (API o informe) > captura > manual | — |
| Saldo de una cuenta | Depende de su **antigüedad y tipo** (sección 11), no solo de la fuente | — |
| Valor de mercado | Proveedor de precios > captura del bróker > manual | — |

- **Una corrección manual explícita** («este saldo está mal, el bueno es X») **gana siempre**, pero queda **registrada como decisión** y se avisa si contradice algo reciente.
- **La tabla son valores por defecto que se pueden cambiar** para cada conexión. La política del usuario se guarda (F4).

---

## 9. Recálculo histórico y versionado

### 9.1 Recalcular (punto 5.1 del encargo)

- **El recálculo es automático por construcción:** el estado derivado es una función pura de los hechos vigentes (T2 y T3). Meter un gasto de hace una semana o corregir una compra de 2023 cambia la proyección de todas las fechas siguientes: saldos, gráficos, presupuesto de ese periodo, ahorro, patrimonio, lotes FIFO y realizado.
- **Fecha de recepción ≠ fecha efectiva:**
  - la observación guarda `recibido_en` y `fecha_efectiva`;
  - la versión del hecho guarda `registrado_en`;
  - el motor **solo** usa `fecha` (económica), como manda T1.
- **Qué dato causó el recálculo:** cada versión guarda autor, canal, lote, motivo y `registrado_en`. «¿Por qué cambió mi patrimonio de marzo?» se contesta con una consulta: versiones registradas después de X con fecha económica en marzo.
- **Vista previa del impacto:** `previsualizar(cambio)` ejecuta el motor **con** y **sin** el cambio y enseña la diferencia en patrimonio, realizado por ejercicio, presupuesto del periodo y número de hechos afectados. Pide confirmación si:
  - toca un ejercicio fiscal cerrado;
  - cambia un mes ya cerrado en más de un umbral;
  - o afecta a más de N hechos.

### 9.2 ¿Hacen falta instantáneas?

- **Para que sea correcto, no.** Para la velocidad, **todavía no** [S]. Un usuario tiene miles de filas, no millones, y el FIFO en memoria es lineal. Hoy la app ya carga todo el historial de una vez.
- **Si hiciera falta** (por ejemplo, más de 50.000 filas o Open Banking a escala), `instantaneas` sería **solo una caché**: (usuario, fecha_hasta, version_motor, hash_hechos) → estado. Se invalida cuando cambia el hash. **Nunca sería autoritativa** (N3).
- **Reproducibilidad:** mismos hechos + misma `VERSION_MOTOR` = mismo resultado. Un cambio de reglas se **anuncia** (registro de versiones del motor) y se puede **comparar**: el motor antiguo y el nuevo sobre los mismos hechos.

### 9.3 Versionado sin *triggers* ambiguos (punto 10.1 del encargo)

**El problema de la v2:** confiaba en un *trigger* para convertir todo `UPDATE` en versión, y en RLS para impedir el borrado. Las escrituras directas seguían abiertas.

**La propuesta v3:**
1. **Todas las escrituras de hechos pasan por funciones:**
   - `registrar_hecho`, `editar_hecho(id, version_esperada, cambios, motivo)`, `anular_hecho(id, version_esperada, motivo)`, `restaurar_version(id, version)`;
   - `registrar_lote` y `confirmar_propuestas`.
2. **Se retiran** los permisos `INSERT`, `UPDATE` y `DELETE` sobre `movimientos` y `atestaciones` para `authenticated` y `anon` **después** de pasar la app y el conector a las funciones. Mientras tanto, conviven.
3. **Un *trigger* de red de seguridad**, sin lógica de negocio: `AFTER INSERT OR UPDATE` → copia `NEW` en `movimientos_versiones`.
   - **Escribe en otra tabla** → no hay recursión.
   - **No modifica la fila en curso** → no hay ambigüedad.
   - `BEFORE UPDATE` solo comprueba que `version = OLD.version + 1` y que `fecha` y `created_at` de las versiones pasadas no cambian.
4. **`BEFORE DELETE` en `movimientos`, `atestaciones` y `movimientos_versiones`:** error, salvo en la supresión RGPD (9.4).
5. **Concurrencia (H7):** `version_esperada`. Si no coincide, da error `CONFLICTO_VERSION` y la app recarga. Para escrituras sin conexión (futuro): versiones concurrentes que se conservan todas, con una regla determinista (reloj lógico + id).
6. **Anular ≠ borrar:** `estado = 'anulado'` + versión + motivo. Desaparece de los cálculos (H3) y se puede restaurar (H2).

**Por qué las funciones y no solo el *trigger*:**
- con permisos elevados (la service key o el editor SQL) **RLS no se aplica**, pero las funciones y los *triggers* siguen siendo el único camino que las propias herramientas usan;
- y se puede **auditar quién llamó a qué**.

El riesgo que queda (el dueño de la base de datos puede desactivar un *trigger*) lo cubren las copias y el registro. Esto no se puede eliminar en Supabase y hay que asumirlo de forma explícita.

### 9.4 Excepción RGPD (enmienda A3)

- **Texto propuesto para H1:** «Nada se borra ni se sobrescribe, **salvo la supresión completa de la cuenta a petición de su titular** (RGPD, art. 17), que elimina todos sus hechos, versiones y observaciones de forma irreversible y queda registrada sin datos personales.»
- **Mecanismo:** `borrar_mi_cuenta()` lo ejecuta un **rol dedicado** (por ejemplo, `palanca_supresion`, dueño de la función). Los *triggers* de `BEFORE DELETE` comprueban `current_user = 'palanca_supresion'`. Es más fuerte que una variable de sesión: ningún usuario puede hacerse pasar por ese rol. **Hay que verificar en Supabase** que se puede crear y usar ese rol [S] (D28). Plan B: una variable de sesión puesta solo dentro de la función, más `revoke` de `set_config`… que es más débil y por eso no lo recomiendo.
- **Comprobado:** la función actual recorre **todas** las tablas con `usuario_id` [C]. Sin esta excepción, la supresión **fallaría** en cuanto existan las tablas protegidas. **Hay que probarlo antes de proteger nada.**
- **Copias de seguridad:** un usuario borrado sigue en las copias hasta que caducan. Hay que decirlo en la política de privacidad, con el plazo de retención.

### 9.5 Ejercicios cerrados

- **`cierres`:** (usuario, ejercicio, fecha_cierre, informe fiscal congelado en jsonb, hash, version_motor).
- **Un cambio con fecha dentro de un ejercicio cerrado:**
  - el patrimonio **sí** se corrige (T3);
  - la foto fiscal **no** cambia;
  - se ve el aviso «este cambio altera tu resultado de 2025 ya declarado: −42,10 €. ¿Seguir? Puede requerir una complementaria».
- **Cumple §10** («capa de consecuencias»): los informes exportados se basan en vistas consolidadas.

### 9.6 Importes y precisión (punto 10.4 del encargo)

| Dato | Representación canónica | En JavaScript |
|---|---|---|
| Importe | **`importe_minor bigint not null`** en la **unidad mínima de la moneda** de la cuenta (céntimos para EUR; 0 decimales para JPY; 3 para KWD). Se generaliza P1 (enmienda A5) | Número entero (seguro hasta 9·10¹⁵) o BigInt si se pasa de `Number.MAX_SAFE_INTEGER` |
| Unidades | `numeric(38,18)` (cubre 18 decimales de cripto) | Se leen como **texto** (`unidades::text`) → entero escalado BigInt ×10¹⁸. **Nunca** `Number` |
| Precio, tipo de cambio | `numeric` sin límite, solo informativo; **nunca** es la base de un importe guardado | Texto → decimal exacto |
| Moneda | `char(3)` ISO 4217 en la cuenta. El hecho hereda la de su cuenta; los importes originales en otra moneda, aparte (`importe_original_minor`, `moneda_original`, `tipo_cambio`) | — |

**Migración de `importe` numeric a `importe_minor` sin romper la app** (corrige el error de la v2):
1. Volcar el esquema real y comprobar que `importe_centimos = round(importe × 100)` en el **100 %** de las filas. Si alguna no cumple, se para.
2. Mientras la app siga escribiendo `importe`, un *trigger* `BEFORE INSERT/UPDATE` calcula `importe_centimos` desde `importe`, o comprueba que los dos coinciden.
3. Pasar la app, el conector y las funciones a escribir **solo** céntimos.
4. Quitar el *trigger* y convertir `importe` en columna **generada** (`importe_centimos / 100.0`) para quien todavía la lea.
5. Más adelante, eliminar `importe`.

---

## 10. Detección de duplicados e identidad

### 10.1 Identidad

- **Hecho:** `id` uuid interno, permanente. **Nunca** se deduce del contenido.
- **Observación:** (conexión, `id_externo`) si existe; si no, (conexión, huella, ordinal). Esto es una identidad **de la fuente**, no del hecho.
- **Vínculo:** `observaciones.hecho_id` + `relacion` (`origen`, `confirma`, `actualiza`, `duplicada`, `descartada`) + quién lo decidió y cuándo. **Un hecho puede tener N observaciones, y una observación se vincula a un solo hecho como máximo.**

### 10.2 Encontrar candidatos

1. **Exacto:** mismo (conexión, id externo) → la misma observación; si el contenido cambió, «actualiza».
2. **Referencia bancaria** (referencia SEPA, número de autorización) igual entre fuentes → candidato fuerte.
3. **Bloque:** misma cuenta (o sin cuenta + mismo proveedor), mismo signo, **mismo importe** (o ±X % si es pago con tarjeta en otra moneda o con propina), **fecha ±N días** según la fuente: tarjeta pendiente → liquidada, 1–5 días; transferencia, 0–2; manual, ±3.
4. **Puntuación:** importe exacto · distancia en días · mismo comercio (`claveComercio`, `comercios_alias`) · similitud del concepto · los dos son únicos en su ventana · no está ya vinculado.

| Puntuación | Qué hace |
|---|---|
| Id externo exacto, o pendiente → liquidado del mismo proveedor | Vincula solo (no crea ningún hecho nuevo) |
| Alta y **un solo** candidato | Propone «es el mismo» con un toque, o lo vincula solo **si el usuario activó esa política** para esa conexión |
| Media, o varios candidatos | Propone y elige el usuario |
| Baja | Hecho nuevo propuesto |

**Ejemplo del encargo** (Fulcro, después el banco y después el Excel):
- Fulcro registra 12,00 € «café» el 03/11: hecho H, `manual`.
- El banco trae 12,00 € «CAFETERIA SOL» el 04/11: puntuación alta y un solo candidato → «¿Es el café del 03/11?» → se vincula. El banco tiene autoridad sobre la fecha liquidada, así que **se propone** cambiar la fecha a 04/11. La categoría la sigue poniendo el usuario.
- El Excel trae «café 12» el 03/11 → se vincula a H.
- **Resultado:** **un hecho, tres evidencias.**

### 10.3 Casos que hay que distinguir

| Caso | Cómo se reconoce | Tratamiento |
|---|---|---|
| **Cargo pendiente de tarjeta** | `estado_fuente = pendiente` | **Se queda como observación, no como hecho.** Se ve en la cuenta como «pendiente: −12,00 €» y, si el usuario quiere, en el «disponible» (D22). No entra en patrimonio ni en gasto |
| **Cargo definitivo** | `liquidado`; el mismo id de autorización o el emparejamiento con el pendiente | Crea **un** hecho, o se vincula al manual. El pendiente se vincula como `duplicada` del definitivo |
| **Pendiente que desaparece** (autorización caducada) | Falta en la siguiente sincronización | Observación `revertido`; como no había hecho, nada que anular |
| **Devolución** | Ingreso del mismo comercio, por un importe ≤ el original, días o semanas después | Hecho **nuevo** `devolucion` (contra-gasto de la categoría del original). Puede ser parcial. El original se queda |
| **Reversión** (anulación del banco antes o justo después de liquidar) | Mismo importe con el signo contrario, referencia igual o 0–2 días, o el proveedor la marca como reversión | El original se **anula** (versión, motivo «revertido por el banco»). No es una devolución, porque nunca fue un gasto real |
| **Duplicado** | Dos observaciones del mismo hecho | Vínculo `duplicada`; **0 hechos nuevos** |
| **Corregido** | El mismo id externo cambia el importe o el concepto | Propuesta «actualizar» → **versión nueva** del hecho, si el usuario o la política lo aceptan |
| **Dos cafés iguales el mismo día** | Dos observaciones idénticas en la **misma** fuente y lote | Dos hechos (regla del ordinal). Entre fuentes distintas: el máximo por fuente, no la suma (regla de `fusionarCapturas`) |
| **Los dos lados de una transferencia** | Salida en el banco + entrada en el bróker, mismo importe, 0–2 días | **Un** hecho `transferencia` con dos evidencias, no un gasto y un ingreso |

**Alternativa rechazada para los pendientes:** guardarlos como hechos con `estado_liquidacion`. Es más complejo, ensucia el libro con hechos que a menudo desaparecen y obliga a excluirlos en todas las sumas. Lo que se gana (verlos en el historial) se consigue igual enseñando las observaciones.

---

## 11. Gestión de discrepancias

### 11.1 Qué es una discrepancia

| Tipo | Se detecta | ¿Se guarda? |
|---|---|---|
| **Residuo** (atestado ≠ anclado previsto) | Motor, en cada tramo | **No**: es derivado (N5). Solo se guarda la **decisión** que tome el usuario |
| **Atestaciones contradictorias** (dos saldos distintos de la misma cuenta, cercanos en el tiempo) | Conciliador | La decisión |
| **Observación contra hecho confirmado** (la fuente dice otro importe) | Conciliador | Propuesta + decisión |
| **Posición** (el bróker dice 7 unidades y los lotes dan 8) | Motor | La decisión |

### 11.2 El ejemplo de los 10 € y los 40 €

1. A las 10:00 llega un extracto: saldo **contable** de 10 € a fecha 21/11 → atestación A₁, confianza alta.
2. A las 10:05 el usuario escribe «mi saldo es 40 €» → atestación A₂, `manual`.
3. **Palanca no rechaza A₂ ni la sustituye en silencio.** Guarda las dos y muestra:

   > ⚠ «El extracto de hace 5 minutos decía **10 €**. Tú dices **40 €**.
   > ¿Qué ha pasado?
   > · Ha entrado dinero después del extracto → añadir el movimiento (+30 €)
   > · El extracto no estaba al día o incluía algo pendiente → me quedo con 40 €
   > · Me he equivocado → me quedo con 10 €
   > · Lo miro luego»

4. **La decisión se guarda** (`decisiones`: tipo, objetos, elección, motivo, autor y fecha):
   - si eliges «40 €», A₁ se marca como **superada por decisión** (versión con motivo) y el residuo se calcula con A₂;
   - si eliges «ha entrado dinero», se abre el formulario con 30 € y la fecha;
   - mientras no decidas, el saldo de la cuenta se ve como **«en revisión»** y el patrimonio **no se llama «verificado»**.

### 11.3 Qué se compara

- **Lo mismo con lo mismo:** contable con contable y disponible con disponible. Una captura de la app del banco suele enseñar el **disponible**, que incluye los pendientes; un extracto suele dar el **contable**. Compararlos sin decirlo produce falsas alarmas.
- **Antigüedad:** pesa la fecha **a la que se refiere** el saldo, no cuándo se recibió. Una captura sin fecha visible tiene confianza baja.
- **Pendientes:** si la diferencia es igual a la suma de los pendientes conocidos, se explica sola: «la diferencia son 2 cargos pendientes».
- **Movimientos sin sincronizar:** si la conexión tiene huecos (no se sincroniza desde hace X días), la discrepancia se etiqueta «probablemente faltan movimientos de 12/11–20/11».
- **Umbral de ruido:** las diferencias menores de 1 € o del 0,1 % se enseñan, pero sin alarma (configurable).

### 11.4 Cuánto se enseña

- **Inicio:** como mucho **una** línea, «1 diferencia por revisar».
- **El detalle** solo aparece en la cuenta afectada.
- **Nunca** hay un aviso por cada observación. Las discrepancias se **agrupan** por cuenta y periodo.

---

## 12. Experiencia del usuario

| Principio | Cómo se aplica |
|---|---|
| El patrimonio se entiende de un vistazo | Una cifra grande y una línea de estado («anclado · 3 de 4 cuentas · hasta el 18/11»). A mercado y diferencias, solo cuando existen |
| Cuentas agrupadas | Seis grupos plegados (sección 5.5). El detalle, al tocar |
| Qué está confirmado | Un solo icono por cuenta (✓ · ⚠ ⏳), con su leyenda al tocarlo |
| Discrepancias comprensibles | Una pregunta con opciones (11.2), no un código de error |
| Sin cifras falsas | «No calculable» y «valorado a coste» en vez de 0 o de una estimación oculta |
| Actualizar es fácil | Un botón «Actualizar saldos» con tres caminos: foto, escribirlo o sincronizar |
| Corregir el pasado | Editar cualquier fecha + vista previa del impacto cuando importa (9.1) |
| ¿De dónde sale esta cifra? | Al tocar una cifra: la fórmula en palabras + los hechos y atestaciones que la forman + sus fuentes («3 del banco, 1 de Fulcro») |
| Funciona sin Fulcro ni Claude | Todo lo anterior existe en la app. Los asistentes solo son **otro canal** para las mismas funciones |
| Tres formularios | «Gasto o ingreso» · «Mover dinero entre mis cuentas» · «Comprar o vender». No se puede guardar una compra sin activo |

---

## 13. Seguridad y permisos

### 13.1 Integridad entre usuarios (punto 10.2 del encargo)

- `unique (usuario_id, id)` en todas las tablas a las que se apunta: `categorias`, `fuentes`, `cuentas`, `activos`, `conexiones`, `lotes`, `recurrentes`, `movimientos` y `atestaciones`.
- **Claves foráneas compuestas** desde todas las referencias: `(usuario_id, cuenta_id) → cuentas(usuario_id, id)`, y lo mismo con cuenta destino, activo, categoría, fuente, conexión, lote, recurrente y hecho en las observaciones. **Las claves foráneas no pasan por RLS**, así que sin esto un usuario podría enlazar el id de otro.
- **Antes de crearlas:** una auditoría de solo lectura en producción que dé **0 referencias cruzadas**.
- `on delete restrict` en todas: con los hechos no se borra nada, y el RGPD usa su propio rol.

### 13.2 Funciones (RPC)

| Regla | Detalle |
|---|---|
| Por defecto, `SECURITY INVOKER` | RLS se sigue aplicando dentro |
| `SECURITY DEFINER` solo cuando haga falta | Hoy: `soy_admin`, métricas, funnel, `fulcro_*`, `registrar_evento`, `borrar_mi_cuenta` [C]. Todas con `set search_path = public`, comprobación explícita de `auth.uid()` y `revoke … from public, anon` |
| Revisar las que puede llamar `anon` | Ya estaba en la auditoría de seguridad. Hay que repetirla en cada fase |
| Las funciones validan la propiedad | Aunque las claves foráneas compuestas ya lo aseguran: es defensa en profundidad y da mensajes claros |
| Ninguna función recibe `usuario_id` como parámetro | Siempre `auth.uid()` |

### 13.3 Restricciones por tipo, sin huecos de NULL (punto 10.3 del encargo)

**El problema:** en PostgreSQL, un `CHECK` que da NULL **se considera cumplido**. Por ejemplo, `check (unidades > 0)` deja pasar `unidades = null`.

**La solución:**
- requisitos escritos con `IS NOT NULL` y `IS NULL` explícitos, y `num_nonnulls()` para los grupos;
- y, cuando acabe la migración, **`tipo_evento NOT NULL`**. Mientras haya filas de la Fase 1 sin tipo, se valida con `CHECK (tipo_evento IS NOT NULL OR created_at < 'fecha_de_corte')`. Así ninguna fila nueva escapa.

| tipo_evento | Obligatorio (NOT NULL) | Prohibido (NULL o 0) | Otras reglas |
|---|---|---|---|
| ingreso, gasto, devolucion, correccion_ingreso | cuenta, importe > 0, categoría | cuenta destino, activo, unidades, bruto, comisión | cuenta de clase activo (o tarjeta de crédito si es gasto) |
| transferencia | cuenta, cuenta destino, importe > 0 | activo, unidades, categoría | cuenta ≠ cuenta destino; misma moneda (si no, es un cambio de divisa: P5) |
| compra | cuenta (broker o cripto), activo, importe > 0, bruto ≥ 0, comisión ≥ 0, impuesto ≥ 0, **unidades > 0** | cuenta destino | importe = bruto + comisión + impuesto |
| venta | cuenta, activo, importe ≥ 0, bruto, comisión | cuenta destino | importe = bruto − comisión; `unidades > 0` **o** `cierra_posicion = true` (exactamente una de las dos) |
| dividendo, interes | cuenta, importe > 0, bruto, retenciones ≥ 0 | cuenta destino, unidades | importe = bruto − retenciones. Activo obligatorio en dividendo y opcional en interés |
| comision | cuenta, importe > 0 | activo con unidades, bruto, comisión | — |
| traslado_posicion | cuenta, cuenta destino, activo, unidades > 0 | importe (= 0) | las dos cuentas, broker o cripto |
| saldo_inicial | cuenta, importe ≠ 0 | categoría | como máximo uno vigente por cuenta (índice único parcial) |
| disposicion_prestamo, amortizacion | cuenta, cuenta destino (una de las dos es pasivo), importe > 0 | activo | — |
| interes_deuda | cuenta, importe > 0 | — | — |

- Lo que mira **otra tabla** (la clase de una cuenta) no cabe en un `CHECK`. Lo comprueba la función de escritura, más un *trigger* de validación que **solo lee y lanza el error**, sin modificar nada.

### 13.4 Datos, credenciales y asistentes

- **Contraseñas del banco:** **nunca**. Con Open Banking, el agregador guarda el consentimiento y Palanca solo guarda su **identificador y su caducidad**.
- **Tokens de terceros** (Google, agregador, exchanges): cifrados en el servidor (Supabase Vault [S]), **nunca** en el navegador ni en el repositorio, y revocables con un botón (`conexiones.estado = revocada` + borrar el token).
- **Google:** solo lectura para tu hoja, `drive.file` para el archivo de Palanca.
- **Claves de cripto:** solo de lectura. Si llega una clave con permisos de operar, se rechaza.
- **Claude y Fulcro:** voluntarios. OAuth revocable (ya existe). Ámbitos por herramienta (lectura o escritura). **Sin herramientas de borrado** (D6). Escritura siempre con vista previa y confirmación.
- **Capturas:** por defecto **no se guardan**. Se guardan su hash y lo extraído. Guardarlas sería opcional y con caducidad (D19).
- **Registros sin importes ni conceptos** (como ya hace `palanca_funnel`).
- **Entornos:** las vistas previas usan «palanca dev» (S2). Migraciones en `supabase/migrations/` con vuelta atrás, primero en dev.

---

## 14. Integraciones futuras (Open Banking, brókers, cripto)

| Aspecto | Realidad | Consecuencia en el diseño |
|---|---|---|
| Base legal | PSD2: leer cuentas es un servicio AISP. Agregador con licencia al principio; licencia propia más tarde (`docs/VISION_BANCO.md`) [C] | `conexiones.proveedor = 'agregador:<nombre>'`. El agregador se puede cambiar sin tocar el motor |
| Consentimiento | Caduca; según la normativa europea actual, renovación cada 180 días [S, hay que verificarlo con el agregador elegido] | `conexiones.caduca_en` + aviso 14 días antes + estado `requiere_renovar` |
| Historial | De 90 días a 24 meses, según el banco [S] | La primera sincronización trae lo que puede; lo anterior se queda en Excel o extracto. El conciliador vincula los solapes |
| Granularidad | Algunos bancos no dan pendientes, ni referencia estable, ni saldo contable | El adaptador declara su capacidad (7.1); el conciliador ajusta las ventanas |
| **Brókers** | **Las cuentas de valores no son cuentas de pago: PSD2 no las cubre.** El efectivo de algunos brókers sí sale por PSD2; las posiciones no [S] | Informes del bróker (CSV o PDF), APIs propias donde existan (Interactive Brokers sí [S]; Trade Republic no tiene API pública [S]) o capturas |
| Cripto | APIs de cada exchange; carteras en cadena por dirección pública | Adaptadores aparte; solo lectura |
| Costes | De cero a unos cientos de €/mes con un agregador [S, `VISION_BANCO.md`] | Solo cuando haya usuarios de pago (D24) |
| Dependencias | Contrato con el agregador, RGPD (EIPD, registro de tratamientos), política de privacidad, seguridad demostrable | Fase 10; no antes de que el núcleo esté estable |
| Desconexión y errores | Tokens revocados, bancos caídos, cambios de formato | Estado `error` con reintento progresivo; nunca se anulan hechos porque falte la fuente |
| Revocar | El usuario se desconecta | Se borran los tokens; las observaciones y los hechos se quedan (son suyos), salvo que pida borrarlo todo |

**Riesgo principal:** depender de un agregador y de su precio. La arquitectura lo limita porque el agregador es **un adaptador más**.

---

## 15. Modelo de datos propuesto

Reglas comunes a todas las tablas:
- `usuario_id text not null` y RLS `usuario_id = auth.uid()::text`;
- `unique (usuario_id, id)`;
- claves foráneas compuestas.

| Tabla | Estado | Campos clave | Para qué |
|---|---|---|---|
| `movimientos` (hechos) | **existe**, se amplía | + `tipo_evento`, `estado` (vigente/anulado), `version`, `cuenta_id`, `cuenta_destino_id`, `activo_id`, `unidades`, `bruto_minor`, `comision_minor`, `impuesto_op_minor`, `retencion_origen_minor`, `retencion_destino_minor`, `cierra_posicion`, `procedencia`, `canal`, `lote_id`, `periodo_contable`, `fecha_estimada`, `recurrente_id` + `periodo_recurrente` (índice único: arregla la doble confirmación de un fijo), `importe_original_minor`, `moneda_original`, `tipo_cambio` | El libro |
| `movimientos_versiones` | nueva | movimiento_id, version, fila jsonb, operacion (alta, edicion, anulacion, restauracion), autor, canal, lote_id, motivo, registrado_en | H1, H5 |
| `cuentas` | nueva | nombre, clase, naturaleza, moneda, proveedor, `fuente_id` (etiqueta, opcional), archivada, orden | Bolsas |
| `activos` | nueva | nombre, isin, ticker, clase, moneda, grupo_homogeneo | FIFO |
| `atestaciones` | nueva | cuenta_id, activo_id (null = saldo de efectivo; con activo = valoración), fecha_saldo, tipo_saldo, importe_minor, unidades, incluye_pendientes, procedencia, canal, confianza, estado, version | Saldos reales y valoraciones |
| `atestaciones_versiones` | nueva | Como `movimientos_versiones` | H6 |
| `conexiones` | nueva | tipo (excel, sheets, extracto, captura, fulcro, claude, agregador, broker, cripto), proveedor, cuentas que cubre, estado, cursor, caduca_en, capacidades jsonb, ref_credencial (al almacén de secretos, nunca el secreto) | De dónde vienen los datos |
| `lotes` | nueva (sustituye la lista de deshacer de localStorage) | id = idempotencia, conexion_id, hash_contenido, estado, inicio, fin, cursor_desde, cursor_hasta, contadores, errores jsonb | Importaciones y sincronizaciones |
| `observaciones` | nueva | lote_id, conexion_id, clase, id_externo, huella, ordinal, recibido_en, fecha_efectiva, payload jsonb normalizado, hash_payload, estado_fuente, estado_validacion, confianza, motivo_confianza, **hecho_id**, **atestacion_id**, relacion, version_base, decidido_por, decidido_en | Evidencias |
| `decisiones` | nueva (incluye `conciliacion_exclusiones` de la v2) | tipo (exclusion, discrepancia, fusion, conflicto), referencias, eleccion, motivo, autor, fecha, estado | Lo que decidió el usuario |
| `cierres` | nueva, P5 | ejercicio, fecha_cierre, informe jsonb, hash, version_motor | Fiscal congelado |
| `instantaneas` | **solo si hace falta** | (usuario, fecha_hasta, version_motor, hash_hechos) → estado jsonb | Caché |
| `fuentes` | existe; **sin cambios** de significado | Etiqueta de pagador o comercio | — |

**Índices:**
- `movimientos (usuario_id, fecha)`;
- `(usuario_id, activo_id, fecha) where activo_id is not null`;
- `observaciones (usuario_id, conexion_id, id_externo) unique where id_externo is not null`;
- `observaciones (usuario_id, conexion_id, huella, ordinal) unique`;
- `observaciones (usuario_id, hecho_id)`;
- `atestaciones (usuario_id, cuenta_id, fecha_saldo)`.

**Lo que no se crea:**
- tablas de lotes FIFO o de posiciones: se calculan;
- de transferencias: son un `tipo_evento`;
- de cotizaciones: hasta que haya precios automáticos;
- un `hecho_id` aparte: el `id` de `movimientos` **es** el linaje.

**Volumen [S]:** `observaciones` es la tabla que más crece: cada sincronización del banco trae movimientos ya vistos. Para que no crezca sin control, una observación **idéntica** (mismo id externo y mismo hash) **no se vuelve a guardar**: solo se anota «vista de nuevo el X» en el lote.

---

## 16. Funciones y procesos atómicos

| Función | Hace | Transacción | Idempotente por |
|---|---|---|---|
| `registrar_hecho(datos)` | Valida por tipo (13.3) e inserta la versión 1 | sí | `id` lo da quien llama (los reintentos no duplican) |
| `editar_hecho(id, version_esperada, cambios, motivo)` | Versión nueva | sí | `version_esperada` |
| `anular_hecho(id, version_esperada, motivo)` | `estado = anulado` + versión | sí | ídem |
| `restaurar_version(id, version)` | Copia aquella versión como una nueva | sí | ídem |
| `registrar_atestacion(datos)` | Inserta y detecta contradicciones cercanas (11.2) | sí | `id` |
| `registrar_lote(id, hash, observaciones)` | Bloqueo + idempotencia + conciliador → propuestas | sí | `id` + `hash` |
| `confirmar_propuestas(lote_id, decisiones, huella)` | Aplica por unidades lógicas | sí | lote + huella |
| `vincular(observacion_id, hecho_id, relacion)` | Vínculo manual | sí | (observación) |
| `resolver(decision)` | Guarda la decisión y aplica su efecto (versión de una atestación o hecho nuevo) | sí | `id` |
| `previsualizar(cambio)` | Motor con y sin el cambio → diferencias. **Solo lectura** | — | — |
| `archivar_cuenta` / `restaurar_cuenta` | Solo cambia la marca | sí | — |
| `cerrar_ejercicio(año)` | Congela el informe fiscal | sí | (usuario, año) |
| `migrar_usuario(uid, fase)` | Paso de migración (sección 18) con foto antes y después | sí, por usuario | (uid, fase) |
| `borrar_mi_cuenta()` | Supresión RGPD (9.4) | sí | — |

**Dónde vive el motor:** en JavaScript (cliente y servidor con el mismo paquete), como hoy. Las funciones SQL validan y escriben, pero **no recalculan el patrimonio**. Así no hay dos implementaciones del motor.

**Excepción:** `previsualizar` y el conciliador del servidor llaman al paquete `api/_motor.js` desde `/api/ingesta`.

---

## 17. Invariantes financieros

Se mantienen las 20 de la v2. Se renombran y se añaden:

| # | Invariante | Cómo se prueba |
|---|---|---|
| I1 | Una transferencia (o amortización o disposición) nunca cambia el patrimonio a coste | fuzz |
| I2 | Σ saldos de las cuentas = liquidez + pasivos (con signo) | fuzz |
| I3 | Compras con comisiones e impuestos = coste vivo + coste vendido, al céntimo | fuzz y caso del encargo |
| I4 | Realizado = Σ (R − K), solo de los lotes con coste conocido | unitaria |
| I5 | Cada comisión aparece una sola vez | restricción + conciliador |
| I6 | Una previsión o una observación pendiente nunca genera apuntes | fuzz |
| I7 | Una observación se vincula a un hecho como máximo | restricción |
| I8 | Volver a importar el mismo lote = 0 hechos nuevos; misma clave con otro contenido = error | integración |
| I9 | Una exportación nunca vuelve como hecho nuevo (eco) | integración |
| I10 | Un hecho confirmado solo cambia con una versión que lleva autor o política | BD |
| I11 | Un DELETE de hechos o versiones da error, salvo con el rol RGPD | BD |
| I12 | Ninguna clave foránea apunta a otro usuario | BD + auditoría |
| I13 | No se suman importes de monedas distintas sin pasar por la capa de valor | unitaria |
| I14 | «Verificado» solo con todas las cuentas atestadas el mismo día | unitaria |
| I15 | El residuo nunca entra en ninguna suma (N5) | fuzz |
| I16 | Mismos hechos + misma `VERSION_MOTOR` = el mismo resultado byte a byte | determinismo |
| I17 | `deducirTipo` + motor nuevo = `bolsas()` de hoy para cualquier lista de la Fase 1 | fuzz |
| I18 | Ningún pasivo aparece como liquidez, y ninguna cuenta corriente negativa aparece como pasivo | unitaria |
| I19 | Con coste desconocido, el realizado es «no calculable», nunca 0 ni el cobro entero | unitaria |
| I20 | Cambiar un ejercicio cerrado no cambia su foto fiscal y avisa | integración |

---

## 18. Casos de prueba (escenarios)

| # | Escenario | Fuentes | Resultado esperado |
|---|---|---|---|
| E1 | **Solo manual**: nómina, gastos, un fijo confirmado dos veces | app | Un solo movimiento del fijo (índice único); flujos iguales a los de hoy |
| E2 | **Solo Excel**: importar dos veces la misma hoja | Excel | La segunda vez: 0 nuevos, 0 cambios |
| E3 | **Fulcro + banco + Excel**, el mismo café | 3 | **1 hecho, 3 observaciones**; la fecha se propone con la del banco |
| E4 | **Pendiente → liquidado** con 2 días de diferencia y el importe cambiado (propina) | banco | 1 hecho con el importe liquidado; el pendiente vinculado como `duplicada` |
| E5 | **Pendiente que desaparece** | banco | 0 hechos |
| E6 | **Devolución parcial** a las 3 semanas | banco | Original + devolución; gasto neto = la diferencia |
| E7 | **Reversión** el mismo día | banco | Original anulado con su motivo; gasto 0 |
| E8 | **Transferencia vista por las dos fuentes** (banco y bróker) | 2 | 1 `transferencia`; patrimonio sin cambios |
| E9 | **El ejemplo del encargo** (sección 5.3) | manual | Las cifras de la tabla, al céntimo |
| E10 | **Venta con pérdida** | manual | Realizado −300; patrimonio −300 |
| E11 | **Venta de un lote con coste desconocido** | extracto | Realizado «no calculable»; sin ganancia inventada |
| E12 | **Venta parcial sin unidades** | Excel | K «pendiente»; aparece una tarea |
| E13 | **Comisión en una línea aparte** | informe del bróker | Fundida en la venta; I5 |
| E14 | **Dividendo con retención** | bróker | Ingreso = neto; bruto y retención guardados |
| E15 | **Cuenta en USD** | manual | Saldos en USD; total en EUR solo con valoración (I13) |
| E16 | **Hipoteca**: disposición, 12 cuotas y la vivienda fuera de alcance | manual | Patrimonio neto negativo y explicado (D23); intereses = gasto financiero |
| E17 | **Tarjeta de crédito**: 10 compras + el recibo | banco | 10 gastos; el recibo es una transferencia (no un gasto) |
| E18 | **10 € del extracto frente a 40 € manual** | 2 | Las dos atestaciones guardadas; pregunta; la decisión se guarda; nada se sobrescribe |
| E19 | **Saldo disponible en una captura frente a contable en el extracto** | 2 | Se explica con los pendientes; sin alarma |
| E20 | **Gasto atrasado en un mes cerrado** | app | El patrimonio de ese mes cambia; vista previa; si es de un ejercicio cerrado, aviso fiscal |
| E21 | **Dos importaciones a la vez** del mismo archivo | 2 pestañas | Una espera; resultado = una sola importación |
| E22 | **La misma clave de lote con otro contenido** | conector | Error `LOTE_CONFLICTO`; 0 cambios |
| E23 | **Excel**: se modifica la fila en la hoja **y** el hecho en la app | Sheets | Conflicto en la cola; ningún lado se pisa |
| E24 | **Excel**: se borra una fila | Sheets | Propuesta «¿anular?»; nunca se anula sola si fue confirmado |
| E25 | **El eco**: exportar → leer la hoja de Palanca | Sheets | 0 nuevos |
| E26 | **Supresión RGPD** con las tablas protegidas | — | Todo borrado; el DELETE normal sigue prohibido |
| E27 | **Usuario B intenta usar el `cuenta_id` de A** | API | Error de clave foránea compuesta |
| E28 | **Usuario con datos incompletos**: 6 meses de gastos y sin saldos | manual | Patrimonio a coste «no verificado»; rentabilidad no calculada; sin cifras falsas |
| E29 | **Conexión pausada y reanudada** | API | Sigue desde el cursor; 0 duplicados |
| E30 | **Migración de un usuario de la Fase 1** | — | Foto idéntica al céntimo (salvo lo que cambia a propósito en la fase) |

**Datos de prueba:**
- `clientesSimulados.js` (ya existe), ampliado con bancos, brókers y monedas;
- tus datos reales, **solo en local** y fuera del repositorio, como regresión (las cifras de la revisión crítica v2).

---

## 19. Plan de migración por fases

Cada fase:
- se hace **por usuario y en una transacción**;
- tiene **vista previa** y **foto de números** antes y después;
- solo se activa con un **interruptor por usuario** si la foto cuadra;
- se aplica primero en **dev**;
- se puede revertir.

| Fase | Qué | Cambia a propósito | Se mantiene igual | Cómo se revierte |
|---|---|---|---|---|
| **0. Preparación** | ✅ copia (21/11) · **prueba de restaurar** · volcado del **esquema real** comparado con el repositorio · Preview → dev (S2) · CI antes de desplegar · D6 · foto de números · probar `borrar_mi_cuenta` en dev | nada | todo | — |
| **1. Protección** | `estado`, `version`, `movimientos_versiones`, *trigger* de red de seguridad, `editar_hecho`, `anular_hecho` y `restaurar_version`; la app y el conector pasan a usarlas; después se retiran los permisos directos; rol RGPD | nada | foto idéntica | Devolver los permisos; los *triggers* se pueden quitar; las columnas son inocuas |
| **2. Coherencia** | Auditoría de importes → *trigger* puente → claves foráneas compuestas → `restrict` → `tipo_evento` (vacío) + `deducirTipo` | nada | foto idéntica | Quitar las restricciones |
| **3. Inversiones** | `activos`, columnas de operación, FIFO, coste desconocido, comisiones y retenciones | invertido y patrimonio (corrección FIFO); realizado visible | flujos, nº de hechos | Interruptor → la regla del tope; las versiones deshacen el relleno |
| **4. Cuentas y pasivos** | `cuentas`, Cuenta principal, efectivo del bróker, `tipo_evento` relleno; tres formularios; pasivos (tarjeta de crédito y préstamos) | el **reparto** entre cuentas | totales | Interruptor + versiones |
| **5. Saldos reales** | `atestaciones`, residuo, `decisiones`; ajustes-tapón → atestaciones; `saldo_inicial` | patrimonio mostrado **según D1**; aparece el residuo | flujos | Restaurar las versiones de los ajustes |
| **6. Ingesta común** | `conexiones`, `lotes`, `observaciones`; CSV, plantilla, capturas y conector pasan al contrato; conciliador v1; `/api/ingesta` | nada en las cifras; las importaciones dejan rastro | foto idéntica | Volver a la ruta antigua (interruptor) |
| **7. Excel y Sheets** | Entrada en solo lectura con huellas y exclusiones; salida al archivo de Palanca; después, los cambios en los dos sentidos | — | — | Pausar la conexión |
| **8. Valor de mercado** | Valoraciones desde capturas o precios; no realizado; patrimonio a mercado; multidivisa (F2b, enmienda A6) | aparecen las cifras a mercado | el patrimonio a coste | Ocultar la capa |
| **9. Fiscal** | Informe por ejercicio, `cierres`, validado por un asesor | — | — | No publicar |
| **10. Open Banking y brókers** | Un agregador, un piloto con pocos usuarios | — | — | Revocar conexiones |

### Dependencias

```
0 ─► 1 ─► 2 ─► 3 ─► 4 ─► 5 ─► 6 ─► 7
                    │         │    └──► 10
                    └──► 8 ◄──┘
                 3 ─► 9 (y 9 necesita 5 para cerrar ejercicios con saldos fiables)
```

- **1 antes que todo lo que modifica filas:** cualquier relleno tiene que poder deshacerse con su historial.
- **2 antes que 3 y 4:** las claves foráneas compuestas y los céntimos canónicos tienen que existir antes de que haya referencias nuevas.
- **3 antes que 4:** FIFO no necesita cuentas (agrupa por activo), y es el error financiero más grave.
- **4 antes que 5:** un saldo real es de **una** cuenta.
- **5 antes que 6:** las observaciones de saldo producen atestaciones.
- **6 antes que 7 y 10:** las dos son adaptadores del mismo contrato.
- **8 después de 4 y de 6:** las valoraciones llegan como observaciones de posición.

---

## 20. Riesgos y decisiones pendientes

### 20.1 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El esquema de producción es distinto del repositorio | **Alta** (comprobado) | Alto | Fase 0: volcado del esquema y comparación antes de escribir ningún SQL |
| Supresión RGPD rota por la protección | Alta si no se prevé | Alto (legal) | 9.4 + prueba E26 antes de la fase 1 |
| Migración que descuadra a un usuario | Media | Alto | Por usuario + foto + interruptor |
| El conciliador fusiona mal dos gastos distintos | Media | Alto | Solo vincula solo con id externo o con política del usuario; todo se puede deshacer (versión del vínculo) |
| Exceso de avisos | Media | Medio (abandono) | 11.4: una línea en Inicio |
| `observaciones` crece mucho | Media | Medio (coste) | No guardar repetidas; caducidad del payload en bruto [S] |
| Límite de Vercel | Alta | Medio | 7.5 |
| Dependencia y coste del agregador | Media | Medio | Adaptador intercambiable; solo con usuarios de pago |
| Fiscal mal aplicado | Media | Alto | Capa separada + asesor + no es el producto principal |
| Rendimiento del FIFO en memoria con muchos datos | Baja [S] | Medio | Medir; `instantaneas` como caché |

### 20.2 Enmiendas a `MOTOR.md` que hacen falta

| # | Enmienda | Por qué |
|---|---|---|
| A1 | Los apuntes son una **traducción derivada, determinista y versionada** de cada versión de un hecho; no se guardan (D5) | Evitar dos verdades |
| A2 | **Patrimonio anclado** como métrica auxiliar etiquetada con su cobertura; el canónico no cambia (D1) | Enseñar el saldo real sin tapones |
| A3 | **Excepción RGPD** en H1 (9.4) | Ley |
| A4 | **Procedencia ≠ canal**, y la **confianza** de la observación; `sugerido` como procedencia (7.3) | Varias fuentes y F4 |
| A5 | P1 «céntimos» → **unidad mínima de la moneda** de la cuenta; unidades como decimal exacto | Multidivisa y cripto |
| A6 | **Activar F2b** (valor ≠ coste) con cobertura de valoración | Patrimonio a mercado |
| A7 | **Auditoría «tal como se registró»**: se puede reconstruir lo que se mostraba un día X (versiones con `registrado_en` ≤ X). **Solo para auditoría**, no es una cifra del producto. Así no contradice el carácter monotemporal (§10) | «Qué dato provocó el recálculo» |

### 20.3 Decisiones que te tocan

Se mantienen: D1, D4, D6, la excepción RGPD, el umbral de 31 días, las 8 del Excel, D15 y D16. Son nuevas:

| ID | Decisión | Mi recomendación |
|---|---|---|
| D17 | Autoridad por campo por defecto (8.4) | La tabla propuesta, que se puede cambiar por conexión |
| D18 | ¿Se permite vincular solo con puntuación alta? | No por defecto; el usuario lo activa por conexión |
| D19 | ¿Guardar las imágenes de las capturas? | No; solo el hash y lo extraído |
| D20 | Excel en los dos sentidos = un **archivo propio de Palanca** (no escribir en tu hoja original) | Sí |
| D21 | Dividendos e intereses en el ahorro: ¿neto o bruto? | Neto (igual que la nómina); el bruto, para el informe fiscal |
| D22 | ¿Los pendientes restan del «disponible»? | Se ven en la cuenta y no restan por defecto; con una opción |
| D23 | ¿Bienes (vivienda) en el alcance? | No en la v3; aviso cuando haya una hipoteca |
| D24 | ¿Cuándo empieza Open Banking y con qué agregador? | Después de la fase 7 y con usuarios de pago |
| D25 | Moneda base para el total | EUR por defecto, configurable en la fase 8 |
| D26 | Venta de un lote con coste desconocido (6.4) | Pedir el valor de apertura; si no, «capital anterior», marcado |
| D27 | Más funciones: ¿Vercel Pro o Supabase Edge Functions? | Un único punto de entrada mientras quepa |
| D28 | Rol dedicado para la supresión RGPD en Supabase | Verificar que se puede; si no, plan B documentado |

---

## 21. Revisión crítica de mi propia propuesta

**Lo que no está suficientemente justificado todavía:**

1. **Las ventanas de días y los umbrales del conciliador** (±3 días, ±X %) son razonables pero **no salen de datos**. Hay que calibrarlos con extractos reales de varios bancos antes de que nada se vincule solo.
2. **`movimientos` como «estado actual» + tabla de versiones**, frente a un almacén de solo añadir puro. Lo elijo porque la app no cambia, pero tiene un coste: **dos lugares** con datos de la misma fila. Una tabla de versiones como fuente única y `movimientos` como vista sería más pura, pero obliga a reescribir todas las lecturas. Lo dejo abierto, aunque recomiendo seguir con el plan actual.
3. **El rol RGPD dedicado** depende de que Supabase permita crear y usar roles propios como dueños de funciones. No lo he comprobado.
4. **Que todo quepa en memoria** está supuesto, no medido. Con Open Banking (muchos movimientos por usuario y año) hay que medirlo antes de la fase 10.
5. **Los cargos pendientes como observación y no como hecho** simplifican el libro, pero el «disponible real» de un usuario con muchos pendientes **depende de una capa que no es el motor**. Si D22 se decide por «restan», habrá que formalizarlo.
6. **La autoridad por campo** añade complejidad de configuración. Puede que el 95 % de los usuarios nunca la toquen. **Hay que esconderla**, no quitarla.
7. **La fusión a tres bandas en Excel** necesita guardar la versión base por vínculo. Con hojas que alguien edita a mano sin ID, la huella seguirá fallando con los cambios dobles. **No hay solución perfecta sin una columna de ID**, y eso implica escribir en la hoja.
8. **Lo fiscal** sigue siendo conocimiento mío sin validar. La tabla de la v2 **no se puede usar** para declarar nada.
9. **Las cifras de Open Banking** (180 días, 90 días–24 meses, costes) están marcadas [S]: **hay que verificarlas con el proveedor** antes de decidir.
10. **La fase 6 es la más grande y la que más riesgo tiene**: toca todos los importadores. Se puede partir en 6a (contrato + lotes, sin conciliador nuevo) y 6b (conciliador).
11. **Comprobé el código y los `.sql` del repositorio, no producción.** Cualquier detalle de SQL de este documento hay que contrastarlo con el volcado del esquema real (fase 0).

**Lo que sí está sólido:** separar observaciones de hechos, tener un único motor puro, que las escrituras pasen por funciones con versión, las claves foráneas compuestas, FIFO con coste desconocido explícito, que los pasivos sean bolsas con signo, que el pendiente no sea un hecho y que la hoja original nunca se escriba. Todo esto respeta la Constitución y se puede introducir paso a paso sin rehacer el motor.
