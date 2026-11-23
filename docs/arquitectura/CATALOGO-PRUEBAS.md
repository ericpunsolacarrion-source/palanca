# Catálogo de pruebas del motor (consolidado, **ninguna ejecutada**)

**Estado de todas las pruebas de este catálogo: NO EJECUTADAS.** Son especificaciones de los documentos y de las auditorías conservados en `docs/arquitectura/`. Ninguna existe todavía como código, salvo las pruebas actuales del repositorio (`src/lib/*.test.js`, `tests/api`, `tests/e2e`), que **no** forman parte de este catálogo.

**Cómo leerlo:**
- Cada bloque reproduce **literalmente** una tabla de pruebas de su fuente (con el enlace al archivo).
- **Los identificadores se repiten entre fuentes** (por ejemplo, `A1` es una prueba de atestaciones en el Cierre 1 y una de avisos en el Cierre 3; `I1` existe en la V3 y en el Contraste 4). **Una prueba se identifica siempre por fuente + ID.**
- **Definida:** la tabla da la entrada y el resultado esperado (o el caso con sus cifras).
- **Definición parcial:** la tabla solo describe la propiedad, sin una entrada concreta.

## Índice de fuentes

| Fuente | Archivo | Filas | Tipo de definición |
|---|---|--:|---|
| V3.2, §3 (ejemplos numéricos N1–N9) | [`v3.2/ARQUITECTURA-V3.2.md`](v3.2/ARQUITECTURA-V3.2.md) | 9 | Definida (entrada y esperado) |
| V3, §17 (invariantes) | [`v3/ARQUITECTURA-V3.md`](v3/ARQUITECTURA-V3.md) | 20 | Definición parcial (descripción de la propiedad) |
| V3, §18 (escenarios) | [`v3/ARQUITECTURA-V3.md`](v3/ARQUITECTURA-V3.md) | 30 | Definida (entrada y esperado) |
| Auditoría 3 de D34 (casos de atestaciones individuales y agregadas) | [`auditorias/2026-11-22_D34-auditoria-3.md`](auditorias/2026-11-22_D34-auditoria-3.md) | 6 | Definida (entrada y esperado) |
| Auditoría 3 de D34 (escenarios de etiquetas) | [`auditorias/2026-11-22_D34-auditoria-3.md`](auditorias/2026-11-22_D34-auditoria-3.md) | 5 | Definición parcial (descripción de la propiedad) |
| Informe de reanudación (escenarios B-1 a B-10) | [`auditorias/2026-11-23_reanudacion_ANONIMIZADO.md`](auditorias/2026-11-23_reanudacion_ANONIMIZADO.md) | 11 | Definida (entrada y esperado) |
| Contraste 3 | [`auditorias/2026-11-23_contraste-3.md`](auditorias/2026-11-23_contraste-3.md) | 11 | Definición parcial (descripción de la propiedad) |
| Contraste 4 | [`auditorias/2026-11-23_contraste-4.md`](auditorias/2026-11-23_contraste-4.md) | 10 | Definición parcial (descripción de la propiedad) |
| Contraste 5 | [`auditorias/2026-11-23_contraste-5.md`](auditorias/2026-11-23_contraste-5.md) | 14 | Definición parcial (descripción de la propiedad) |
| Cierre 1 | [`auditorias/2026-11-23_cierre-1.md`](auditorias/2026-11-23_cierre-1.md) | 9 | Definición parcial (descripción de la propiedad) |
| Cierre 2 | [`auditorias/2026-11-23_cierre-2.md`](auditorias/2026-11-23_cierre-2.md) | 9 | Definición parcial (descripción de la propiedad) |
| Cierre 3 | [`auditorias/2026-11-23_cierre-3.md`](auditorias/2026-11-23_cierre-3.md) | 16 | Definida (entrada y esperado) |
| Auditoría de cierre de la V3.3 | [`auditorias/2026-11-23_auditoria-cierre-V3.3.md`](auditorias/2026-11-23_auditoria-cierre-V3.3.md) | 12 | Definida (entrada y esperado) |
| V3.3.1, §12.2 | [`v3.3.1/ARQUITECTURA-V3.3.1-BORRADOR.md`](v3.3.1/ARQUITECTURA-V3.3.1-BORRADOR.md) | 31 | Definida (entrada y esperado) |

## Pruebas descritas solo en prosa (sin tabla)

| Fuente | Dónde | Contenido | Estado |
|---|---|---|---|
| V3.2 | §3, después de la tabla N (I21–I25) | 5 invariantes descritas en una frase cada una | Definición parcial |
| Auditoría 2 de D34 | §§1–5 (ejemplos T1–T5 de transferencias, conversión del saldo inicial, migración de ajustes) | Ejemplos numéricos completos, sin identificador de prueba | Definida como ejemplo; **sin identificador**: pendiente de asignarle uno |
| Contraste 1 | Conclusión, punto 4 | «B-4a/B-4b con versiones (incluida la comprobación de H4), los dos órdenes FIFO, el grupo indeterminado y la venta con retención» | **Pendiente de definir** (solo enumeradas) |
| Contraste 2 | Tabla final, columna «Pruebas necesarias» | Referencias a ejemplos de sus secciones 1–5 | Definición parcial |

## Identificadores sin ninguna definición localizable

Al revisar las fuentes conservadas, **todos** los identificadores que cita la `MATRIZ-DECISIONES-V3.3.1.md` tienen al menos una definición parcial en alguna fuente de este catálogo, con estas excepciones, que se dejan **pendientes**:
- `H4` (como prueba): solo aparece en prosa en el Contraste 2 («ningún apunte cambia sin una versión») → **definición pendiente**;
- `N2` y `N8`: son filas de la tabla N de la V3.2 (ejemplos numéricos), no pruebas automatizadas → **falta convertirlas** en pruebas.
- «Rejilla R3» (A7): descrita en prosa en la Auditoría 3 de D34 y en el informe de reanudación, sin casos concretos → **definición pendiente**;
- `tools/list` (D6): definida en la arquitectura v2, que **no** se conserva en el repositorio (contiene datos personales) → **definición pendiente** de transcribir sin datos personales.

---

## V3.2, §3 (ejemplos numéricos N1–N9)

Fuente: [`v3.2/ARQUITECTURA-V3.2.md`](v3.2/ARQUITECTURA-V3.2.md) · **Estado: no ejecutada**

| # | Caso | Δ a coste | Δ a mercado | Comprobación |
|---|---|--:|--:|---|
| N1 | Transferencia de 500 € desde una cuenta sin saldo inicial a una verificada (2.1.3) | 0 | 0 | E4 ✓. Con la exclusión total serían +500 ✗ |
| N2 | Compra de 1.000 € de un fondo sin valorar (K4) | 0 | 0 | La compra es la valoración de ese día ✓ |
| N3 | La valoración de N2 caduca a los 31 días (D35) | 0 | −1.000 | No es una pérdida; es la cobertura: «Fondo Z sin valoración al día» ✓ |
| N4 | Venta total sin coste, 1.000 € (2.2.2) | 0 | 0 | Sin aumento artificial ✓ |
| N5 | Después se indica un coste de 700 € | +700 el día del lote, y +300 de realizado el día de la venta | 0 | Final 3.000 = 2.700 + 300 ✓ |
| N6 | Venta parcial sin coste, 400 € (2.2.3) | 0 | 0 | ✓ |
| N7 | Venta mixta, 840 € (2.2.4) | +40 | 0 | Δ a coste = el realizado calculable ✓ |
| N8 | Compra de 100 € con tarjeta y su pago (v3.1, 5.3) | −100 y luego 0 | −100 y luego 0 | Un solo gasto ✓ |
| N9 | Contable 1.000 / disponible 850 / pendientes 150 (v3.1, 5.6) | Usa 1.000 | Usa 1.000 | Disponible = 850, solo explica ✓ |

## V3, §17 (invariantes)

Fuente: [`v3/ARQUITECTURA-V3.md`](v3/ARQUITECTURA-V3.md) · **Estado: no ejecutada**

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

## V3, §18 (escenarios)

Fuente: [`v3/ARQUITECTURA-V3.md`](v3/ARQUITECTURA-V3.md) · **Estado: no ejecutada**

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

## Auditoría 3 de D34 (casos de atestaciones individuales y agregadas)

Fuente: [`auditorias/2026-11-22_D34-auditoria-3.md`](auditorias/2026-11-22_D34-auditoria-3.md) · **Estado: no ejecutada**

| # | Caso | Datos | Resultado |
|---|---|---|---|
| 1 | Agregada y después individuales | 30/06: comprobación {B,T} = 1.800; K_B = 1.300 y K_T = 500, sin atestaciones. 31/07: atestaciones B = 1.250 y T = 500 | 30/06: dif = 1.800 − (1.300 + 500) = **0**. 31/07: r_B = 1.250 − 1.300 = −50 y r_T = 0 → PA = **1.750**, PC = 1.800, ΣR = −50 ✓. La comprobación del 30/06 **no cambia**: las atestaciones posteriores no afectan al pasado (D40) |
| 2 | Individuales y después agregada | 01/06: B = 1.000 y T = 400 (r = 0). 30/06: comprobación {B,T} = 1.300 | PA = **1.400** (no cambia); dif = 1.300 − 1.400 = **−100**, que se muestra. **La agregada no se usa para corregir la cifra**: es el precio de no tener ambigüedad (D48) |
| 3 | Conjuntos que se solapan en parte | Comprobaciones {B,T} = 1.300 y {T,C} = 900, con Anc: B 1.000 · T 400 · C 600 | dif₁ = −100 y dif₂ = −100. PA = 1.000 + 400 + 600 = **2.000**: cada bolsa una vez. Las dos diferencias **no se suman** (comparten T) |
| 4 | Se corrige una individual y existe una agregada | B del 01/06 pasa de 1.000 a 950 (versión 2) | Anc_B = 950; dif del caso 2 = 1.300 − 1.350 = **−50**. La versión 1 se conserva (H6) |
| 5 | Dos comprobaciones contradictorias que comparten una cuenta | Las del caso 3 | Las dos se muestran; el patrimonio no cambia; el usuario puede resolverlas con atestaciones individuales |
| 6 | Una cuenta entra en un conjunto o sale de él | Se archiva C | Las comprobaciones antiguas guardan su `cuenta_ids` del momento y no se recalculan con otra composición |

## Auditoría 3 de D34 (escenarios de etiquetas)

Fuente: [`auditorias/2026-11-22_D34-auditoria-3.md`](auditorias/2026-11-22_D34-auditoria-3.md) · **Estado: no ejecutada**

| # | Escenario | Lo que se ve |
|---|---|---|
| 1 | Todos los residuos son 0, pero hay cuentas sin atestación | Cuentas atestadas: «verificado el …». Patrimonio: «**de lo que conoces**» («2 cuentas sin verificar»). **No sale «cuadran»**, porque la cobertura no es completa ((iii) se cumple, pero (i) no en todas) |
| 2 | Todas las cuentas declaradas atestadas, pero con residuos | «Patrimonio verificado a dd/mm» **solo si** las fechas coinciden, **y** «**sin explicar: X €**». **No sale «cuadran».** |
| 3 | Una cuenta con atestación reciente y otra antigua | Cada cuenta con su fecha; la antigua, «desactualizada» si pasa de 31 días; patrimonio: «**saldos de fechas distintas**» |
| 4 | El usuario no ha confirmado que estén todas sus cuentas | «De lo que conoces»; nunca «Patrimonio verificado» ni «tus cuentas cuadran» |
| 5 | Un residuo de un tramo antiguo y el último saldo verificado | Cuenta: «Saldo verificado el 31/10 · **sin explicar: 200 € (1 tramo, de 09/2026)**». **No sale «cuadrada».** |

## Informe de reanudación (escenarios B-1 a B-10)

Fuente: [`auditorias/2026-11-23_reanudacion_ANONIMIZADO.md`](auditorias/2026-11-23_reanudacion_ANONIMIZADO.md) · **Estado: no ejecutada**

| # | Escenario | Apuntes | Comprobación | Estado |
|---|---|---|---|---|
| B-1 | Venta total sin coste, 1.000 | Psc → Ef: 1.000 | Δ coste = +1.000 − 1.000 = 0 | Demostrado (V3.2 §2.2.2) |
| B-2 | Venta parcial, 4 de 10, por 400 | Psc → Ef: 400 | Δ = 0 · mercado 2.400 + 600 = 3.000 = antes | Demostrado |
| B-3 | Venta mixta, 7 a 120 (L0: 5 sin coste · L1: 5 por 500) | Psc → Ef: 600 · P → Ef: 200 · E → Ef: 40 | Δ = 840 − 200 − 600 = +40 = realizado | Demostrado |
| B-4a | Se descubre el coste en la venta **parcial** (800 por 10) | E → P: 800 (fecha del lote) · P → Ef: 320 · E → Ef: 80 | Ef 2.400 · P 480 · A coste 2.880 = 2.000 + 800 + 80 | **Resuelto aquí** (antes solo estaban las cifras) |
| B-4b | Se descubre el coste en la venta **mixta** (L0 = 450 por 5) | E → P: 450 (fecha de L0) · venta: K = 450 + 200 = 650 → P → Ef: 650 · E → Ef: 190 | Antes de la venta: P = 950. Después: Ef 840 + P 300 = 1.140 → Δ = +190 = 840 − 650 ✓ | **Resuelto aquí** (no existía) |
| B-5 | Corrección retroactiva de un coste conocido | Versión nueva del lote → por A1 se recalculan todas las ventas que lo consumieron (T3) | Si afecta a un ejercicio cerrado, aviso (V3 §9.5) | Resuelto (mecanismo de la V3) |
| B-6 | FIFO entre lotes conocidos y sin coste | Propuesta **D54** | — | PENDIENTE |
| B-7 | Traslado entre plataformas | `traslado_posicion`: los lotes llevan su fecha, coste y **estado de coste**. **La Psc de ventas ya hechas se queda en la cuenta donde se vendió** | Neutro (E4) | Depende de **D55** |
| B-8 | Comisión en la venta mixta (7 €) | R neto = 833, repartido por unidades (P4): L0 595 · L1 238 → Psc → Ef: 595 · P → Ef: 200 · E → Ef: 38 | Δ = 833 − 200 − 595 = +38 = realizado neto ✓ | **Resuelto aquí**; la retención en reembolsos de fondos, **D56** |
| B-9 | Coste que nunca se llega a conocer | La Psc negativa se queda **para siempre**; es correcta (§8). El usuario puede marcar «no lo sabré» (`decisiones`): **no cambia ningún número**, solo deja de pedírselo | Sin cambios | Resuelto |
| B-10 | Aportado «conocido» negativo | Aportado conocido = Σ transferencias entrantes − salientes de las cuentas de inversión, mostrado con «+ anteriores desconocidas» si hay lotes sin coste o cuentas sin saldo inicial | — | Resuelto (definición) |

## Contraste 3

Fuente: [`auditorias/2026-11-23_contraste-3.md`](auditorias/2026-11-23_contraste-3.md) · **Estado: no ejecutada**

| # | Prueba |
|---|---|
| I-G1 | En cada escenario: Σ coste consumido + coste restante = Σ coste conocido de los lotes |
| I-G2 | Ef = Σ R de todas las ventas (cada una una vez), en todas las versiones vigentes |
| I-G3 | PC_s = B + RND_s + CSC en cada escenario y en cada fecha |
| I-G4 | **Comprobación global:** realizado total = Σ cobrado − Σ coste consumido (habría detectado el error de 130 €) |
| I-G5 | Grupo cerrado: Σᵢ rᵢˢ es igual en todos los escenarios = el resultado sin asignar de D65 |
| I-G6 | Ninguna PC se presenta como exacta si hay más de un valor distinto entre los escenarios |
| I-G7 | Al determinarse un orden, RND pasa a realizado conocido sin duplicarse (H3) |
| I-H1 | En los tres resultados de la declaración, el patrimonio final es igual en A y en B, y H acaba siempre en 0 tras la declaración |
| I-V1 | Mostrado = K + R con la base de valor; T = K − K_v |
| I-V2 | Un lado sin `fecha_valor` dentro de un tramo atestado → no hay anclado único (variante 1 del día 30) |
| U | Unitarias: los 7 pasos de la sección 1, D65 A/B, la tabla de H y las variantes 1 y 2 de la sección 4 |

## Contraste 4

Fuente: [`auditorias/2026-11-23_contraste-4.md`](auditorias/2026-11-23_contraste-4.md) · **Estado: no ejecutada**

| # | Prueba |
|---|---|
| I1–I5 | Las identidades de §1.3 (fuzz con lotes sin coste y orden indeterminado) |
| I6 | PCq ≤ PC total en cualquier asignación de Uⱼ ≥ 0 (cota inferior) |
| I7 | PM es igual en todos los escenarios (no depende del orden) |
| I8 | Impuesto = Σ *impuesto_definitivo*; Ef → H nunca cuenta como impuesto; H = 0 después de cada liquidación |
| I9 | El reparto de la liquidación del IRPF no cambia el patrimonio |
| I10 | P_b = AL_b + T_b = K_b + R_b; el residuo solo usa L |
| I11 | Si no se conoce la liquidación de un lado dentro de un tramo atestado → el residuo es un conjunto y no hay una cifra única |
| I12 | La pregunta 1 de §4, ejecutada dos veces (y después de desplegar otro motor), da lo mismo |
| I13 | Desplegar un motor con diferencias sin registro ni aviso → la prueba del CI falla |
| U | S3 y S3' (X/Y), los ejemplos de §2 (156,05; 300 con y sin reparto) y la compra y la venta de §3 antes y después del extracto |

## Contraste 5

Fuente: [`auditorias/2026-11-23_contraste-5.md`](auditorias/2026-11-23_contraste-5.md) · **Estado: no ejecutada**

| # | Prueba |
|---|---|
| V1 | Nunca se usa un precio con `momento_precio` > D para valorar en D |
| V2 | Un precio desfasado nunca entra en PM_aldia (fuzz de fechas) |
| V3 | PM_estimado nunca se suma a PM_aldia |
| C1 | AL = L + R y P = K + R (fuzz con varias atestaciones, correcciones y operaciones tardías) |
| C2 | P2: corregir A_k deja igual R(D ≥ t_{k+1}) |
| C3 | P3: una operación tardía solo cambia el r de su tramo |
| C4 | Volver a importar un extracto no crea hechos nuevos; un +500 manual confirmado por el extracto aparece una vez en L |
| C5 | La regla de inclusión: el intervalo contiene el r real en todos los casos posibles de 2ⁿ (comprobado por fuerza bruta con n ≤ 10) |
| C6 | Una transferencia con valores distintos: Σ K y Σ P sin cambios; Σ T = el dinero en camino |
| R1 | Q1 repetido (también después de desplegar otro motor) = el mismo resultado byte a byte |
| R2 | El núcleo sin reloj: el mismo resultado con relojes del sistema distintos |
| R3 | Las pruebas de referencia de cada paquete archivado, en el CI |
| R4 | Un cambio de motor con diferencias y sin entrada en `versiones.json` → el CI falla |
| R5 | Un informe emitido: el hash se comprueba con Q1 |

## Cierre 1

Fuente: [`auditorias/2026-11-23_cierre-1.md`](auditorias/2026-11-23_cierre-1.md) · **Estado: no ejecutada**

| # | Prueba |
|---|---|
| C5' | R_posibles calculado = el conjunto obtenido por fuerza bruta (n ≤ 12); «puede cuadrar» nunca es cierto si 0 ∉ R_posibles |
| C7 | Las unidades de liquidación: un hecho y su comisión vinculada nunca se separan en el conjunto |
| C8 | Un tramo con una propuesta de duplicado sin resolver no da residuo |
| C9 | Con \|U'\| > 20: nunca sale «puede cuadrar» |
| A1 | Un saldo calculado nunca se guarda como atestación; extracto con inicial y final: la comprobación interna |
| V4 | E(D) con ritmo semanal o mensual y retraso; un `ritmo_desconocido` nunca está al día |
| V5 | Una valoración parcial o inconsistente nunca hace determinable el PM |
| F1 | Lotes que se solapan → la asignación queda pendiente; nunca hay realizado con un orden no demostrado |
| R6 | La misma Q1 con dos zonas horarias del sistema distintas da el mismo resultado; una migración de esquema no cambia ninguna fila de versiones |

## Cierre 2

Fuente: [`auditorias/2026-11-23_cierre-2.md`](auditorias/2026-11-23_cierre-2.md) · **Estado: no ejecutada**

| # | Prueba |
|---|---|
| C10 | Partir en dos mitades = recorrerlo todo (fuzz, n ≤ 16); con n ≤ 30, «puede cuadrar» es correcto |
| C11 | El resultado no depende del aparato: la misma salida en un móvil lento y en un ordenador (no hay límites de tiempo) |
| C12 | Conciliación condicional: cada hipótesis da su conjunto; los tramos posteriores no cambian (P1) |
| A2 | R1: la comprobación literal = K_entonces (v1) + la diferencia detecta una incoherencia si se borra un movimiento anterior |
| A3 | R2 nunca ancla sin confirmación; nada `reconstruida` da «verificado» |
| V6 | E(D): el caso lunes / martes / miércoles / jueves; un aviso con fecha nueva desplaza pp; sin fecha, no la desplaza |
| V7 | Una fuente que no publica nunca mantiene «al día» más allá de la siguiente pp |
| R7 | Una instantánea emitida, ejecutada con el paquete y el Node archivados, da el resultado y el hash guardados |
| R8 | Una migración no cambia ni borra ninguna fila de versiones |

## Cierre 3

Fuente: [`auditorias/2026-11-23_cierre-3.md`](auditorias/2026-11-23_cierre-3.md) · **Estado: no ejecutada**

| ID | Entrada | Resultado esperado | Propiedad que demuestra |
|---|---|---|---|
| G1 | 3 unidades sueltas de −100 + 1 de −250 | Las sumas con grupo = las sumas sin grupo | Agrupar unidades intercambiables no cambia el conjunto |
| G2 | 2 de −100, una de ellas en una hipótesis de duplicado | **No** se agrupan; el conjunto respeta la hipótesis | Condición 5 |
| G3 | −100 con una cota de fecha de valor + −100 sin cota | No se agrupan | Condición 3 |
| G4 | C = 2³⁰ + 1 | Rango «sin comprobar»; nunca «cuadra» | Límite estructural |
| T1 | Ancla exacta en t₁, aproximada sin confirmar en t₂, ancla exacta en t₃ | El tramo (t₁, t₃] se calcula como uno solo | La independencia exige un ancla válida |
| T2 | Duplicado en el tramo k; anclas válidas | r_{k+1} y AL(≥ t_k) iguales con las dos hipótesis | La propagación queda acotada |
| R1a | Nota «banco 1.500 + bróker 300», datos sin cambios | Coherencia `comprobada`; perímetro `declarado`; no ancla sin confirmación | Coherencia ≠ exactitud |
| R1b | El mismo caso con un movimiento anterior borrado | `incoherente`; sin causa asignada; B1 bloqueada | Solo detecta |
| R1c | La misma, confirmada, pero el usuario tenía también una cuenta de ahorro | Perímetro ≠ L → solo informativa | Perímetro |
| Z1 | El mismo cálculo con el dispositivo en UTC y en Europe/Madrid | Idéntico | Sin depender del dispositivo |
| Z2 | Fuente en America/New_York con pp el martes; τ = miércoles 05:00 Madrid | Todavía no ha pasado (fin del martes en Nueva York = miércoles 06:00 Madrid) | Zona horaria de la fuente |
| A1 | El ejemplo del aviso de B3 | Q1(jueves) desfasada · Q1(viernes) y Q2(jueves) al día | Q1 no usa información futura |
| A2 | Un aviso rectificado por otro | Manda el último; los dos quedan guardados | Inmutabilidad |
| S1 | Volver a generar una instantánea emitida | El resultado y el hash son idénticos | Reproducción de lo emitido |
| S2 | Q1 con un motor de `FORMATO_ENTRADA` −2 | Responde «no garantizada» | No promete de más |
| V1a | El procedimiento de v1 con el repositorio con cambios | Se para sin modificar nada | Seguridad del procedimiento |

## Auditoría de cierre de la V3.3

Fuente: [`auditorias/2026-11-23_auditoria-cierre-V3.3.md`](auditorias/2026-11-23_auditoria-cierre-V3.3.md) · **Estado: no ejecutada**

| ID | Entrada | Esperado | Propiedad |
|---|---|---|---|
| D61-2 | Caso (a) frente a caso (b) de §2.1 | (a): Ef 1.930 desde el 10/01 · (b): Ef 1.000 del 10 al 11/01 y 980 desde el 12/01 | Corregir ≠ pago adicional |
| B-4a' | §2.2 completo | B 2.000 → 2.880; C 2.400 en las dos versiones | Sin duplicidades |
| ID-1 | Fuzz con grupos, lotes sin coste, H, pasivos y transferencias | PCq^libro = B + RND + CSC en todo escenario | La identidad (base del libro) |
| ID-2 | Lo mismo con atestaciones y R ≠ 0 | PCq^mostrado = B + ΣR + RND + CSC | Dominio de la identidad |
| ET-1 | Tramo entre dos atestaciones manuales confirmadas, con r = 0 | «Coincide con el saldo que indicaste», **no** «Cuadra» | Evidencia declarada |
| ET-2 | Saldo manual confirmado | Nunca «verificado» | D51 |
| MEM-1 | Variables con oᵢ que no caben en 2¹⁶ + 2¹⁶ | «No comprobado» en dos máquinas distintas | Determinismo |
| MEM-2 | Σ\|x\| > 2⁵³ | «No comprobado» | Exactitud |
| MEM-3 | 2¹⁶ + 2¹⁶ sumas | Memoria máxima ≤ 2 MB (medida) | La cota |
| GAR-1 | Q1' con una migración que reescribe una versión (simulado) | La prueba R8 falla | La condición de Q1' |
| PM-0a / PM-0b | La app sin la capa de valoraciones | `PM = null`; ninguna etiqueta «mercado» | La puerta |
| L-1 | Migrar una compra de la Fase 1 a L | Cumple la restricción | §2.8 |

## V3.3.1, §12.2

Fuente: [`v3.3.1/ARQUITECTURA-V3.3.1-BORRADOR.md`](v3.3.1/ARQUITECTURA-V3.3.1-BORRADOR.md) · **Estado: no ejecutada**

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
| D61-2 | Caso (a) frente a caso (b) de §5.4 | (a): Ef 1.930 desde el 10/01 · (b): Ef 1.000 el 10–11/01 y 980 desde el 12/01 | Corregir ≠ pago adicional |
| B-4a' | §5.3 completo | B 2.000 → 2.880; C 2.400 en las dos versiones | Sin duplicidades |
| AP-1 | §5.7, ejemplo 1 | P = 800 (no 1.600); el anclado igual a lo que se mostraba | La apertura no se duplica |
| AP-2 | §5.7, ejemplo 2, «No lo sé» | B = 5.000; E → P pendiente | No se inventa capital |
| ID-1 | Fuzz con grupos, lotes sin coste, H, pasivos y transferencias | PCq^libro = B + RND + CSC | La identidad (libro) |
| ID-2 | Lo mismo con atestaciones (R ≠ 0) | PCq^mostrado = B + ΣR + RND + CSC | Dominio de la identidad |
| ET-1 | Tramo entre dos anclas declaradas confirmadas, con r = 0 | «Coincide con el saldo que indicaste» | Evidencia declarada ≠ verificación |
| ET-2 | Saldo manual confirmado | Nunca «verificado» | D51 v2 |
| ET-3 | Anclas documentales, pero una con `disponible`, o de otra cuenta, o un extracto sin comprobación interna | «No comprobado», no «Cuadra con tu banco» | Condiciones 1–4 |
| ET-4 | Una cuenta con «Cuadra con tu banco» y completitud sin declarar | La cabecera del patrimonio no dice «verificado» | Tramo ≠ patrimonio |
| MEM-1 | Variables cuyas mitades no caben en 2¹⁶ | «No comprobado», el mismo en dos máquinas distintas | Determinismo |
| MEM-2 | Σ\|x\| > 2⁵³ − 1 | «No comprobado» | Exactitud |
| PERF-1 | **Peor caso:** las dos mitades llenas (2¹⁶) con valores aleatorios | Medir el tiempo y la **memoria total del proceso** en un móvil modesto y en un ordenador | **Pendiente en DEV**: fija el presupuesto |
| PERF-2 | 100 tramos con U' calculados seguidos | Memoria máxima ≈ la de un tramo (se reutiliza) | Pendiente en DEV |
| PERF-3 | m = 3 (8 ejecuciones) en el peor caso | Medir | Pendiente en DEV |
| PERF-4 | La caché: repetir la consulta | Sin volver a calcular; el mismo resultado | Pendiente en DEV |
| GAR-1 | Una migración simulada que reescribe una versión | R8 falla | La condición de Q1 y Q1' |
| PM-0a / PM-0b | La app sin la capa de valoraciones | `PM = null`; ninguna etiqueta «mercado» | Puerta PM-0 |
| L-1 | Migrar una compra de la Fase 1 a L | Cumple la restricción | §8.2, punto 4 |
