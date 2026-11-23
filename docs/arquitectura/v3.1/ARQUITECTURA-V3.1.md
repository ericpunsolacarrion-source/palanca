# Palanca — Arquitectura de referencia v3.1

**Revisión y corrección de la v3** · 21/11/2026 · Estado: **propuesta, no aprobada**
Base: `docs/MOTOR.md` (la Constitución, sin modificar) y `ARQUITECTURA-V3.md` (sin sobrescribir).

> **No he cambiado nada.** No he tocado código, archivos del proyecto, la base de datos, Supabase, Vercel, los permisos ni los conectores. Este documento está fuera del repositorio.
>
> **Etiquetas en todo el documento:**
> - **[C] comprobado en el repositorio**, con su ruta;
> - **[D] decisión ya establecida**: en `MOTOR.md`, en `CLAUDE.md` o aprobada antes;
> - **[X] problema detectado**;
> - **[P] propuesta nueva**;
> - **[V] pendiente de validar**: producción, terceros o legal.
>
> **Lo que no está en esta v3.1 sigue como en la v3.**

---

## 1. Resumen ejecutivo

**Qué cambia respecto a la v3 (doce cambios):**

1. **Patrimonio incompleto** [P].
   - Palanca nunca dice «tu patrimonio» a secas: dice **«patrimonio conocido»**, con su **cobertura**.
   - Solo se dice **«completo y verificado»** si se cumplen dos cosas: todas las cuentas tienen un saldo real el mismo día, **y** el usuario ha declarado de forma expresa que esas son todas sus cuentas. Palanca no puede saber qué cuentas no le has contado.
2. **Observaciones de verdad inmutables** [X → P]. En la v3, `observaciones.hecho_id`, `relacion` y la decisión se podían editar. Ahora:
   - la observación **nunca cambia**;
   - el vínculo con un hecho va en una tabla **de solo añadir** (`vinculos`), con una cadena de sustituciones, sin ningún `UPDATE`;
   - las exclusiones de la conciliación son vínculos de tipo «descartada», no una tabla aparte.
3. **Tarjeta de crédito** [P]. Es una cuenta de pasivo:
   - **la compra es el gasto**, y la deuda crece;
   - **el pago es una transferencia**, y la deuda baja.
   
   Cada tarjeta trabaja en **un solo modo**, «desglosado» o «resumido». La validación impide mezclarlos, que es la causa del gasto duplicado.
4. **Excel** [P]. Tres opciones comparadas. Recomendación:
   - **A por defecto:** tu hoja se lee y nunca se escribe;
   - **B con permiso expreso y solo en Google Sheets:** Palanca escribe únicamente en una pestaña suya dentro de tu archivo.
   
   Un `.xlsx` local no puede sincronizarse en los dos sentidos: solo importar y exportar.
5. **Coste desconocido** [X → P]. La v3 contradecía su propia regla: llegaba a hablar de un «coste estimado de 0». Ahora:
   - un lote de coste desconocido **no tiene importe**;
   - al venderlo, lo cobrado entra como **«capital anterior a tus datos»**, que no es ganancia ni ingreso;
   - el realizado es **«no calculable»**.
6. **Saldos** [P].
   - El patrimonio usa **solo el saldo contable**.
   - El disponible es otra cifra: **solo explica**. Se calcula como «contable − pendientes».
   - Los pendientes **siguen sin ser hechos**.
   - Así nunca se suman 1.000 € + 850 € ni se restan dos veces los 150 €.
7. **Multidivisa y cripto aplazadas** [P].
   - Fase 1: **solo EUR**, con `cuentas.moneda` fijada a EUR.
   - Se elimina el cambio de nombre `importe_minor` de la v3: **se mantiene `importe_centimos`**, que ya existe en producción [C].
8. **Las enmiendas a `MOTOR.md` bajan de 7 a 5.** Tres de las de la v3 sobraban:
   - «sugerido» **ya existe** dentro de `importado` (F4);
   - la auditoría «tal como se registró» **ya la garantiza H5**;
   - la unidad mínima de cada moneda se aplaza.
9. **Nuevo hallazgo [C]: los logros dependen del «Ajuste».** `bolsasConsolidadas` usa `ultimaReconciliacion`, la fecha del último Ajuste (`movimientosUtils.js:315–347`). Pasar los ajustes a atestaciones **rompería los logros** si no se migra también ese punto de corte.
10. **Nuevo hallazgo de RGPD [X]: la copia del 21/11 está en tu Mac y contiene los datos personales de todos los usuarios.** Hay que guardarla cifrada, fijar cuánto tiempo se conserva y contarlo en la política de privacidad.
11. **La copia NO está verificada.** Existe y tiene datos [C], pero **no se ha probado a restaurar** [V].
12. **El plan, en tres bloques:** fase 0 (seguridad), fase 1 (núcleo, sin integraciones nuevas) y fases posteriores. La fase 1 **no necesita funciones nuevas en Vercel** ni conectores nuevos.

---

## 2. Qué se mantiene de la v3

Lo que sigue **no se rediseña**. Las referencias son secciones de la v3.

| Se mantiene | Sección de la v3 |
|---|---|
| Las tres capas: observaciones → hechos → estado derivado. Los adaptadores sin cálculo; un solo motor puro | 4.1, 7.1 |
| El vocabulario `tipo_evento` y su traducción a apuntes | 4.2 |
| La fachada `movimientosUtils.js` y la división en módulos | 4.3 |
| FIFO por activo y usuario; las comisiones dentro del coste; las retenciones aparte; cada comisión una sola vez | 6.1–6.3 |
| Escrituras solo por funciones, *trigger* de red de seguridad, `version_esperada` y anular en vez de borrar | 9.3 |
| Las claves foráneas compuestas `(usuario_id, id)` y `on delete restrict` | 13.1 |
| Las restricciones por tipo sin huecos de NULL, y `tipo_evento NOT NULL` con fecha de corte | 13.3 |
| La ingesta atómica: `lotes` con idempotencia + `hash_contenido`, `LOTE_CONFLICTO`, bloqueo por usuario y conexión | 7.4 |
| Identidad: hecho = uuid; observación = (conexión, id externo) o (conexión, huella, ordinal) | 10.1 |
| La puntuación de candidatos y la tabla de casos (pendiente, definitivo, devolución, reversión, duplicado, corregido) | 10.2–10.3 |
| Las discrepancias de saldo: el ejemplo de 10 € frente a 40 € y la pregunta con opciones | 11.2 |
| La autoridad por campo, no por fuente | 8.4 |
| Los cierres fiscales como foto en la «capa de consecuencias» | 9.5 |
| Pasos para pasar de `importe` a céntimos sin romper la app | 9.6 (solo con el nombre corregido, sección 5.7) |

---

## 3. Qué se corrige

| # | En la v3 | Problema | Corrección en la v3.1 | Sección |
|---|---|---|---|---|
| C1 | `observaciones.hecho_id`, `relacion`, `decidido_por` son columnas editables | Una observación no sería inmutable [X] | Observación inmutable + `vinculos` de solo añadir | 6.2 |
| C2 | «Verificado» = todas las cuentas atestadas | No tiene en cuenta las **cuentas que no conocemos** [X] | Cobertura + declaración de completitud | 5.1 |
| C3 | Tarjeta de crédito en una línea | Faltaban el modo de registro, los pagos parciales, los intereses y la validación anti-duplicados [X] | Sección 5.3 completa | 5.3 |
| C4 | Excel: solo la opción A | No refleja en tu Excel lo que registras en Fulcro [X] | A por defecto + B con permiso expreso | 7.1 |
| C5 | Coste desconocido: «coste estimado de 0» como alternativa, «saldo inicial implícito» | Contradictorio y con coste 0 [X] | Lote **sin importe**; venta = capital anterior; «no calculable» | 5.5 |
| C6 | `importe_minor` en todas las columnas | Cambiar el nombre de una columna que ya existe solo trae trabajo y riesgo [X] | Se mantiene `importe_centimos`; las columnas nuevas, en `*_centimos` | 5.7 |
| C7 | Unidades `numeric(38,18)` pensando en cripto | Cripto se aplaza | `numeric(28,10)`, suficiente para fracciones de acciones y ETF | 5.7 |
| C8 | Disponible y pendientes, sin regla (D22 abierta) | Riesgo de sumar o restar dos veces [X] | Regla única: el patrimonio usa el contable; el disponible solo explica | 5.6 |
| C9 | 7 enmiendas | 3 eran innecesarias o se adelantaban a su momento | 5 enmiendas | 9.2 |
| C10 | Migrar los ajustes a atestaciones sin mencionar los logros | `bolsasConsolidadas` depende de los Ajustes [C] | Paso explícito en la migración | 8.3 |
| C11 | `/api/ingesta` y `/api/sync` en el núcleo | No hacen falta en la fase 1: los importadores de hoy funcionan en el navegador y llaman a funciones de la base de datos | Se aplazan | 4 |
| C12 | Plan en 10 fases | Mezclaba lo imprescindible con lo opcional | Fase 0, fase 1 (1a–1f) y fases posteriores | 10 |

---

## 4. Qué se aplaza (fuera de la fase 1)

| Se aplaza | Por qué se puede esperar | Qué se deja preparado para no rehacer el motor |
|---|---|---|
| Multidivisa (conversión, tipos de cambio históricos, transferencias entre monedas, comisiones de cambio) | La fase 1 es solo EUR | `cuentas.moneda char(3)` con `check (moneda = 'EUR')`, que se relajará después; importes siempre «en la moneda de la cuenta» |
| Cripto avanzada | Igual | Clase de activo `cripto` admitida, valorada en EUR solo si el usuario la registra en EUR |
| Valor de mercado automático (precios) | El valor conocido puede llegar a mano o desde una captura | `atestaciones` con activo = valoración, que ya existe en el diseño |
| Rentabilidad XIRR y TWR | Es un análisis, no integridad | Aportaciones netas, sí (5.2) |
| Fiscal (informe y cierres) | Necesita un asesor | Bruto y retenciones guardados desde la fase 1 |
| Excel en los dos sentidos | Hace falta el núcleo primero | Huella + ordinal en la importación (fase 1f) |
| Open Banking, APIs de brókers y exchanges | Coste, contrato y RGPD | El contrato de los adaptadores (v3 7.1) |
| Fulcro registrando movimientos | Es un canal nuevo, no forma parte de la integridad | Lo hará con las mismas funciones `registrar_hecho` de la fase 1a |
| `/api/ingesta`, `/api/sync`, webhooks | Solo hacen falta para las integraciones del servidor | Límite de Vercel documentado (10 de 12 funciones usadas [C]) |
| Hipoteca con cuadro de amortización, bienes (vivienda) | Lo básico de los pasivos basta | `disposicion_prestamo`, `amortizacion` e `interes_deuda` (v3 4.2) |
| `instantaneas` (caché) | No hay problema de velocidad medido | — |
| Operaciones corporativas | Poco frecuentes | `tipo_evento` reservado |

---

## 5. Modelo financiero corregido

### 5.1 Patrimonio con información incompleta (prioritario)

**Principio:** el motor calcula siempre lo mismo, la suma de lo declarado (C1). Lo que cambia es **qué se puede afirmar de esa cifra**. Para eso, a cada pieza del patrimonio se le añade un **estado de conocimiento**.

**Por cuenta, el estado del saldo:**

| Estado | Cuándo | Qué se puede decir |
|---|---|---|
| `verificado` | Hay una atestación de saldo contable en la fecha D, o anterior y sin hechos desde entonces | «4.000 € · verificado el 20/11» |
| `anclado` | Hay una atestación anterior + hechos posteriores | «4.120 € · según tu saldo del 10/11 y lo apuntado desde entonces» |
| `sin_punto_de_partida` | Hay movimientos, pero ni saldo inicial ni ninguna atestación | **No hay saldo.** Solo «movimientos netos desde el 01/09: −340 €». **No entra** en el patrimonio conocido |
| `declarada_sin_saldo` | El usuario ha creado la cuenta, sin datos | «Cuenta sin saldo» → es una pieza pendiente |
| `desactualizado` | La última atestación tiene más de 31 días (configurable) | Entra, pero no cuenta para «verificado» |

**Por posición, el estado del coste y del valor:**

| | Valor conocido (atestación de valoración) | Valor desconocido |
|---|---|---|
| **Coste conocido** | Entra a mercado y a coste | Entra a coste; a mercado, «valorado a coste» |
| **Coste parcial** (algunos lotes) | Entra a mercado; a coste solo la parte conocida + «N acciones sin coste» | La parte conocida a coste; el resto, pendiente |
| **Coste desconocido** | Entra a mercado; **a coste, no entra** | **Pendiente**: no entra en ninguna cifra |

**Las cifras de patrimonio:**

| Cifra | Definición | Se enseña como |
|---|---|---|
| **Patrimonio conocido** (la cifra principal) | Σ saldos `verificado`/`anclado`/`desactualizado` + posiciones, cada una con el **mejor valor conocido**: mercado si existe, si no coste − pasivos conocidos | «Conocido: 11.000 €» |
| **Cobertura** | Qué partes están en la cifra y cuáles no; las piezas pendientes **se cuentan, no se valoran** | «Faltan: 1 cuenta sin saldo, 1 posición sin coste» |
| **Patrimonio estimado** | **Solo si el usuario da una estimación expresa** de una pieza pendiente (procedencia manual + `estimado = true`) | Línea aparte: «Con tus estimaciones: ~12.500 €». **Nunca** reemplaza al conocido |
| **Patrimonio a coste** (el canónico de la Constitución, E2 y §10) | Σ saldos + Σ coste de los lotes con coste conocido | En el detalle, con «excluye N posiciones sin coste» |
| **Patrimonio a mercado** | Igual que el conocido, pero solo si todas las posiciones tienen valor | Si falta alguno: «a mercado: no disponible para todo» |
| **Completo y verificado** | **Todas** las cuentas activas `verificado` en la misma fecha **+** ninguna pieza pendiente **+** el usuario ha declarado «estas son todas mis cuentas», con fecha y con caducidad de 90 días | «Completo y verificado a 20/11». Es lo único que puede llamarse «tu patrimonio» a secas |

**El ejemplo del encargo:**
- Banco A 4.000 € verificado · TR efectivo 2.000 € verificado · acciones con valor conocido 5.000 € (coste desconocido) · el usuario dice que tiene otra cuenta, pero no la ha registrado.
- **En el motor:** cuentas Banco A y TR `verificado`; posición a mercado 5.000 € y coste desconocido; cuenta C `declarada_sin_saldo`, o nada si ni siquiera la ha creado.
- **En pantalla:**

```
Patrimonio conocido     11.000 €
  Faltan: 1 cuenta sin saldo (Cuenta C) · coste de tus acciones
  [Añadir saldo]  [Añadir coste]
```

- **Si no ha creado la cuenta C**, la pantalla dice igualmente «Conocido», nunca «Total». Debajo pone «¿Tienes más cuentas? Añádelas para completar tu patrimonio», hasta que el usuario declare la completitud.
- **A coste:** 6.000 € + «acciones sin coste». A mercado: 11.000 €, porque la posición tiene valor.

**¿Contradice E2 («el patrimonio es una única cifra»)?**
- **No:** el canónico sigue siendo uno, a coste, y el motor lo calcula siempre.
- El «conocido» y la cobertura son **métricas auxiliares etiquetadas**, igual que la «liquidez consolidada» que `MOTOR.md` §2 ya sanciona [D].
- Una cuenta `sin_punto_de_partida` sigue contando en C1 como suma de lo declarado. Lo que no se hace es **llamar saldo** a ese número.
- Requiere la **enmienda A2** (9.2).

### 5.2 Las métricas, sin mezclarlas

| Métrica | Pregunta | Fórmula | Unidad de cálculo | ¿Patrimonio? |
|---|---|---|---|---|
| **Saldo de una cuenta** | ¿Cuánto hay en esta cuenta? | Saldo **contable** anclado (5.1) | cuenta | Sí |
| **Dinero disponible** | ¿Cuánto puedo gastar ya? | contable − Σ pendientes de salida conocidos (5.6) | cuenta | **No**, solo explica |
| **Capital aportado a inversiones** | ¿Cuánto dinero mío he metido? | Σ transferencias hacia cuentas de inversión − Σ las que salen. El saldo inicial de una cuenta de inversión cuenta como aportación «anterior a tus datos» | cuentas `broker` | No (es flujo) |
| **Coste de las posiciones abiertas** | ¿Cuánto me costó lo que tengo? | Σ coste de los lotes abiertos **con coste conocido** + aviso de los desconocidos | lote | Sí (a coste) |
| **Valor de mercado** | ¿Cuánto vale hoy? | Última valoración por posición, con su fecha | posición | Sí (a mercado) |
| **Resultado realizado** | ¿Qué gané o perdí al vender? | Σ (R − K) de las ventas con K **conocido** | venta | Ya está dentro del patrimonio; es su explicación |
| **Resultado no realizado** | ¿Qué ganaría si vendo hoy? | valor − coste, **solo de las posiciones con las dos cosas conocidas** | posición | Diferencia entre a mercado y a coste |

Las tres que más se confunden, en una línea cada una:
- **Aportado** es lo que sale de tu bolsillo;
- **coste** es lo que pagaste por lo que aún tienes;
- **valor** es lo que vale.

El efectivo que queda en el bróker es **saldo**, no inversión.

### 5.3 Tarjeta de crédito y partida doble

**Cuenta:** clase `tarjeta_credito`, de naturaleza **pasivo**. Su saldo es la deuda, con signo negativo. La Constitución lo prevé: «una deuda es una bolsa negativa por diseño» (§8) [D].

| Hecho | tipo_evento | Apuntes (E = exterior) | Tarjeta | Banco | Δ patrimonio | Gasto |
|---|---|---|--:|--:|--:|--:|
| Compra de 100 € | `gasto` (cuenta = tarjeta) | Tarjeta → E: 100 | −100 | 0 | −100 | **+100** |
| Pago de la tarjeta, 100 € | `transferencia` (banco → tarjeta) | Banco → Tarjeta: 100 | 0 | −100 | **0** | **0** |
| Devolución de 30 € de esa compra | `devolucion` (cuenta = tarjeta) | E → Tarjeta: 30 | +30 (deuda −30) | 0 | +30 | −30 |
| Intereses de 5 € | `interes_deuda` | Tarjeta → E: 5 | −5 | 0 | −5 | +5 (financiero) |
| Comisión de 3 € (anual, por retirar efectivo) | `comision` | Tarjeta → E: 3 | −3 | 0 | −3 | +3 (financiero) |
| Pago parcial de 60 € de una deuda de 100 € | `transferencia` | Banco → Tarjeta: 60 | −40 | −60 | 0 | 0 |
| Retirar efectivo con la tarjeta, 50 € | `transferencia` (tarjeta → efectivo) | Tarjeta → Efectivo: 50 | −50 | — | 0 | 0 (la comisión, aparte) |
| Autorización pendiente | — (**observación**, no hecho) | ninguno | 0 | 0 | 0 | 0 |

**Comprobación con `MOTOR.md`:**
- **E1:** todos los importes son > 0 y van de un nodo a otro.
- **E3:** la compra cruza la frontera, así que el patrimonio cambia. El pago no la cruza, así que no cambia.
- **E4:** el pago es entre dos bolsas tuyas → neutro.
- **§8:** la bolsa negativa está permitida.
- **Ciclo completo:** compra de 100 + pago de 100 = gasto 100, banco −100, deuda 0 y patrimonio −100. **Un solo gasto** ✓.

**Por qué se duplica en otras apps, y cómo se evita:**
- El extracto del banco trae «PAGO TARJETA VISA 100 €». Si además se importan las compras de la tarjeta, **ese pago no puede ser un gasto**.
- **Cada tarjeta tiene un modo**, decidido una vez y que se puede cambiar con una versión:
  - **`desglosado`:** las compras se registran en la tarjeta (manual, extracto de la tarjeta o captura). El pago desde el banco es **siempre** una transferencia. Si el adaptador del banco ve un pago de tarjeta, lo propone como transferencia a esa cuenta.
  - **`resumido`:** no se registran compras sueltas. El pago desde el banco es **un gasto** («Tarjeta · sin desglosar»). La deuda entre medias no se sabe: la cuenta de la tarjeta no existe o queda `sin_punto_de_partida`.
- **Validación** (en la función de escritura): en modo `resumido` no se admite ningún `gasto` con `cuenta = tarjeta`; en modo `desglosado` no se admite ningún `gasto` cuyo concepto se haya identificado como pago de esa tarjeta, y el conciliador lo propone como transferencia.
- **Tarjeta de débito:** **no es una cuenta**, sino un medio de pago de una cuenta corriente. Sus compras son gastos de esa cuenta. Es lo que pasa con la tarjeta de Trade Republic, que paga desde el efectivo del bróker.

### 5.4 Pasivos (fase 1: solo lo básico)

- **Clases:** `tarjeta_credito` y `prestamo`, con la hipoteca como un `prestamo` más.
- **Hechos:** `disposicion_prestamo` (D → C, neutro), `amortizacion` (C → D, neutro) e `interes_deuda` (C → E, gasto financiero).
- **El patrimonio suma cada pasivo una vez**, con su signo. En pantalla, «Pasivos: 1.000 €» en valor absoluto, que sale de esa misma suma.
- **Invariante I18 (de la v3):** una cuenta corriente con saldo negativo no aparece en «Pasivos», y un pasivo no aparece como liquidez.

### 5.5 Coste desconocido (cerrado sin coste 0)

**Estado de cada lote:** `coste_estado ∈ {conocido, desconocido}`. El estado **parcial** es de la **posición**, no del lote: unos lotes conocidos y otros no.

| Situación | Cómo se representa | Qué se puede afirmar |
|---|---|---|
| Lote de coste conocido | Compra con importe, comisiones y unidades | Todo |
| **Lote de coste desconocido** (comprado antes de tus datos) | Hecho `saldo_inicial` de **posición**: activo + unidades, **sin importe**. No genera apuntes: es una declaración de existencia, como una atestación de unidades | «Tienes 10 acciones; coste desconocido» |
| Coste parcialmente conocido | Lotes mezclados | «Coste conocido de 6 de 10 acciones: 600 €» |
| Valor actual conocido | Atestación de valoración | «Valen 1.400 € (a 20/11)» |
| **Venta que consume lotes conocidos** | K de FIFO | «Realizado: +40 €» |
| **Venta que consume lotes desconocidos** (el ejemplo: cobras 1.000 €) | Apuntes: **E → Efectivo: 1.000**, clasificado como **«capital anterior a tus datos»**, igual que el saldo inicial de hoy. **No es ingreso, no es ahorro y no es realizado** | «Has recibido 1.000 €. Resultado: no calculable (falta el coste)» |
| Venta que consume lotes de los dos tipos | Se reparte por lotes (FIFO, P4): la parte conocida da su realizado y la desconocida va a «capital anterior» | «Realizado calculable: +40 € (de 6 acciones) · 4 acciones sin coste» |
| No realizado | **Solo** de los lotes con coste conocido **y** posición valorada | «+200 € en 6 acciones · 4 sin coste» |
| El usuario indica el coste más tarde | Versión nueva del lote de apertura con su importe (procedencia manual) → el motor recalcula el realizado de esa venta (T3) | Se vuelve calculable |

**Por qué esto es coherente:**
- **No se inventa ningún coste:** el lote no tiene importe y no aparece en el «patrimonio a coste».
- **El dinero cobrado sí es real** y entra en el efectivo.
- Clasificarlo como «capital anterior» es **la misma regla** que ya usa la Constitución para el saldo inicial (E3: cruza la frontera desde el exterior). Hoy la Fase 1 lo hace a medias: el tope de `bolsas()` convierte el exceso en ganancia [C], lo cual es incorrecto.
- **Se cierra la D26 de la v3:** ya no hay que elegir. Se pide el coste (opcional) y, mientras no esté, «no calculable».
- **Requiere la aclaración A5** (9.2), porque F2a solo habla de «política de asignación de coste».

### 5.6 Saldo contable, disponible, pendientes y atestaciones

| Concepto | Qué es | Dónde vive | ¿Patrimonio? |
|---|---|---|---|
| **Saldo calculado** | Σ apuntes de la cuenta (lo que dicen tus hechos) | motor | Es el canónico |
| **Saldo informado por el proveedor** | Lo que dice el banco, el extracto o la captura | **observación** de clase `saldo`, con `tipo_saldo` | No, hasta que se acepta |
| **Atestación** | Un saldo informado y aceptado como afirmación: «la cuenta tenía X el día D». **Solo de tipo `contable`** | hecho (versionado) | Ancla el saldo; produce el residuo (N5) |
| **Saldo contable** | El saldo con los movimientos ya liquidados | atestación | Sí (anclado) |
| **Saldo disponible** | contable − retenciones − autorizaciones pendientes (± el descubierto permitido) | **derivado**, o la observación `disponible` para comprobar | **No** |
| **Movimientos pendientes y autorizaciones** | Cargos aún no liquidados | **observaciones** con `estado_fuente = pendiente` | **No** |

**El ejemplo:** el banco informa de 1.000 € contables, 850 € disponibles y 150 € pendientes.
- **Patrimonio:** usa los **1.000 €**, y nada más.
- **Disponible:** 1.000 − 150 = **850 €**. Coincide con lo que dice el banco, así que no hay discrepancia. Si no coincidiera (por ejemplo, 800 €), sale el aviso informativo «hay 50 € retenidos que no conocemos». **No es una discrepancia de patrimonio.**
- **Cuando se liquida** el cargo de 150 €: se crea el hecho (−150) y el pendiente se vincula como «duplicada». Saldo anclado = 1.000 − 150 = **850 €**. El siguiente extracto dirá 850 € contables → residuo 0.
- **Por qué nunca se resta dos veces:** el pendiente **no es un hecho**, así que antes de liquidarse no está en el saldo. Al liquidarse, es un hecho y el pendiente ya no cuenta.
- **El saldo disponible nunca se convierte en atestación.** Si una captura no deja claro qué saldo es, se pregunta una sola vez «¿incluye lo pendiente?». Mientras no se responda, se trata como contable con **confianza baja**.
- **Se cierra la D22 de la v3:** los pendientes no restan del patrimonio, nunca; restan solo del «disponible».

### 5.7 Importes y unidades (corregido)

- **Canónico: `importe_centimos bigint not null`.** Ya existe en producción [C, deducido de que la app lo escribe: `ajustes.js:39`]. Las columnas nuevas siguen el mismo patrón: `bruto_centimos`, `comision_centimos`, `retencion_centimos`…
- **La migración** desde `importe numeric` es la de la v3 (9.6), pasos 1–5, con este nombre.
- **Unidades:** `numeric(28,10)`, leídas como **texto** en JavaScript y convertidas a entero escalado (BigInt). Nunca `Number`.
- **Moneda:** solo EUR en la fase 1 (sección 4).

---

## 6. Modelo de información corregido

### 6.1 Las cinco piezas

| Pieza | Qué es | ¿Se modifica? | Tabla |
|---|---|---|---|
| **Observación original** | Lo que llegó de una fuente, tal cual (normalizado) | **Nunca**. Solo se borra con la supresión RGPD | `observaciones` |
| **Vínculo** | «Esta observación corresponde a este hecho, o a esta atestación, con esta relación» | **Nunca**. Corregirlo = añadir un vínculo que **sustituye** al anterior | `vinculos` |
| **Decisión** | Qué decidió el usuario, o una política suya, y por qué | Es **parte del vínculo** (autor, motivo, política), o de `decisiones` si no trata de una observación | `vinculos` / `decisiones` |
| **Hecho** | El acontecimiento económico consolidado | Con versiones nuevas | `movimientos`, `atestaciones` |
| **Versiones** | Las correcciones del hecho | Nunca (solo se añaden) | `movimientos_versiones`, `atestaciones_versiones` |

### 6.2 `observaciones` (inmutable) y `vinculos` (de solo añadir)

**`observaciones`** — la v3 sin los campos editables:

```
id, usuario_id, lote_id, conexion_id, clase ('movimiento'|'saldo'|'posicion'),
id_externo, huella, ordinal, recibido_en, fecha_efectiva,
payload jsonb, hash_payload, estado_fuente, confianza, motivo_confianza
-- SIN hecho_id, relacion ni decidido_*
```

- **Permisos:** solo `SELECT` para `authenticated`. Se inserta **solo** con `registrar_lote`.
- **`BEFORE UPDATE OR DELETE` → error,** salvo con el rol de supresión RGPD (8.2).

**`vinculos`:**

```
id, usuario_id, observacion_id, hecho_id | atestacion_id (exactamente uno, o ninguno si es 'descartada'),
relacion ('origen'|'confirma'|'actualiza'|'duplicada'|'descartada'),
sustituye_a (id de vinculos, null en el primero), version_base (del hecho, para fusionar a tres bandas),
autor, politica_id, motivo, creado
```

- **El vínculo vigente** de una observación es el que **nadie sustituye**.
- **Integridad, sin ningún `UPDATE`:**
  - `unique (observacion_id) where sustituye_a is null`: un solo primer vínculo;
  - `unique (sustituye_a)`: nadie se sustituye dos veces, así que la cadena es lineal.

  Resultado: como máximo **un vigente** por observación (equivalente a N9).
- **Corregir un vínculo mal hecho:** `revincular(observacion_id, nuevo_destino, motivo)` inserta un vínculo con `sustituye_a = vigente`. La observación original queda **intacta** y se ve todo el historial.
- **Exclusiones de la conciliación** (las filas del Excel que no deben entrar): vínculo `descartada` con su motivo. **La tabla `conciliacion_exclusiones` de la v2 desaparece.**
- **`decisiones`** se queda **solo** para lo que no es una observación: elegir entre dos atestaciones contradictorias (10 € frente a 40 €), aceptar una discrepancia de posición o declarar la completitud. Sigue el mismo patrón de solo añadir (`sustituye_a`).
- **Lectura:** una vista `vinculos_vigentes` (`not exists` sustituto) con índice en `(usuario_id, observacion_id)` y en `sustituye_a`.

**¿Es una tabla de más?** Hay que comparar con la alternativa de dejar `hecho_id` en la observación y versionar la observación entera: así habría observaciones **con versiones**, que es justo lo que no queremos. La tabla de vínculos es la forma más simple de que la observación sea **inmutable de verdad**. A cambio, `conciliacion_exclusiones` desaparece: el número de tablas no aumenta respecto a la v2.

### 6.3 Qué pasa con cada corrección

| Se descubre que… | Se hace | Lo que no cambia |
|---|---|---|
| Una observación estaba vinculada al hecho equivocado | Vínculo nuevo que sustituye al anterior | La observación y el hecho |
| La fuente leyó mal un importe (por ejemplo, una captura) | Se **edita el hecho** (versión nueva) o se descarta el vínculo; la observación sigue diciendo lo que dijo la fuente | La observación |
| La fuente corrige su propio dato (el banco cambia un importe) | Llega **una observación nueva** (mismo id externo, otro hash) → propuesta «actualiza» → versión del hecho | La observación anterior |
| El hecho estaba mal | Versión nueva del hecho | Sus observaciones y vínculos |

---

## 7. Sincronización y fuentes

### 7.1 Excel: comparación de alternativas

| Criterio | **A. Original solo lectura + archivo espejo de Palanca** | **B. Original + pestaña controlada por Palanca (con permiso expreso)** | **C. Palanca en el centro: el Excel solo como exportación** |
|---|---|---|---|
| Seguridad | Máxima: nunca se escribe en tu archivo | Buena: el permiso es de **un solo archivo** (`drive.file` + selector de Google [V]). Que solo toque su pestaña lo asegura **nuestro código**, no Google | Máxima |
| Riesgo de perder datos | Ninguno en el original | Bajo: solo escribe en su pestaña, y Google guarda el historial de versiones del archivo [V] | Ninguno |
| Duplicados | Huella + ordinal (frágil si cambias importe y concepto a la vez) | **ID Palanca** en cada fila de su pestaña → exacto. Tus pestañas, por huella | No aplica |
| Conflictos | Solo en la entrada | Fusión a tres bandas por fila de su pestaña | No hay |
| Dos sentidos | **Parcial**: lo de Fulcro aparece en **otro archivo**, no en el tuyo | **Sí**: lo de Fulcro aparece **en tu archivo**, en la pestaña «Palanca». Tus fórmulas pueden leerla | No (solo de Palanca al Excel) |
| Facilidad | Dos archivos | Un archivo, con una pestaña más | La más sencilla, pero te obliga a apuntar solo en Palanca |
| Futuro | Bien | Bien (el mismo patrón en cualquier hoja) | Bien |
| `.xlsx` local (no Google) | Importar y exportar a mano | **No es posible** sin OneDrive (aplazado) | Exportar |

**Recomendación: A por defecto + B como opción, y solo en Google Sheets.**
- **A para todos:** tu hoja es una **fuente de entrada**. Palanca **nunca** escribe en tus pestañas.
- **B por archivo y con permiso expreso** («Permitir que Palanca escriba en la pestaña «Palanca» de este archivo»), que se puede revocar:
  - Palanca crea **su** pestaña y escribe **solo** ahí, comprobando el identificador interno de la pestaña (no su nombre) antes de cada escritura;
  - **nunca borra filas:** una anulación se marca en la columna «Estado»;
  - sus filas llevan `ID Palanca`.
- **El Excel nunca es el corazón:** la verdad son los hechos. Las hojas son una fuente de observaciones y una **vista** exportada.
- **Para tu Excel de Finanzas** sigue valiendo «el Excel es intocable» [D]: se queda en A mientras no autorices B.

### 7.2 Cómo se evitan los seis riesgos

| Riesgo | Mecanismo |
|---|---|
| **Bucles** | Cada fila que escribe Palanca guarda `hash_escrito` y `(hecho_id, version)`. Al leer, una fila de la pestaña «Palanca» con el mismo hash que escribimos es un **eco** → se ignora. Palanca **no lee** sus propias filas como fuente nueva: solo mira si **cambiaron** respecto a lo que escribió |
| **Importaciones duplicadas** | `lotes` idempotente (id + `hash_contenido`); una observación idéntica (misma identidad + mismo `hash_payload`) **no se vuelve a guardar**; el conciliador vincula a hechos que ya existen |
| **Sobrescrituras silenciosas** | Nada externo cambia un hecho sin pasar por `actualiza` → propuesta → versión con autor o política. La política por defecto **no** permite actualizar sola un hecho `manual` ni uno confirmado |
| **Cambios a la vez en dos fuentes** | Fusión a tres bandas por campo con `version_base` del vínculo. Si cambian los dos lados → **cola de conflictos**; ninguno gana solo |
| **Borrados accidentales** | Una fila que desaparece → propuesta «¿anular?», nunca automática. **Fusible:** si en una lectura desaparece más del 10 % de las filas o más de 20 (umbral por definir), **se pausa la conexión** y se avisa. Es lo típico de una hoja vaciada por error |
| **Reprocesar cambia el histórico** | Reprocesar es idempotente: mismas observaciones → nada nuevo. Una **nueva versión del motor o del adaptador** no reescribe hechos: como mucho genera **propuestas** que el usuario ve |

### 7.3 Las demás fuentes en la fase 1

**Solo las que ya existen**, pasadas al contrato de observaciones:
- importación CSV, extracto y plantilla (`importarCsv.js`, `plantillaPalanca.js`);
- capturas de movimientos (`leer-capturas`);
- el conector de Claude (`importar_movimientos`).

La captura de **saldos y posiciones** (Trade Republic), Fulcro registrando gastos, Sheets en los dos sentidos y Open Banking son **fases posteriores**.

---

## 8. Seguridad y migraciones

### 8.1 Lista de comprobación antes de implementar nada

| # | Qué | Estado | Cómo se verifica |
|---|---|---|---|
| S1a | Copia de seguridad | **Existe** [C]: volcado del 21/11, 667 KB, con datos en `movimientos`, `categorias` y `perfiles` | — |
| S1b | **Restauración de la copia** | **NO verificada** [V] | Restaurarla en el PostgreSQL local o en un proyecto vacío → mismos recuentos por tabla y mismo Σ `importe_centimos` por usuario que producción |
| S1c | Copias automáticas | **No hay** (plan Free; captura tuya) [C] | Decidir el plan Pro (D16) o una copia manual con un calendario fijo |
| S1d | **Custodia de la copia** | **Pendiente** [X]: está en tu Escritorio, sin cifrar, y contiene datos personales de **todos** los usuarios | Moverla a un volumen cifrado (imagen de disco cifrada en macOS), fijar la retención (por ejemplo, 3 copias, 90 días) y borrar las antiguas |
| S2 | Esquema del repositorio frente a producción | **Diferencia comprobada** [C]: `importe_centimos` no está en ningún `.sql` | Volcar solo el esquema de producción (`pg_dump --schema-only`) y compararlo con los `.sql` |
| S3 | Políticas RLS reales | Probadas en una sesión anterior en 11 tablas; **3 sin probar a fondo** [V] | `supabase-auditoria-seguridad.sql` (solo lectura) + la prueba con dos usuarios en **dev** |
| S4 | Roles y permisos | Sin revisar en producción [V] | Listar los permisos de `anon` y `authenticated` por tabla y función; confirmar si se puede crear un rol propio (D28) |
| S5 | Funciones `SECURITY DEFINER` | En el repositorio: `soy_admin`, métricas, funnel, `fulcro_*`, `registrar_evento`, `recordatorios_candidatos`, `borrar_mi_cuenta` [C] | Comprobar en producción `search_path`, que comprueban el usuario y `revoke` a `anon` |
| S6 | Seguridad de las funciones de Vercel | 10 en `api/` [C]; **autenticación de cada una sin revisar en esta sesión** [V] | Revisar una a una: quién puede llamarla, con qué token y qué devuelve sin sesión |
| S7 | Borrado de cuenta | La función del repositorio es dinámica y cubre todas las tablas con `usuario_id` [C]; la versión de producción no está verificada [V] | Probarla en dev con un usuario de prueba y comprobar que quedan 0 filas en todas las tablas |
| S8 | Archivos guardados | El código **no usa Supabase Storage** [C, búsqueda sin resultados]; las capturas no se guardan | Comprobar en producción que no hay *buckets* con datos |
| S9 | Tokens y credenciales | OAuth del conector gestionado por Supabase Auth; claves en las variables de Vercel (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`) [C por el código] | Confirmar en Vercel qué entornos tienen cada clave; que la service key **no** esté en Preview; rotarla si alguna vez se compartió |
| S10 | Registros | `registro-error`, `fulcro_uso`, `eventos` y los registros de Vercel [C] | Comprobar que no guardan importes, conceptos ni preguntas con datos personales, y con cuánta retención |
| S11 | Terceros con datos | Anthropic (Fulcro y capturas), Google (Sheets), Supabase y Vercel | Ponerlos en el registro de tratamientos y en la política de privacidad |
| S12 | Entornos | Existe «palanca dev»; **según `docs/ESTADO.md`, la app no lo usa** [C del documento; no visto en Vercel] | — |
| S13 | Preview en Vercel → dev | **Pendiente** (S2 tuyo) | Abrir una vista previa y comprobar en la pestaña Red del navegador que llama al dominio de dev |
| S14 | Despliegue solo con CI en verde | Vercel despliega aunque falle el CI [C del documento] | «Ignored Build Step» o despliegue desde GitHub Actions |

### 8.2 RGPD: integridad en el uso normal y supresión completa

**En el uso normal**, el historial no se puede borrar:
- sin permiso `DELETE` (ni `UPDATE` en observaciones, vínculos y versiones);
- escrituras solo por funciones;
- *triggers* `BEFORE DELETE` que dan error.

**Para la supresión:**
- `borrar_mi_cuenta()` la ejecuta como **rol dedicado** (`palanca_supresion`). Los *triggers* lo dejan pasar **solo** a ese rol [P; que Supabase lo admita está por verificar, D28].
- **La función:**
  1. comprueba `auth.uid()`;
  2. borra **todas** las tablas con `usuario_id`, las nuevas incluidas: observaciones, vínculos, versiones, lotes, conexiones y atestaciones;
  3. **revoca y borra los tokens** de las conexiones (Google y, en el futuro, el agregador);
  4. borra `auth.users`;
  5. deja un **registro anónimo**: fecha, nº de filas por tabla y un hash irreversible del id. Nada que identifique a la persona.
- **Lo que no puede borrar al momento:**
  - **las copias de seguridad** (manuales o del plan Pro): el usuario sigue en ellas hasta que caducan;
  - lo que ya se envió a terceros (las peticiones a Anthropic, según su política).

  **Las dos cosas hay que contarlas en la política de privacidad**, con el plazo.
- **Al restaurar una copia antigua,** hay que volver a aplicar las supresiones hechas después. Por eso hace falta una **lista de supresiones**, con solo el hash del id.
- **Obligaciones de conservar:** no conozco ninguna que obligue a Palanca a guardar los datos financieros de un usuario que pide borrarlos [V]. **Hay que validarlo con un asesor legal.**

**Coherencia con H1:** es la enmienda **A3** (9.2). Sin ella, H1 dice «nunca se borra» y la ley obliga a borrar.

### 8.3 Migraciones (reglas, sin cambios de fondo respecto a la v3)

**Cómo se hace cada migración:**
- primero en **dev** y después en producción;
- **por usuario y en una transacción**;
- con **vista previa** y **foto de números** antes y después;
- se activa con un **interruptor** solo si la foto cuadra;
- y tiene su vuelta atrás escrita.

**Dos puntos nuevos:**
- **Logros** [C]: `bolsasConsolidadas` usa la fecha del último Ajuste como punto de corte. Al pasar los ajustes a atestaciones, hay que cambiarla para que use `registrado_en` de la última **atestación**. Si no se hace, **los logros de liquidez y patrimonio dejarían de concederse**. La prueba: los logros concedidos antes y después de la migración son los mismos para todos los usuarios de prueba.
- **Saldo inicial del alta** [C, `crearAjuste` y el onboarding]: pasa a `saldo_inicial` **sin cambiar ningún número**. Solo los ajustes de reconciliación posteriores se convierten en atestaciones, y **solo con la vista previa** de cada usuario. Los ajustes de otros usuarios **no se tocan solos**: se preparan en una lista para revisar.

---

## 9. Coherencia con `docs/MOTOR.md` y decisiones que requieren aprobación

### 9.1 Comparación de la v3 con la Constitución

| Tema | `MOTOR.md` dice [D] | La v3 decía | Situación |
|---|---|---|---|
| Patrimonio único (E2) | Una sola cifra, Σ bolsas | Varias cifras (a coste, anclado, a mercado) | **Bien** si el canónico es uno y las demás son auxiliares etiquetadas (el precedente es la «liquidez consolidada», §2). Hace falta **A2** |
| Apuntes (§0, H4, N8) | Unidad interna, inmutable | Se calculan, no se guardan | **Hace falta aclarar:** **A1** |
| Nada se borra (H1) | Sin excepciones | Excepción RGPD | **Contradicción con la ley** → **A3** |
| Procedencia (F4) | `manual`, `regla`, `importado`; «o sugerido por IA» dentro de `importado` | Añadía `sugerido` como procedencia nueva | **Duplicaba lo que ya existe.** Se retira: `sugerido` = `importado` + `canal`. Canal y confianza son **metadatos** que no afectan al cálculo → **no necesitan enmienda** |
| Céntimos (P1) | «entero de céntimos» | Unidad mínima de la moneda | **Se aplaza** con la multidivisa: no hace falta enmienda ahora |
| Auditoría (H5) | Historia siempre reconstruible | Enmienda A7 «tal como se registró» | **Ya está resuelto por H5**: se retira |
| Venta (F2a) | «necesita política de coste» | Coste desconocido con soluciones contradictorias | **Hace falta aclarar:** **A5** |
| Valor ≠ coste (F2b, §10) | Ampliación prevista, aditiva | Activarla | **Bien, pero en una fase posterior:** **A4**, que se aprueba cuando llegue |
| Deudas (§8) | «una deuda es una bolsa negativa por diseño» | Pasivos como cuentas | **Ya está resuelto.** Sin enmienda |
| Estado derivado no guardado (§0, N3) | Nunca se guarda | `cierres` e `instantaneas` | **Bien:** `cierres` es la «capa de consecuencias» (§10) e `instantaneas` es una caché no autoritativa. Se aclara dentro de **A1** |
| Liquidez consolidada (§2) | Usa `created_at` y el corte de reconciliación | No lo mencionaba | **Problema** [C]: depende del «Ajuste». Paso de migración (8.3) |
| E4, nota de la «Implementación actual (Fase 1)» | Aportar = gasto Inversion | Aportar = transferencia | **No es un cambio de contrato**: se actualiza la nota cuando se implemente |
| N5 (sin tapones) | Prohibido | Atestaciones | **El código actual lo incumple** (`crearAjuste` de reconciliación) [C]. La v3 lo corrige: sin enmienda |

### 9.2 Enmiendas (5)

| # | Texto actual | Problema | Propuesta | Por qué | Consecuencias |
|---|---|---|---|---|---|
| **A1** | §0: «Apunte: la unidad interna… Es inmutable». «Estado derivado… Nunca se almacena» | No dice si los apuntes se guardan; la v3 los calcula | «Los apuntes son la **traducción determinista** de cada versión de un hecho; pueden calcularse en vez de guardarse, siempre que sean reproducibles. Las fotos de consecuencias (cierres, informes) y las cachés no son estado autoritativo» | Una sola verdad; no hay que escribir los apuntes de todo el histórico | H4 se cumple porque las versiones son inmutables. Si algún día hay que guardarlos, se puede sin cambiar el contrato |
| **A2** | §2: solo sanciona la «liquidez consolidada» como métrica auxiliar | No contempla el saldo real ni el patrimonio incompleto | Añadir como métricas auxiliares etiquetadas el **patrimonio anclado**, el **patrimonio conocido con su cobertura**, y que solo se diga «completo y verificado» con las condiciones de 5.1. **El canónico (E2) no cambia** | Enseñar la realidad sin tapones (N5) ni cifras falsas | La pantalla principal mostrará «conocido» en vez de un «patrimonio» a secas |
| **A3** | H1: «Nada se borra ni se sobreescribe» | Choca con el derecho de supresión (RGPD, art. 17) | «…salvo la supresión completa de la cuenta a petición de su titular, ejecutada solo por el proceso de supresión, que no deja datos personales» | Ley | Hace falta el rol dedicado (D28) y una lista de supresiones para las restauraciones |
| **A4** (fase posterior) | F2b: «cuando llegue el momento» | — | Activar valor ≠ coste con **cobertura de valoración**; multidivisa después | Patrimonio a mercado | Se aprueba al empezar esa fase, no ahora |
| **A5** | F2a: «una política de asignación de coste (FIFO/medio)» | No dice qué pasa si el coste no se conoce | «Política FIFO. Un lote de **coste desconocido** no tiene importe; al consumirlo, lo cobrado entra como **capital anterior a los datos** (igual que el saldo inicial) y el resultado es **no calculable**. Nunca se usa coste 0» | Sin rentabilidades inventadas | Cambia el resultado de quien hoy tiene «ganancias» por el tope de `bolsas()`; se ve en la vista previa |

### 9.3 Decisiones que requieren tu aprobación

**Se mantienen (ya estaban):**
- D1 queda **sustituida por A2**: lo que hay que aprobar ahora es A2.
- D4 (ahorro frente a resultado patrimonial).
- D6 (quitar los borrados del conector).
- La excepción RGPD (= A3).
- El umbral de 31 días.
- Las 8 decisiones del Excel, D15 y D16.

**Nuevas o cambiadas:**

| ID | Decisión | Recomendación |
|---|---|---|
| A1, A2, A3, A5 | Las enmiendas | Aprobar antes de la fase 1. A4, más adelante |
| D17 | Autoridad por campo (v3 8.4) | Aprobar los valores por defecto |
| D18 | Vincular solo con puntuación alta | No por defecto |
| D19 | Guardar las imágenes de las capturas | No |
| **D20 (cambia)** | Excel: A por defecto + B con permiso expreso (Sheets) | Sí. Tu Excel de Finanzas se queda en A |
| D21 | Dividendos en el ahorro: neto | Sí |
| **D22 (cerrada)** | Los pendientes solo restan del disponible | Aprobar |
| **D26 (cerrada)** | Coste desconocido = A5 | Aprobar |
| D28 | Rol dedicado para la supresión | Verificar en dev |
| **D29 (nueva)** | Declaración de completitud con caducidad de 90 días | Aprobar el concepto; el plazo se puede ajustar |
| **D30 (nueva)** | Tarjeta de crédito: modos desglosado o resumido | Aprobar |
| **D31 (nueva)** | Fusible de borrado masivo en Sheets (10 % o 20 filas) | Aprobar el concepto; afinar los números |
| **D32 (nueva)** | Retención de las copias manuales (3 copias o 90 días, cifradas) | Decidir |

---

## 10. Plan por fases

### Fase 0 — Seguridad y preparación (bloquea todo)
1. ✅ Volcado de la copia (21/11).
2. **Prueba real de restauración** (S1b).
3. **Custodia de la copia:** cifrada y con retención (S1d, D32).
4. **Volcado del esquema** de producción y comparación con el repositorio (S2).
5. **Preview → dev** (S13) y despliegue solo con CI en verde (S14).
6. **Revisión de RLS, roles, funciones `SECURITY DEFINER` y funciones de Vercel** (S3–S6, S9, S10).
7. **Probar `borrar_mi_cuenta` en dev** (S7) y comprobar si se puede crear el rol dedicado (D28).
8. **D6:** quitar `borrar_movimientos` y `borrar_sobrantes` del conector.
9. **Foto de números** de cada usuario de prueba.

### Fase 1 — Núcleo financiero (por subfases; cada una deja todo funcionando)

| Subfase | Contenido | Depende de | Cifras que cambian a propósito |
|---|---|---|---|
| **1a. Integridad de los hechos** | `estado` y `version`, versiones, escrituras por funciones (`registrar_hecho`, `editar_hecho`, `anular_hecho`, `restaurar_version`), la app y el conector migrados, permisos directos retirados, rol RGPD | 0 | Ninguna |
| **1b. Coherencia** | `importe_centimos` canónico (*trigger* puente), claves foráneas compuestas, `restrict`, `tipo_evento` + `deducirTipo` (fuzz = `bolsas()` de hoy) | 1a | Ninguna |
| **1c. Cuentas, partida doble y pasivos** | `cuentas` (EUR), Cuenta principal, efectivo del bróker, transferencias, tres formularios, tarjeta de crédito (los dos modos) y préstamo básico | 1b | Solo el **reparto** entre cuentas |
| **1d. Inversiones** | `activos`, FIFO, comisiones y retenciones, coste conocido, parcial o desconocido (A5), aportaciones netas | 1b (no necesita 1c: agrupa por activo; la cuenta se añade después) | Invertido y patrimonio (corrección FIFO); «capital anterior» |
| **1e. Saldos y cobertura** | `atestaciones` (contable), residuo, disponible derivado, pendientes como observación, `decisiones`, cobertura y completitud (A2), ajustes → atestaciones, **logros migrados** | 1c | Lo que se enseña como patrimonio (A2) |
| **1f. Observaciones, duplicados y conciliación** | `conexiones`, `lotes`, `observaciones`, `vinculos`; los importadores actuales (CSV, plantilla, capturas, conector) al contrato; puntuación de candidatos, propuestas y conciliación con huella + ordinal para el Excel en **solo lectura** | 1c, 1e | Ninguna (las importaciones dejan rastro) |

**Orden dentro de la fase 1:** 1a → 1b → 1d → 1c → 1e → 1f.
- **1d va antes que 1c** porque es el error financiero más grave y no necesita cuentas.
- **1e necesita 1c** porque un saldo es de una cuenta.
- **1f necesita 1e** porque las observaciones de saldo producen atestaciones.

### Fases posteriores (por orden de valor)
1. **Fulcro registra gastos** (canal nuevo sobre las funciones de 1a).
2. **Capturas de saldo y posiciones** (Trade Republic) → atestaciones y valoraciones.
3. **Valor de mercado** (A4) y no realizado completo.
4. **Sheets en los dos sentidos** (opción B) + fusible + cola de conflictos.
5. **Análisis:** rentabilidad XIRR y TWR, informes.
6. **Fiscal** (con asesor) y cierres.
7. **Open Banking**, APIs de brókers e integraciones (`/api/ingesta`, `/api/sync`).
8. **Multidivisa, cripto avanzada** y enmienda de la unidad mínima.
9. Bienes, hipoteca con cuadro de amortización, operaciones corporativas e instantáneas, si hacen falta.

---

## 11. Riesgos pendientes

| Riesgo | Mitigación | Estado |
|---|---|---|
| El esquema real es distinto del repositorio | Fase 0, paso 4 | Abierto |
| La copia no se puede restaurar | Fase 0, paso 2 | **Abierto: hasta entonces, no hay copia «verificada»** |
| Copia sin cifrar con datos de todos los usuarios | S1d | Abierto |
| La supresión RGPD se rompe con la protección | Probar en dev antes de 1a; D28 | Abierto |
| Supabase no admite el rol dedicado | Plan B (variable de sesión dentro de la función), más débil y documentado | Abierto [V] |
| Los logros dejan de concederse al migrar los ajustes | 8.3 | Previsto |
| El «patrimonio conocido» baja y se percibe como un error («antes tenía más») | Vista previa por usuario + explicación en pantalla de qué ha cambiado | Previsto |
| Mezclar los modos de la tarjeta de usuarios ya existentes | Por defecto, `resumido` para los datos antiguos (no hay compras con tarjeta registradas) | Previsto |
| Umbrales del conciliador sin calibrar | Sin vincular solo (D18) hasta calibrarlos con extractos reales | Abierto |
| La garantía de «solo su pestaña» depende de nuestro código | Comprobar el identificador de la pestaña + historial de versiones de Google + pruebas | Para la fase de Sheets |

---

## 12. Autoauditoría final

| Pregunta | Respuesta |
|---|---|
| **¿Se ha duplicado alguna funcionalidad que ya existe?** | **No, con dos cuidados.** (1) `bolsasConsolidadas` (la liquidez consolidada) y el nuevo «anclado» se parecen. **No se crea un segundo cálculo:** la consolidada pasa a usar las atestaciones como corte (8.3), y el anclado es la versión por cuenta. (2) `fuentes` (etiqueta) y `conexiones` (de dónde llegan los datos) son cosas distintas y se mantienen separadas a propósito. Se **elimina** `conciliacion_exclusiones` (absorbida por `vinculos`) y la procedencia `sugerido` (ya existía en F4). |
| **¿Se ha contradicho `docs/MOTOR.md`?** | No hay contradicciones ocultas. Hay **una contradicción explícita**, H1 frente al RGPD, que exige la enmienda A3. Lo demás son **aclaraciones**: A1, A2, A5, y A4 más adelante. El código actual incumple N5 y F2a; la v3.1 lo corrige, no lo empeora. |
| **¿Se ha añadido complejidad innecesaria?** | Se **quita** respecto a la v3: 3 enmiendas, el cambio de nombre de columnas, `/api/ingesta` en el núcleo, la multidivisa, la cripto y la procedencia nueva. Se **añaden** `vinculos` (necesaria para la inmutabilidad, y compensada por la tabla que desaparece), los modos de la tarjeta (necesarios para no duplicar) y la cobertura (necesaria para no mentir). Un riesgo de exceso: la **autoridad por campo** (D17), que hay que esconder con buenos valores por defecto. |
| **¿Se ha confundido el patrimonio conocido con el total?** | No. «Total» o «completo» solo con verificación de todas las cuentas **y** declaración de completitud; si no, «conocido» + cobertura (5.1). Las cuentas sin punto de partida no entran. |
| **¿Se puede contabilizar dos veces un gasto con tarjeta?** | Con el modelo, **no**. Compra = gasto en la tarjeta; pago = transferencia; modos excluyentes validados al escribir (5.3). **Riesgo que queda:** que un adaptador clasifique mal un «pago de tarjeta» con un concepto raro. Lo cubre el conciliador (propone una transferencia si hay compras en esa tarjeta) y es una propuesta, no una escritura automática. |
| **¿Se puede alterar una observación original?** | No en el uso normal: sin permiso `UPDATE` ni `DELETE`, y con un *trigger* que da error. Los vínculos se corrigen añadiendo, nunca modificando. **Solo** la supresión RGPD la borra. El dueño de la base de datos podría desactivar los *triggers*: ese riesgo lo cubren las copias, y es inevitable en Supabase. |
| **¿Se puede inventar una rentabilidad cuando falta el coste?** | No. Lote sin importe → realizado «no calculable» y no realizado solo de la parte conocida; nunca coste 0 (5.5, A5). Lo cobrado entra como capital anterior, no como ganancia. |
| **¿Se puede duplicar un movimiento al sincronizar varias fuentes?** | **No por la vía automática:** un hecho, N observaciones vinculadas; idempotencia por lote y por observación; ecos ignorados. **Puede pasar por decisión humana:** si el usuario rechaza una propuesta de «es el mismo» y crea uno nuevo. Es reversible (anular + revincular). |
| **¿Se puede borrar información necesaria sin dejar rastro?** | No en el uso normal: anular deja versión y motivo. Supresión RGPD: borra todo **a propósito** y deja un registro anónimo. Riesgo: un borrado manual en el editor SQL de Supabase. Lo mitigan las copias verificadas, que **todavía no lo están**. |
| **¿Qué decisiones siguen sin estar suficientemente justificadas?** | (1) Los **umbrales** del conciliador y del fusible (10 % o 20 filas): no salen de datos. (2) La **caducidad de 90 días** de la completitud: es una opinión de producto. (3) Que **Supabase admita el rol dedicado**: no verificado. (4) Que **`drive.file` con el selector** limite de verdad el permiso a un archivo y que el historial de versiones de Google proteja lo suficiente: está por verificar con la documentación de Google. (5) Que **todo cabe en memoria** con muchos datos: no está medido. (6) **Cuando el usuario no tiene la cuenta de la tarjeta**, el modo `resumido` pierde la deuda entre pagos; es un compromiso aceptado, no una solución. (7) No hay ninguna obligación legal de conservar, pero **está por validar** con un asesor. |

---

### Resumen de cambios respecto a la v3

| Tipo | Cambios |
|---|---|
| **Corregido** | Observaciones inmutables + `vinculos` de solo añadir (C1) · completitud y cobertura (C2) · tarjeta de crédito con modos y anti-duplicados (C3) · Excel A + B (C4) · coste desconocido sin coste 0 (C5) · `importe_centimos` en vez de `importe_minor` (C6) · `numeric(28,10)` (C7) · regla del contable frente al disponible (C8) · 5 enmiendas en vez de 7 (C9) · migración de los logros (C10) · sin funciones nuevas en el núcleo (C11) · plan en fase 0, fase 1 y posteriores (C12) |
| **Añadido** | Estado de conocimiento por cuenta y por posición; patrimonio conocido y estimado; declaración de completitud; fusible de borrado masivo; custodia y retención de las copias; lista de supresiones para las restauraciones; lista de seguridad S1–S14 |
| **Retirado** | La procedencia `sugerido` (ya en F4), la enmienda de la unidad mínima (aplazada), la auditoría «tal como se registró» (ya en H5), `conciliacion_exclusiones` (absorbida), la multidivisa y la cripto del núcleo |
| **Cerrado** | D22 (pendientes) y D26 (coste desconocido) |
| **Sin cambios** | Todo lo de la sección 2 |
