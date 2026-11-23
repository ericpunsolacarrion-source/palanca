# Palanca — Arquitectura del motor financiero V3.3 (BORRADOR CONSOLIDADO)

**Estado:** borrador para revisión. **Ninguna propuesta de este documento está aprobada**, salvo las cuatro marcadas APROBADA (§0.4).
**Fecha:** 23/11/2026.
**Documentos que lo acompañan:** `MATRIZ-DECISIONES-V3.3.md` y `BRECHAS-Y-APROBACIONES-V3.3.md`.
**No contiene datos personales.** Todos los ejemplos son sintéticos.

**Etiquetas:**

| Etiqueta | Significado |
|---|---|
| **[C]** | Comprobado en el código o en el SQL del repositorio |
| **[A]** | Arquitectura definida (propuesta) |
| **[S]** | Supuesto sin demostrar |
| **[NC]** | No consolidable por falta de una fuente |
| **[MOTOR-x]** | Regla de `docs/MOTOR.md` |
| **Dnn (vK)** | La versión vigente de una decisión (por ejemplo, D63 (v6)) |

---

## 0. Fuentes, jerarquía y alcance

### 0.1 Fuentes usadas (todas leídas de verdad)

| Fuente | Ubicación | Contenido |
|---|---|---|
| `docs/MOTOR.md` | Repositorio | Las invariantes E, T, P, H, C, R, N y F, y §10 |
| Código y SQL | Repositorio (rama `claude/capabilities-overview-m3ry1u`, commit `d52bada`; `origin/main` = `4d816bd`) | El sistema actual (§1) |
| Arquitectura consolidada v2 | Fuera del repositorio: `scratchpad/arq_v2_maestro.md` | D1–D16 y el modelo inicial |
| Revisión crítica v2 | `scratchpad/arq_v2.md` | Correcciones de la v2 |
| Auditorías 2 y 3 | `scratchpad/aud2.md` y `scratchpad/arq_m.md` | Problemas S, F, C y T |
| V3, V3.1 y V3.2 | `scratchpad/ARQUITECTURA-V3*.md` | El modelo multifuente y D17–D37 |
| Auditorías de D34 (1, 2 y 3), informe de reanudación, contrastes 1–5 y cierres 1–2 | **Solo en el historial de esta conversación**, no hay ningún archivo | D38–D71 y sus revisiones |

`scratchpad` = `/tmp/claude-0/-home-user-palanca/62d1cdb4-c1f4-53c2-bf02-f63d50418b9c/scratchpad/`. **Es una carpeta temporal:** ver BRECHAS §1.

### 0.2 Jerarquía

1. `MOTOR.md` obliga, salvo las enmiendas identificadas en §0.5, que siguen **pendientes**.
2. Una revisión posterior prevalece **solo** en lo que cambia.
3. Lo aprobado no se reabre sin una contradicción demostrada.
4. El código describe el comportamiento actual; **no** autoriza a mantener sus errores.

### 0.3 Lo que no se puede consolidar [NC]

- **El esquema real de producción:** solo tengo los `.sql` del repositorio, que **no** coinciden (por ejemplo, `importe_centimos` existe en producción [C, la app lo escribe] y no está en ningún `.sql`). §1.2 y §8 dependen de un volcado del esquema.
- **La configuración real de Vercel** (qué commit está en producción, la versión de Node y las variables de Preview).
- **El resultado de la prueba de restaurar la copia:** no se ha hecho.

### 0.4 Decisiones aprobadas por el usuario (las únicas)

| ID | Decisión | Origen |
|---|---|---|
| D20a | El Excel original del usuario es **solo de lectura** | «EL EXCEL ES INTOCABLE» (encargo de auditoría financiera) |
| PF | Estructura de fases: fase 0, fase 1 y posteriores | Encargo V3.1, §10 |
| PM | Multidivisa y cripto fuera de la fase 1 | Encargo V3.1, §6 |
| PE | No implementar nada sin una aprobación expresa | Todos los encargos de arquitectura |

### 0.5 Enmiendas a `MOTOR.md` que hacen falta (todas PENDIENTES)

| ID | Regla afectada | Contenido |
|---|---|---|
| A1 | §0, H4, N3 | Los apuntes son una **traducción determinista** de la **versión** de un hecho, incluida su **asignación de coste versionada** (D61). Se pueden calcular sin guardarlos. Los informes emitidos y las cachés no son estado autoritativo |
| A2 | §2, T1 | Métricas auxiliares: saldo **anclado** (sobre la base de liquidación), residuos por tramo y acumulados, cobertura y etiquetas. **T1 rige el canónico**; el anclado y los residuos usan `fecha_valor` y vuelven a la base económica con lo que está en tránsito |
| A3 | H1 | Excepción por la supresión RGPD |
| A4 | F2b | Capa valor ≠ coste en versión mínima (valoraciones manuales, por captura o por precio de operación; EUR) |
| A5 | F2a | Coste desconocido: parte indeterminada, nunca 0, venta como traspaso neutro, «no calculable» |
| A6 (= D67) | E2 | Σ bolsas del libro = **base conocida B**. El patrimonio a coste es PCq (exacto, un rango o una cota inferior); el total, solo si se puede determinar |
| A7 (= D50 + D57) | R3 | Migración **conservadora** (igualdad al céntimo) o **correctora** (diferencia = Σ correcciones de un catálogo cerrado, con pruebas y aceptación) |

---

## 1. El sistema actual (comprobado)

### 1.1 El motor

- **Un solo motor:** `src/lib/movimientosUtils.js` (`bolsas`, `totalesDe`, `centimosDe`, `sumaImportes`, `bolsasConsolidadas`…), empaquetado para el servidor en `api/_motor.js` con esbuild desde `src/servidor/motorServidor.js`. Una prueba vigila que el paquete esté al día (`tests/api/mcpHttp.test.js:75`) [C].
- **Céntimos enteros** en las sumas (P1–P3) [C].
- **Fase 1:** el significado de cada movimiento lo da el **nombre de la categoría** (`Inversion`, `Ahorro`, `Desde ahorro`, `Ajuste`, `Devoluciones`) (`categorias.js`) [C]. Contradice E5, E6 y N7.
- **Una venta de inversión** resta lo cobrado con tope en 0; el exceso es «ganancia». Una prueba lo fija (`motorInvariantes.test.js:158`) [C]. Contradice F2a.
- **Los ajustes de saldo** son movimientos «Ajuste» que **suman** al patrimonio (`ajustes.js`) [C]. Contradice N5.
- **El motor lee el reloj del sistema** (`claveMesActual`, `hoyIso`) [C]. Contradice D70.

### 1.2 Datos (según el SQL del repositorio; el de producción es [NC])

**Tablas:** `movimientos` (id, usuario_id, tipo, categoria_id, fuente_id, importe numeric, fecha, nota, es_fijo, created_at; **`importe_centimos` existe en producción, pero no está en el repositorio**), `categorias`, `fuentes` (etiqueta de pagador o plataforma, `on delete set null`), `perfiles` (incluye `saldo_inicial` **sin uso en el código** y `ultima_reconciliacion`), `recurrentes`, `recurrentes_confirmaciones`, `planificaciones`, `presupuestos`, `presupuestos_categoria`, `objetivos_ahorro`, `simulaciones_guardadas`, `escenarios_simulador`, `gastos_rapidos`, `comercios_alias`, `fulcro_uso`, `eventos`, `admins`, `planes`, `planes_historial`, `ahorros_negociados`, `recordatorios_enviados` [C].

**Funciones `SECURITY DEFINER`:** `borrar_mi_cuenta` (dinámica: borra todas las tablas con `usuario_id`), `soy_admin`, `palanca_metricas`, `palanca_funnel`, `fulcro_*`, `registrar_evento`, `recordatorios_candidatos`, `mi_plan`, `admin_cambiar_plan` [C].

**Borrados físicos de movimientos:** en la app (`MovimientosV5.jsx:88`, `ImportarHistorial.jsx:489`, `RegistroMovimiento.jsx:172`, `Inversiones.jsx:208`, `ListaMovimientos.jsx:231`, `useRecurrentes.js:363`) y en el conector (`_mcpNucleo.js:292, 311, 689`) [C].

### 1.3 De dónde salen los ajustes (para la migración)

| Origen | Nota | ¿Guarda el saldo declarado? | Fecha |
|---|---|---|---|
| Alta («¿Cuánto tienes hoy en tu cuenta?», «Aproximado vale»; solo si es > 0) | «Saldo inicial» | El importe **es** el saldo declarado | Fecha local del dispositivo (`hoyIso`) |
| `AjusteSaldo` (Patrimonio, InicioV5, PatrimonioV5) | «Ajuste de saldo: tenías X más/menos» | **No:** solo la diferencia | Fecha local del dispositivo |
| `CuadrarSaldo` de la importación | «…al dd/mm: banco X + efectivo en el bróker Y» | **Sí**, literal | La elegida; el cálculo usa `hasta = fecha` |
| Conector, `cuadrar_saldo` | La misma nota | **Sí**, literal | Hora de Madrid (`process.env.TZ`) |
| Cuadres con diferencia 0 | — | **No se guarda nada** | — |

Fuentes [C]: `App.jsx:562`, `Onboarding.jsx`, `Patrimonio.jsx:146–158`, `ImportarHistorial.jsx:112–121`, `_mcpNucleo.js:316–345`, `useSaldo.js`.

**Los logros** dependen del último «Ajuste» como punto de corte (`bolsasConsolidadas`, `ultimaReconciliacion`) [C].

### 1.4 Plataforma

- **Vercel Hobby:** 10 de 12 funciones en uso (`limiteVercel.test.js`) [C].
- **CI con Node «22»** (solo la versión mayor), sin `.nvmrc` ni `engines` [C]. Node local: 22.23.4 [C].
- **Copia de seguridad:** volcado del 21/11 (667 KB, con datos en `movimientos`, `categorias` y `perfiles`) [C, por la salida del Terminal del usuario]. **No se ha restaurado, no está cifrada** y contiene los datos personales de todos los usuarios. El plan Free no tiene copias automáticas.
- **Vistas previas de Vercel → base de datos de producción:** así lo dice `docs/ESTADO.md` [C del documento; no lo he visto en Vercel].

---

## 2. Principios

1. **Céntimos exactos** en todo importe. Las unidades de inversión, como decimal exacto. Nunca coma flotante en el núcleo.
2. **Un motor puro:** `estado = f(entradas, VERSION_MOTOR, hoy, tz)`. Sin entrada ni salida, sin reloj y sin `Intl` (D70).
3. **Lo desconocido es desconocido:** no hay ceros por defecto ni órdenes inventados. La incertidumbre se muestra como un rango, un conjunto, una cota o «no determinable».
4. **Nada se borra en el uso normal:** versiones de solo añadir (H1). La única excepción es la supresión RGPD (A3).
5. **Cuatro capas separadas:** observación (lo que dijo una fuente), hecho (lo que pasó), atestación o declaración (lo que alguien afirma de un saldo o un valor) y cálculo (derivado).
6. **Cuadrar es entender, no tapar** (C3, N5): los residuos se ven y nunca se suman al canónico.
7. **Coste ≠ valor ≠ rentabilidad:** cifras separadas.
8. **Proporcionalidad:** lo tiene que poder implementar una sola persona con 8–12 horas a la semana.
9. **Experiencia de usuario:** una cifra principal con su etiqueta; el detalle, cuando se pide.

---

## 3. Modelo conceptual

### 3.1 Entidades [A]

| Entidad | Qué es | Hoy | Nuevo o migración |
|---|---|---|---|
| Usuario | Una persona (`auth.users` + `perfiles`) | Existe | — |
| **Cuenta (bolsa)** | Un lugar donde hay valor: corriente, ahorro, bróker (efectivo), cripto, efectivo, tarjeta de crédito, préstamo, `historico_sin_desglosar` (L), `fiscal_pendiente` (H) | No existe (`fuentes` es una etiqueta) | **Nueva** (V3 §5.1; D49 y D56) |
| **Hecho** | El acontecimiento económico: una fila de `movimientos` con `tipo_evento` | `movimientos` (Fase 1, por categoría) | Se amplía (V3 §4.2 y §15) |
| **Versión de un hecho** | Copia inmutable de cada versión (autor, procedencia, motivo, `causa`, `registrado_en`) | No existe | **Nueva** (V3 §9.3; D61) |
| **Observación** | Lo que dijo una fuente, tal cual (`recibido_en`, `fecha_efectiva`, `payload`, hash) | No existe (las importaciones no dejan rastro) | **Nueva, inmutable** (V3.1 §6) |
| **Vínculo** | Observación → hecho o atestación, de solo añadir, con `sustituye_a` | No existe | **Nueva** (V3.2 §2.3) |
| **Decisión** | La elección del usuario sobre una discrepancia, un duplicado o la completitud | No existe | **Nueva** (V3.1 §6) |
| **Atestación** | Afirmación sobre el saldo de **una** bolsa (D48), con precisión `exacta`, `aproximada` o `reconstruida`, `tipo_saldo` e `instante` | No existe (hoy son «Ajuste») | **Nueva** + migración (§8) |
| **Operación / unidad de liquidación** | Lados de apuntes que se liquidan juntos | No existe | **Nueva** (D63) |
| **Activo, lote y posición** | ISIN o ticker; lote = adquisición con intervalo, unidades, coste o null; posición = lotes por (activo, cuenta) (D55) | No existe | **Nueva** (V3 §6; D54, D69) |
| **Asignación de coste** | Dentro de la versión de una venta: (lote, versión del lote, unidades, coste o null) | No existe | **Nueva** (D61) |
| **Valoración** | Atestación de posición con `fecha_valoracion`, publicación prevista y efectiva, `recibido_en`, zona horaria y fuente | No existe | **Nueva** (D68) |
| **Aviso de la fuente** | Observación: retraso, suspensión, reanudación o rectificación | No existe | **Nueva** (D68) |
| **Bolsa H** | Retenciones pendientes de regularizar (un activo que no es líquido) | No existe | **Nueva** (D56) |
| **Configuración versionada** | `config_versiones` (periodo, modo de tarjeta, completitud…) | Columnas sueltas en `perfiles` | **Nueva** (D66) |
| **Instantánea o informe emitido** | Entradas + resultado + hashes | No existe | **Nueva** (D66) |
| **Lote de ingesta** | Importación o sincronización idempotente (`id`, `hash_contenido`) | No existe (la lista de deshacer va en localStorage) | **Nueva** (V3 §7.4) |

### 3.2 Relaciones

- Usuario 1–N cuentas; cuenta 1–N hechos (por cada lado); hecho 1–N versiones.
- Observación 1–N vínculos (una cadena lineal con **un solo vigente**); vínculo → hecho **o** atestación.
- Venta (versión) → N asignaciones → lote (versión).
- Valoración → activo (y, si es de posición, cuenta).
- **Todas** las claves foráneas son compuestas (`usuario_id`, id) (V3 §13.1).

---

## 4. Contabilidad y patrimonio

### 4.1 Apuntes y flujos (V3 §4.2; E1–E6)

| tipo_evento | Apuntes (E = exterior) | Δ base B | Flujo |
|---|---|---|---|
| ingreso | E → C | +X | ingreso |
| gasto | C → E | −X | gasto (consumo) |
| devolución | E → C | +X | −gasto de su categoría |
| corrección de ingreso | C → E | −X | −ingreso |
| transferencia (aportación si va a una cuenta de inversión) | C₁ → C₂ | 0 | — (D62: «aportado» = solo transferencias) |
| `saldo_inicial` / `capital_apertura` | E → C, o E → P (lote con coste) | +X | — (fuera de los flujos, E6) |
| compra | C → P (bruto + comisión + impuesto de la operación) | 0 | — |
| venta, coste conocido | P → C: K · E → C: R − K (o P → E: K − R) | R − K | resultado realizado (no es ahorro, D4) |
| venta, asignación pendiente o sin coste | P·sc / G → C: R (traspaso neutro) | 0 | «no determinado» |
| dividendo / interés | E → C: neto · **E → H: retención** (D72, pendiente) | +bruto | ingreso financiero (**neto** para el ahorro, D21) |
| retención en una venta | C → H | 0 | — |
| liquidación del IRPF | H → E (definitivo) · H → C / E ↔ C (devolución o pago) | según el caso | impuesto (cómo cuenta en el ahorro: **D64, pendiente**) |
| comisión suelta, interés de una deuda | C → E | −X | gasto financiero |
| disposición o amortización de un préstamo | D → C / C → D | 0 | — |

Leyenda: C = cuenta de efectivo · P = coste de lotes conocidos · P·sc = parte cobrada sin coste · G = grupo de orden indeterminado · H = retenciones · D = pasivo · R = cobrado neto de comisión (D56) · K = coste asignado.

**Una tarjeta de crédito** (V3.1 §5.3; D30): la compra es un gasto en la tarjeta (la deuda sube) y el pago es una transferencia del banco a la tarjeta. Cada tarjeta tiene un modo, `desglosado` o `resumido`, y no se pueden mezclar.

### 4.2 Liquidez

Por cuenta b, a fecha D (D63):

```
K_b(D)  = Σ apuntes de b con fecha ≤ D                     canónico (económico)          [céntimos]
L_b(D)  = Σ apuntes de b con fecha_valor_lado(b) ≤ D       liquidado calculado
T_b(D)  = K_b(D) − L_b(D)                                  ejecutado pendiente de liquidar (hechos)
AL_b(D) = A_k + L_b(D) − L_b(t_k)                          liquidado ANCLADO (k = última ancla válida ≤ D)
P_b(D)  = AL_b(D) + T_b(D) = K_b(D) + R_b(D)               efectivo PROYECTADO
Disponible ≈ P_b − autorizaciones pendientes (observaciones, no hechos; D22)
```

- **El saldo contable o liquidado** del banco se compara **solo** con AL o L.
- **El disponible** solo se compara (sin anclar) con P − autorizaciones.

### 4.3 Patrimonio (D67 / A6, pendiente)

| Magnitud | Definición | ¿Es exacta? |
|---|---|---|
| **Base conocida B** | Σ bolsas del libro = capital declarado + flujos + realizado común a todos los escenarios | Sí. **Es una magnitud de control, no el patrimonio** |
| **PC cuantificable** PCq_s | Σ efectivo (P_b) + Σ pasivos + Σ coste de los lotes conocidos restantes en el escenario s | Exacta si es igual en todos los escenarios; si no, un rango. **Cota inferior** si quedan lotes sin coste |
| **PC total** | PCq + Σ Uⱼ (costes desconocidos ≥ 0) | Solo si no quedan lotes sin coste y el orden se conoce |
| **Patrimonio a mercado** | Σ efectivo + pasivos + Σ valoraciones (D68) | Ver §6.4 |
| **RND_s** | Realizado no determinado (depende del orden) | Por escenario |
| **CSC_s** | Cobrado de lotes sin coste | Por escenario |
| **Patrimonio anclado** | Σ AL + T + posiciones = canónico + Σ residuos | Auxiliar (A2) |

**La identidad** (para todo escenario s y toda fecha): **PCq_s = B + RND_s + CSC_s**.

**La completitud y las etiquetas** (V3.2 §2.4; D29, D51 y D68):
- «**Patrimonio verificado a dd/mm**» solo con: declaración de completitud + todas las cuentas con atestación **exacta** el mismo día y al día + las condiciones de posiciones (costes completos para la cifra a coste; PM_total para la de mercado).
- Siempre con la línea «sin explicar: X €» si ΣR ≠ 0.

### 4.4 Residuos (D63; C3 y N5)

```
r₁ = A₁ − L(t₁) ;  r_k = A_k − [A_{k−1} + L(t_k) − L(t_{k−1})] ;  R(D) = Σ_{t_k ≤ D} r_k
Teorema: AL = L + R ;  P = K + R
P1: cada ancla válida reinicia AL. P2: corregir A_k en δ cambia r_k (+δ) y r_{k+1} (−δ), y nada más.
P3: una operación conocida tarde solo cambia el r de su tramo.
```

Los residuos son **estado derivado**: se guardan las atestaciones y las decisiones, nunca los residuos.

### 4.5 Ejemplo con importes exactos (D63, E1)

| Fecha | Hecho | L | Previsto | A | r | R | AL |
|---|---|--:|--:|--:|--:|--:|--:|
| 01/11 | `saldo_inicial` 1.000,00 · A₁ = 1.000,00 | 1.000,00 | 1.000,00 | 1.000,00 | 0 | 0 | 1.000,00 |
| 05/11 | Gasto 200,00 | 800,00 | | | | 0 | 800,00 |
| 10/11 | Ingreso 500,00 | 1.300,00 | | | | 0 | 1.300,00 |
| 15/11 | A₂ = 1.250,00 | 1.300,00 | 1.300,00 | 1.250,00 | −50,00 | −50,00 | 1.250,00 |
| 18/11 | Gasto 100,00 | 1.200,00 | | | | −50,00 | 1.150,00 |
| 20/11 | A₃ = 1.150,00 | 1.200,00 | 1.150,00 | 1.150,00 | 0 | −50,00 | 1.150,00 |

**Se registra tarde un gasto de 50,00 con fecha 12/11:** r₂ = 0, R = 0, y AL(20/11) sigue en 1.150,00 ✓.

---

## 5. Inversiones y FIFO (D54 (v3), D69 (v2), D61, D62, D65 — PENDIENTES)

### 5.1 Lotes e intervalos (D69 v2)

| Lote | Intervalo de adquisición |
|---|---|
| Fechado | [f, f] |
| Apertura (anterior al corte) | (−∞, corte] |
| Entrado sin fecha (traslado) | (−∞, fecha de entrada] |

- **Un lote solo se puede consumir en una cuenta desde que entra en ella** (D55: FIFO patrimonial por (activo, cuenta); el FIFO fiscal, entre cuentas, va solo en la capa fiscal).
- **Orden(A, B) fijado ⇔ máx(A) < mín(B).**
- **Contraejemplo de la simplificación anterior:** corte 01/09, apertura (−∞, 01/09] y lote fechado del 15/08 → se solapan → el orden es **indeterminado**.

### 5.2 Fase 1 (D69 v2)

- Si una venta **puede** consumir dos o más lotes cuyo orden no está fijado → **la asignación queda pendiente**:
  - el cobro entra como traspaso neutro (G → C);
  - se muestran B y PM;
  - no hay ningún realizado ni ningún rango;
  - hasta que el usuario dé las fechas o divida el lote de apertura.
- **Los escenarios** (D54 v3), con rangos de PCq, quedan para después.

### 5.3 Coste desconocido (A5)

- **Un lote sin coste no tiene importe.** Su venta es P·sc → C: R (neutro).
- **«Cobrado sin coste conocido»** se muestra **en positivo**, con una explicación (D36).
- **Si después se conoce el coste:**
  - versión nueva del lote: E → P (*capital_apertura*) **en la fecha de corte o de entrada**;
  - **versión nueva de cada venta afectada** (D61, procedencia `regla`, `causa`);
  - se recalcula (T3).

**Ejemplo** (D61/B-4a):
- 10 acciones sin coste; se venden 4 por 400,00; después se sabe que las 10 costaron 800,00.
- Venta v1: P·sc → C: 400,00.
- Lote v2: E → P: 800,00 (en la fecha de corte).
- Venta v2: P → C: 320,00 · E → C: 80,00.
- Resultado: C = 2.400,00 · P = 480,00 · B = 2.880,00 = 2.000,00 + 800,00 + 80,00 ✓.

### 5.4 Versionado de asignaciones (D61)

- **Si cambia el coste** de un lote → versión nueva de cada venta que lo usa.
- **Si cambian unidades, fechas u orden** → se vuelve a ejecutar el FIFO de (activo, cuenta) desde la fecha afectada.
- **Todo en la misma transacción.** Solo se crea versión si algo cambia (idempotente).

**Ejemplo:** compra de 10 por 1.000,00 → 1.020,00 → 1.050,00; ventas de 3 por 390,00 y de 4 por 560,00.

| Versión del lote | Efectivo | P (3 restantes) | Realizado | Base B |
|---|--:|--:|--:|--:|
| v1 (1.000,00) | 1.950,00 | 300,00 | +250,00 | 2.250,00 |
| v2 (1.020,00) | 1.930,00 | 306,00 | +236,00 | 2.236,00 |
| v3 (1.050,00) | 1.900,00 | 315,00 | +215,00 | 2.215,00 |

### 5.5 Grupos de orden indeterminado (D54 v3, posterior a la fase 1)

- Escenarios = órdenes posibles (respetando intervalos y entrada en la cuenta).
- RND_s y CSC_s por escenario.
- PCq exacto o rango.
- **Grupo cerrado sin orden conocido** → resultado total «**sin asignar**» con fecha de determinación (D65-B; se rechaza reconocerlo todo en la última venta).
- Ejemplo de referencia: L1 5 × 100 + L2 5 × 90; S1 5 por 600; S2 2 por 260 → PCq ∈ [1.130, 1.160], B = 950, RND ∈ {180, 210}.

### 5.6 Capital de apertura (D62)

- E → P en la **fecha de corte**. No es ingreso, ni aportación, ni realizado.
- `fecha_adquisicion` del lote, solo para FIFO y lo fiscal.
- Base de rentabilidad = el **valor de mercado** en el corte; si no se conoce, la rentabilidad desde el corte es «no calculable».

---

## 6. Conciliación y atestaciones

### 6.1 Fechas

| Fecha | Qué es |
|---|---|
| `fecha` | La operación (económica) |
| `fecha_valor` (en cada lado de cada apunte) | La liquidación |
| `registrado_en` | Cuándo se guardó la versión (hora del servidor) |
| `recibido_en` | Cuándo se recibió la observación (hora del servidor) |
| `instante` | Cuándo se declaró el saldo (atestación) |

### 6.2 Atestaciones válidas (D71 v2)

| Fuente | ¿Atestación? | Precisión | ¿Ancla? | ¿«Verificado»? |
|---|---|---|---|---|
| Extracto con saldo inicial y final | 2 (inicial = al cerrar el día anterior al periodo) + comprobación inicial + Σ movimientos = final | exacta (si la comprobación cuadra) | Sí | Sí |
| Extracto con saldo diario | Una por día (después del último movimiento del día) | exacta | Sí | Sí |
| Extracto sin saldo | **No** | — | — | — |
| Captura con tipo y fecha | Sí | exacta / aproximada | Si es exacta y liquidada | Si es exacta |
| Captura del disponible | Solo comprobación (frente a P − autorizaciones) | — | No | No |
| Manual | Sí | exacta solo si el usuario confirma «es lo que ves ahora en tu banco»; si no, aproximada | Exacta; aproximada solo si se confirma | Solo si es exacta |
| Saldo del alta | Sí | aproximada (D52) | Solo si se confirma | Nunca |
| Ajuste antiguo R1/R2 | Sí (§8.3) | reconstruida | Solo con las condiciones de §8.3 | **Nunca** |
| **Saldo calculado a partir de movimientos** | **Nunca** (sería un tapón, N5) | — | — | — |

- **Ancla válida** = exacta, o aproximada o reconstruida **confirmada**.
- **Un ancla aproximada confirmada** reinicia el cálculo **respecto a una referencia declarada**: los residuos posteriores se etiquetan «**respecto a un saldo aproximado**». **No** se convierte en prueba exacta.
- **Sin ancla válida no hay independencia entre tramos:** el tramo llega hasta la anterior ancla válida.
- **Las comprobaciones de conjunto** (un saldo de varias cuentas) son una observación `saldo_conjunto`: **no anclan** (D48).

### 6.3 Unidades de liquidación e inclusión (D63 v6)

- **Unidad** = los lados que se liquidan juntos (el mismo hecho, sus componentes, o los vinculados por `operacion_id` o un vínculo).
- **Estado** de cada lado: `liquidado` / `pendiente` / `desconocido`.
- **U'** = las unidades desconocidas del tramo, de esa cuenta.

```
r(S) = r₀ − Σ_{j∈S} x_j          (r₀ = residuo suponiendo que no se ha liquidado ninguna unidad de U'; x_j con su signo)
R_posibles = { r(S) : S ⊆ U' } ;  mín = r₀ − Σ_{x>0} x ;  máx = r₀ − Σ_{x<0} x
```

**Ejemplo** (compra −1.000,00, atestación igual a la anterior): R_posibles = {0, +1.000,00}. Con una venta +1.000,00: {0, −1.000,00}.

**Agrupación segura:** k unidades → una variable con multiplicidad k **solo si:**
1. son de la misma cuenta y del mismo tramo;
2. tienen el mismo importe y el mismo signo;
3. todas son desconocidas y sin cotas de fecha;
4. ninguna forma parte de una unidad compuesta ni está vinculada;
5. ninguna está en una hipótesis de duplicado;
6. no tienen restricciones entre cuentas.

**Demostración:** {Σ_S} = {c·x : 0 ≤ c ≤ k}.

**Política de recursos (determinista):**
- Coste C = Π(kᵢ + 1).
- Se parte en dos mitades con un algoritmo determinista (las variables, ordenadas por id).
- **Límite de memoria:** ≤ 2¹⁶ sumas por mitad (unos 0,5 MB).
- Si no cabe → «**no comprobado**», con el rango [mín, máx].
- **Sin límites de tiempo:** el resultado no depende del aparato (D70).

**Duplicados pendientes:**
- Cada propuesta es una hipótesis (`mismo` / `distinto`). Con m ≤ 3 → hasta 2^m resultados condicionales. Si m > 3 → «revisar duplicados».
- **Nunca se resuelven solos.**
- Se eliminan duplicados **antes** de conciliar.

**Qué ve el usuario** (los cuatro estados se distinguen visualmente):

| Estado | Condición |
|---|---|
| **Cuadra** | U' vacío, sin hipótesis y r = 0 |
| **Podría cuadrar** | 0 ∈ R_posibles (demostrado) |
| **No comprobado** | Se ha pasado el límite, m > 3 o falta un ancla válida |
| **Discrepancia detectada** | 0 ∉ R_posibles (o r ≠ 0 exacto) |

**Transferencias:** cada lado se concilia en su cuenta. Σ T = el dinero en camino; K y P no cambian.

---

## 7. Valoraciones de mercado (D68 (v3), PENDIENTE)

### 7.1 Datos

`activo`, `cuenta` (opcional), `tipo` (precio unitario / valor de la posición + unidades observadas), `precio` o `valor` (decimal exacto), `moneda` (EUR en la fase 1), `fecha_valoracion`, `naturaleza` (cierre / valor liquidativo / operación / tasación / manual), `pub_prevista` (calculada), `pub_efectiva` (si la fuente la da), `recibido_en`, `fuente`, `zona_publicacion`, `ritmo`, `retraso` y `calendario` (configurables por activo, mercado o fuente).

### 7.2 La regla E(τ)

```
pp_X(v)  = publicación prevista de la valoración v según el último aviso con recibido_en ≤ X (si no hay aviso, el calendario normal)
fin(d, z) = el final del día d en la zona z (con sus reglas de horario de verano)
E(τ)     = máx { v : fin(pp_X(v), zona_publicacion) ≤ τ }
al_dia   ⇔ fecha_valoracion ≥ E(τ)
τ (Q2 de hoy) = now() del servidor ;  τ (sobre una fecha D) = fin(D, zona del usuario por config_versiones)
```

**El dispositivo nunca interviene.**

**Ejemplo con horario de verano:**
- Fuente en America/New_York, con pp = martes 27/10/2026.
- La UE cambió al horario de invierno el 25/10/2026; EE. UU. no lo hace hasta el 01/11/2026.
- fin(27/10, NY) = 27/10 23:59:59 EDT (UTC−4) = **28/10 04:59:59 en Madrid** (CET, UTC+1).
- Con τ = 28/10 05:30 en Madrid, **ya ha pasado**.
- Un cálculo con un desfase fijo de 6 h (las 05:59:59) diría que no. **Las zonas horarias se tratan con su base de datos de reglas, nunca con desfases fijos.**

### 7.3 Avisos

- Son observaciones **inmutables**: `tipo` (`retraso`, `suspension`, `reanudacion`, `rectificacion`), las valoraciones afectadas, `nueva_pp` opcional y `sustituye_a`.
- Una rectificación es **un aviso nuevo**: el anterior se conserva.
- **Q1 solo usa los avisos con `recibido_en` ≤ X.**
- Un aviso sin fecha nueva no mueve pp.
- Suspensión → `suspendida` hasta que llegue una reanudación.

**Ejemplo:**
- Fondo diario con retraso 1, zona Europe/Luxembourg. pp(martes 24/11/2026) = miércoles 25/11.
- El aviso llega el **viernes 27/11 a las 09:00**: «los valores del martes y del miércoles se publicarán el viernes».
- **Q1, jueves 26/11 a las 12:00:** sin aviso → E = martes → la valoración del lunes 23/11 está **desfasada**.
- **Q1, viernes 27/11 a las 12:00:** con aviso → E = lunes → **al día** («retraso comunicado»).
- **Q2 sobre el jueves 26/11:** al día (se usa el aviso conocido hoy).
- **Q1 del jueves ≠ Q2 sobre el jueves, a propósito.**

### 7.4 Estados y patrimonio a mercado

**Estados:** al_dia · desfasada · sin_fecha · ritmo_desconocido · estimada (sin mercado) · suspendida · inconsistente (las unidades no coinciden con los lotes) · sin_valorar.

- **Una valoración parcial** (de la posición) solo vale para las unidades que cubre.
- **Los pasivos** van al nominal, con su signo una sola vez.
- **H** va al nominal (activo).

```
PM_mercado determinable en τ (cuentas declaradas) ⇔ toda posición cotizada abierta al_dia, efectivo de valor único, sin estados problemáticos
PM_total determinable ⇔ lo anterior + sin activos estimada abiertos + completitud declarada (D29)
```

**Una fuente que deja de publicar** → la valoración pasa a desfasada en la siguiente pp, **por construcción**. **No hay umbrales universales:** todo depende del ritmo de cada activo.

---

## 8. Migración desde el sistema actual (plan; no se ejecuta)

### 8.1 Requisitos

- Fase 0 completa (§10).
- **Motor v1 archivado** (§9.4).
- Fase 1a (versiones) **antes** de migrar ningún ajuste.

### 8.2 Pasos, por usuario y en una transacción

1. **Inventario en solo lectura:** número de movimientos, ajustes por clase (alta / R1 / R2 / R3), movimientos anteriores al saldo del alta, del mismo día, `perfiles.saldo_inicial` (D59), duplicados probables.
2. **Foto de números** (Fase 1, con el motor v1): patrimonio, liquidez, invertido, flujos por mes y logros.
3. **Versión 1** de cada movimiento (`procedencia = migracion`).
   - **No se puede recuperar lo borrado o editado antes.** La historia empieza aquí.
4. **Cuenta histórica L:** todos los movimientos con liquidez de la Fase 1 (D49). Las inversiones, a posiciones por (activo, L).
5. **El saldo del alta** (D52):
   - si no hay movimientos con fecha anterior → `saldo_inicial` **aproximado**, con su `instante`;
   - si los hay → atestación aproximada de L **que no ancla** salvo que se confirme;
   - los movimientos del mismo día se listan para que el usuario diga si fueron antes o después.
6. **Ajustes:** R1 / R2 / R3 (§8.3). Por defecto, R3 = `ajuste_heredado` **sin cambios** (D46).
7. **Las inversiones existentes** pasan a lotes:
   - las compras, a lotes fechados (sin activo → «sin identificar», con asignación pendiente);
   - las ventas → FIFO **solo** si el orden está demostrado (D69).
8. **Comparación R3** (A7):
   - tipo A (igual al céntimo en una rejilla de fechas), o
   - tipo B (diferencia = Σ correcciones del catálogo: B1, que nunca es automática; B2; B3, cambio de política de coste; B4, tapón → atestación).
   - **Si no cuadra, ese usuario no se migra.**
9. **Logros:** el punto de corte pasa a ser la última atestación válida. Se comprueba que los logros concedidos no cambian.
10. **Vuelta atrás:** un interruptor por usuario + las versiones. La foto se guarda como instantánea.

### 8.3 Ajustes reconstruidos (D71 v2)

**Cuatro dimensiones independientes:**

| Dimensión | Valores |
|---|---|
| Valor | `literal_recuperado` (la nota trae banco y bróker) / `reconstruido_de_diferencia` (R2) / `no_recuperable` (R3) |
| Perímetro | `declarado` / `coincide_con_L` (**solo si el usuario confirma** que no había otra liquidez; la liquidez de la Fase 1 incluye el dinero apartado como ahorro [C]) |
| Coherencia | `comprobada` / `no_comprobable` / `incoherente` (K reconstruido con **el motor activo en esa fecha** frente a la diferencia guardada). **Coherencia = el dato no ha cambiado desde la reconstrucción.** No demuestra que no hubiera cambios antes, ni que el saldo fuera exacto |
| Confirmación | `ninguna` / `confirmada` |

- **Ancla L solo con:** valor literal (o reconstruido) + perímetro `coincide_con_L` + confirmación.
- **Precisión `reconstruida`. Nunca «verificado».**
- **Una incoherencia** solo detecta que algo cambió (no dice qué) y **bloquea B1**.
- **Los cuadres con diferencia 0** no se guardaron: **no existen**. Solo `perfiles.ultima_reconciliacion` (el último) puede dar una atestación reconstruida.

---

## 9. Versionado y reproducibilidad (D66 (v4), D70 — PENDIENTES)

### 9.1 Dos ejes de tiempo

- **Tiempo económico** (`fecha`, `fecha_valor`, `fecha_valoracion`).
- **Tiempo de conocimiento** (`registrado_en`, `recibido_en`), **siempre con el reloj del servidor**.

### 9.2 Tres preguntas

| | Datos | Configuración | Motor | Garantía |
|---|---|---|---|---|
| **Q1** (qué calculaba Palanca en X) | Versiones y observaciones con tiempo de conocimiento ≤ X | La de X | El activo en X | **Exacta solo si:** posterior a la fase 1a, paquete archivado y `FORMATO_ENTRADA` = el actual o el anterior. Si no, **no se garantiza** |
| **Q1'** (lo conocido en X, con las reglas de hoy) | ≤ X | La de X | El actual | **Garantizada desde la fase 1a** |
| **Q2** (hoy sobre la fecha F) | Vigentes | La actual | El actual | Siempre (T2) |

**Explicar Q2 − Q1:** las versiones posteriores a X que afectan a ≤ F + los cambios de reglas del motor + los cambios de configuración.

### 9.3 Lo que se conserva

| Elemento | Íntegro | Por referencia |
|---|---|---|
| Versiones de hechos, asignaciones, atestaciones, valoraciones, avisos, observaciones y decisiones | Sí (base de datos, de solo añadir; **ninguna migración las reescribe**) | — |
| `config_versiones` | Sí | — |
| Paquete del motor por versión + manifiesto (commit, Node, plataforma, esbuild, hashes, resultado de las pruebas) | Sí (repositorio, rama de archivo) | — |
| Binario oficial de Node para Linux x64 + suma de comprobación | Sí (*release* de GitHub) | — |
| Dockerfile (solo texto, sin imagen) | Sí | — |
| Pruebas de referencia por paquete (entrada → salida) | Sí | — |
| **Instantánea de algo emitido:** entradas en `FORMATO_ENTRADA` (hechos vigentes, atestaciones, **valoraciones usadas**, configuración, `hoy`/τ, `tz`), resultado JSON | Sí | Hash del paquete, del lockfile, del binario de Node, del documento emitido; ids y hashes de las observaciones |

**Privacidad:** las instantáneas tienen datos personales. Van en una tabla del usuario con RLS, cifradas en reposo, dentro de las copias y **se borran con la supresión RGPD** (A3). Tamaño: de 10 a 200 KB comprimidas.

**Garantías:**
- **Volver a generar algo emitido:** exacto si el entorno se puede ejecutar. Es **condicionada:** archivar Node o un Dockerfile **no** garantiza que funcionen dentro de 10 años. La garantía principal son **las pruebas de referencia con cada actualización de Node**, que muestran que los resultados no dependen del entorno.
- **Q1 arbitraria:** condicionada (ver la tabla).
- **Antes de la fase 1a:** **no se garantiza** (solo la foto).

### 9.4 Archivar el motor v1 (procedimiento; requiere autorización)

1. **Confirmar en Vercel** el SHA y la versión de Node de producción [NC]. Según git: `origin/main` = `4d816bd`.
2. **Si hay cambios sin confirmar en la copia de trabajo:** parar e informar, sin tocarlos. **Trabajar siempre desde una copia limpia del SHA** (`git worktree`).
3. `npm ci` → apuntar la versión de Node y la de esbuild → `npm test` y `npm run lint` (incluida la prueba de que el paquete está al día).
4. **Archivar sin modificarlos:**
   - (a) `api/_motor.js`;
   - (b) un paquete del núcleo completo de `src/lib`, generado desde la línea de comandos **sin cambiar el repositorio**.
5. **v1 lee el reloj del sistema.** Para reproducirlo hace falta **una capa aparte, versionada y probada**, que fije la fecha (por ejemplo, un módulo que se precarga y sustituye `Date`). **No se toca el paquete v1.**
6. **sha256** → `motor/versiones/v1/` + manifiesto + etiqueta `motor-v1` **en una rama que no sea `main`**. El binario de Node, en una *release*.
7. **No hay push a `main`**, así que producción no se despliega [V: confirmar en Vercel que solo `main` despliega a producción].

---

## 10. Seguridad y entornos (requisitos para implementar; **no están cumplidos**)

| # | Condición | Estado |
|---|---|---|
| S1a | Copia de seguridad | Existe (21/11) |
| S1b | **Prueba real de restaurar** | **No hecha** |
| S1d | Copia **cifrada** y con retención (D32) | **No hecha** |
| S2 | Esquema real de producción, volcado y comparado | No hecho |
| S13 | Vercel Preview → **solo** a DEV | No hecho |
| S3–S6 | RLS, roles, funciones `SECURITY DEFINER` y funciones de Vercel revisadas | No hecho |
| S7 | `borrar_mi_cuenta` probado en DEV con las tablas protegidas (rol dedicado D28) | No hecho |
| S14 | Despliegue solo con CI en verde | No hecho |
| — | Migraciones en `supabase/migrations/` con vuelta atrás, primero en DEV | No existe |
| — | Pruebas de SQL (PostgreSQL local, dos usuarios) | No existen |

---

## 11. Experiencia de usuario

| Situación | Mensaje (en lenguaje sencillo) | Acción |
|---|---|---|
| Patrimonio parcial | «**A mercado: 4.000 €** de lo valorado al día» + «Falta: …» | Añadir lo que falta |
| Patrimonio completo | «Patrimonio verificado a 20/11» (+ «sin explicar: X €» si lo hay) | — |
| Saldo | «Cuadra» · «Podría cuadrar» · «No comprobado» · «Discrepancia detectada», con colores y textos distintos | Ver el tramo |
| Posible duplicado | «¿Es el mismo gasto que apuntaste el 03/11?» | Sí / No |
| Coste desconocido | «Cobrado sin coste conocido: 1.000 €. Para calcular lo que ganaste, falta lo que te costaron» | Añadir coste |
| Valoración desfasada | «Sin precio actual: X (último: 250 € el 13/11)» | Actualizar el precio |
| Rentabilidad que no se puede calcular | «Faltan compras anteriores a 05/2023 para calcular la rentabilidad» | — |
| Error de importación | «12 filas sin fecha: no se han importado» + la lista | Corregir y volver a subir |
| Confirmar un saldo antiguo | «¿Tenías 1.800 € entre banco y bróker el 30/06? (lo sacamos de tu cuadre de entonces)» | Confirmar / No lo sé |

**Regla:** en Inicio, como mucho **una** línea de «por revisar». Todo lo demás, en el detalle de la cuenta o de la posición.

---

## 12. Contratos y pruebas

### 12.1 El contrato del núcleo (D70)

```
calcular(entrada: FORMATO_ENTRADA vN, parametros: {hoy, tau, tz}) → salida
  entrada  = { hechos_vigentes[ {id, version, tipo_evento, fecha, lados[{cuenta, importe_centimos, fecha_valor?, estado_liquidacion}], asignacion?} ],
               atestaciones[], valoraciones[], avisos[], config }
  salida   = { por_cuenta{K, L, T, AL, P, R, tramos[{r | R_posibles, estado}]}, B, PCq{exacto|rango|cota},
               PM{aldia, estimado, pendientes[]}, flujos, realizado{conocido, RND, CSC}, cobertura[], version_motor }
```

- **Prohibido en el núcleo:** el reloj, `Intl`, la entrada y salida, la coma flotante en los importes y los límites de tiempo.

### 12.2 Pruebas críticas

Identificadores recuperados de los informes; el detalle completo está en la MATRIZ.

| ID | Entrada | Resultado esperado | Propiedad |
|---|---|---|---|
| I17 | Cualquier lista de la Fase 1 | `deducirTipo` + motor nuevo = `bolsas()` de v1 | Compatibilidad |
| C1 | Fuzz: atestaciones, correcciones y operaciones tardías | AL = L + R; P = K + R | Teoremas |
| C5' | n ≤ 12 | R_posibles = fuerza bruta | Conjunto exacto |
| G1–G4 | Unidades del mismo importe con o sin restricciones | Se agrupan solo si son intercambiables; si C se pasa del límite → no comprobado | Agrupación segura |
| T1 | Ancla exacta, aproximada sin confirmar, exacta | Un solo tramo | Sin ancla no hay independencia |
| I-G1…G7 | Grupos FIFO | Coste y cobros una sola vez; identidad PCq = B + RND + CSC | FIFO |
| D61-1 | Compra 1.000 → 1.020 → 1.050 | B 2.250 / 2.236 / 2.215 | Versionado |
| A1, Z1, Z2 | Aviso tardío; zonas horarias; horario de verano | §7.2–7.3 | Q1 sin información futura |
| R1a–c | Ajustes R1 | Coherencia ≠ exactitud; perímetro | D71 |
| S1, R1, R8 | Volver a generar algo emitido; Q1 repetida; migración | Idénticos; ninguna fila de versiones modificada | Reproducibilidad |
| RGPD-1 | Supresión con las tablas protegidas | 0 filas en todas las tablas, instantáneas incluidas | A3 |
| RLS-1 | El usuario B, con ids de A | Error de clave foránea compuesta o de RLS | Aislamiento |

---

## 13. Plan de implementación (orientativo; cada fase tiene una puerta de salida)

Con 8–12 horas a la semana. **Las semanas son estimaciones, no un compromiso.**

| # | Fase | Contenido | Puerta de salida | Estimación |
|---|---|---|---|---|
| 0 | Seguridad | S1b, S1d, S2, S13, S3–S7, S14 | Restauración probada; Preview → DEV | 2–4 semanas (parte depende del usuario) |
| 0b | Archivo de v1 + documentación en el repositorio (D60) | §9.4 | Hashes y pruebas de referencia en el CI | 1 semana |
| 1a | Integridad | Versiones, escrituras por funciones, sin borrados, rol RGPD | Pruebas de SQL + RGPD-1 | 3–5 semanas |
| 1b | Coherencia | Céntimos canónicos, claves foráneas compuestas, `tipo_evento` + `deducirTipo`, núcleo sin reloj (D70) | I17 en verde | 3–4 semanas |
| 1c | Cuentas, pasivos y tarjeta | Cuentas, L, transferencias, tres formularios | Foto igual (reparto aparte) | 4–6 semanas |
| 1d | Inversiones | Lotes, FIFO demostrado (D69), coste desconocido, D61 | I-G, D61-1 | 4–6 semanas |
| 1e | Saldos | Atestaciones, residuos, etiquetas, logros migrados | C1–C12 | 4–6 semanas |
| 1f | Ingesta y conciliación | Observaciones, vínculos, lotes de ingesta, importadores actuales | Pruebas de vínculos y de duplicados | 4–6 semanas |
| M | Migración de usuarios reales | §8, primero en DEV | A7 por usuario | 2–3 semanas |
| UX | Inicio y detalle | §11 | e2e | 3–4 semanas |
| B | Beta privada | Pocos usuarios | Sin incidentes de cifras | 4+ semanas |
| L | Lanzamiento | — | — | — |
| P | Posteriores | Valoraciones (A4), escenarios FIFO (D54 v3), H y fiscal (D56, asesor), Sheets B, Open Banking, multidivisa | — | — |

---

## 14. Autoauditoría

| # | Pregunta | Respuesta | Explicación (sección) |
|---|---|---|---|
| 1 | ¿Hay alguna cifra patrimonial que pueda duplicarse o desaparecer? | **No** en el diseño | Identidades PCq = B + RND + CSC (§4.3) y P = K + R (§4.4); eliminar duplicados antes de conciliar (§6.3). **Depende de las pruebas** I-G y C1 |
| 2 | ¿Algún coste desconocido se trata como cero? | **No** | §5.3, A5 |
| 3 | ¿Se confunde patrimonio con rentabilidad? | **No** | §4.3 (B, PCq, PM) frente a realizado, RND y rentabilidad (§5.6) |
| 4 | ¿Se puede afirmar que una cuenta cuadra sin suficiente evidencia? | **No** | «Cuadra» exige U' vacío, sin hipótesis, ancla válida y r = 0 (§6.3) |
| 5 | ¿Alguna corrección destruye información? | **No** desde la fase 1a. **Antes:** los borrados físicos del pasado **ya** la destruyeron | §8.2, punto 3 |
| 6 | ¿Q1 usa información posterior? | **No** | Filtros por tiempo de conocimiento (§7.3, §9.2) |
| 7 | ¿Hay cálculos que dependan del reloj o del dispositivo? | **Sí, hoy** (v1, §1.1). **No** en la V3.3 (D70) | v1 necesita la capa que fija la fecha (§9.4) |
| 8 | ¿La migración inventa información? | **No** | R3 sin cambios; el saldo del alta, aproximado; las correcciones B, con pruebas (§8) |
| 9 | ¿Se confunde alguna propuesta con una decisión aprobada? | **No** | Solo 4 aprobadas (§0.4) |
| 10 | ¿Se presenta alguna garantía técnica sin demostrar? | **No demostrable** para la reproducibilidad a 10 años | Se presenta como **condicionada** (§9.3) |
| 11 | ¿Es razonable para una sola persona? | **Sí, con condiciones** | D69 (sin escenarios en la fase 1), sin Docker, sin tablas de versiones del motor; plan en §13 |
| 12 | ¿La experiencia sigue siendo sencilla? | **No demostrable** sin pruebas con usuarios | §11 limita los avisos, pero hay que probarlo |
