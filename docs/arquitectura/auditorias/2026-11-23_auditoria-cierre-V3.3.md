Antes de responder he releído el borrador V3.3 (§4–§13 y la autoauditoría), la matriz de decisiones, `MOTOR.md` y el SQL del repositorio. **No he modificado nada:** ni los tres documentos, ni el repositorio. Las correcciones van en este mensaje, listas para aplicarlas cuando lo autorices.

## 1. Tabla de resultados

| # | Sección | Tipo | Resumen |
|---|---|---|---|
| E1 | §5.4 (D61) | **Error de especificación** | Las cifras cuadran, pero el ejemplo no dice **qué** se corrige. El cambio de efectivo solo es correcto si se corrige **lo que se pagó** en la compra. Faltaba distinguirlo de un **pago adicional posterior** |
| E2 | §5.3 | **Error** (dato que falta) | El efectivo final (2.400) supone 2.000 € de partida que no se mencionan, y falta el estado anterior a la corrección |
| E3 | §4.3 (A6) | **Error material** | PCq se definía con el efectivo **proyectado** P_b (que incluye los residuos) y **sin la bolsa H**, mientras que B se calcula sobre el libro. Así, **PCq = B + RND + CSC es falso** cuando ΣR ≠ 0 o H ≠ 0 |
| E4 | §6.2 y §4.3 (D51 / D71) | **Error material** | Un saldo **escrito a mano** y confirmado era `exacta` y podía dar «verificado» o «cuadra». Una atestación aproximada o reconstruida confirmada, con r = 0, daba «Cuadra». **Las dos cosas inducen a pensar que hay una verificación bancaria** |
| E5 | §6.3 y la matriz (D63 v6) | **Error de coherencia** | La matriz dice C ≤ 2³⁰ y el §6.3, ≤ 2¹⁶ sumas por mitad. No son la misma regla, y falta el algoritmo de partición y la comprobación de que las sumas caben en un entero exacto de JavaScript |
| E6 | §9.2 (D66) | **Error material** | «Q1' garantizada desde la fase 1a» y «Q2 siempre» son garantías absolutas que dependen de condiciones sin demostrar (R8, el entorno de ejecución) |
| E7 | §11 / D33 frente a §13 | **Contradicción** | La experiencia de usuario propone «A mercado: …» como cifra principal, pero las valoraciones (D68) se aplazan a las fases posteriores |
| E8 | §8.2, punto 4, frente a V3 §13.3 | **Error material** | Las inversiones de la Fase 1 pasan a posiciones de L, pero V3 §13.3 exige que una compra tenga una cuenta de tipo bróker o cripto → **la migración no cumpliría la restricción** |
| R1 | §6.3 | Riesgo | Con muchos tramos que tienen unidades sin liquidación conocida, el coste total crece; se resuelve calculando cada tramo solo cuando se necesita |
| FA1 | §7.2 (horario de verano) | Falsa alarma | 27/10/2026 es martes; la UE cambió el 25/10 y EE. UU. el 01/11. 23:59:59 EDT del 27/10 = 04:59:59 CET del 28/10 ✓ |
| FA2 | §7.3 (aviso tardío) | Falsa alarma | Recalculado: Q1 del jueves → desfasada; Q1 del viernes y Q2 sobre el jueves → al día ✓ |
| FA3 | §4.1 (dividendo con H) | Falsa alarma | Δ B = neto + retención = bruto ✓ |
| FA4 | §5.4: cifras 2.250 / 2.236 / 2.215 | Falsa alarma (aritmética) | 90 + 160 = 250 · 84 + 152 = 236 · 75 + 140 = 215; Ef + P = B en cada versión ✓ |

---

## 2. Correcciones exactas

### 2.1 §5.4 (D61): corregir un coste frente a registrar un pago adicional

**El análisis.** En una compra, el coste del lote **es** lo pagado: importe = bruto + comisión + impuesto (V3 §6.3). Por eso **no se puede cambiar el coste de una compra sin cambiar también su efectivo.** Hay tres casos distintos:

| Caso | ¿Hay un hecho económico nuevo? | Qué se registra | Fecha del cambio de efectivo |
|---|---|---|---|
| **(a) Corrección del registro:** la compra **se pagó** de verdad por 1.020; se apuntó mal | **No** | **Versión 2 del mismo hecho de compra** (los dos lados: Ef → P 1.020) + versiones de las ventas (D61) | **El 10/01** (la fecha de la compra; T3) |
| **(b) Pago adicional posterior:** el bróker cargó 20 de comisión el 12/01 en una línea aparte | **Sí** | **Un hecho nuevo** `comision` vinculado a la compra (V3 §6.3: se funde en el coste del lote) | **El 12/01** |
| **(c) Lote de apertura** (sin pago dentro de los datos) | No | Versión del lote: E → P (*capital_apertura*) | **Ninguno**: el efectivo no cambia (§5.3) |

**Texto corregido de §5.4** (sustituye al ejemplo):

> **Ejemplo (caso a: corregir lo que se pagó).**
> - Efectivo inicial: 2.000,00.
> - La compra C1 (10/01) se registró por 1.000,00. **El extracto muestra después que el cargo real fue de 1.020,00** (corrección 1, registrada el 01/09) y, más tarde, de 1.050,00 (corrección 2, registrada el 15/10, por un impuesto de la operación cargado en el mismo apunte).
> - Ventas: V1 (15/03), 3 por 390,00; V2 (20/06), 4 por 560,00.
> - **No hay ningún hecho económico nuevo:** se corrige el registro de C1, y por eso **el efectivo cambia en el 10/01**.
>
> | Versión vigente de C1 | Ef | P (3 restantes) | Realizado | B |
> |---|--:|--:|--:|--:|
> | v1 (1.000,00) | 1.950,00 | 300,00 | +250,00 | 2.250,00 |
> | v2 (1.020,00) | 1.930,00 | 306,00 | +236,00 | 2.236,00 |
> | v3 (1.050,00) | 1.900,00 | 315,00 | +215,00 | 2.215,00 |
>
> **Comprobación:** B = 2.000 − cargo de C1 + 390 + 560 + P; y además B = 2.000 + realizado.
>
> **Caso b (pago adicional el 12/01 por 20,00):** C1 se queda en la v1. Se crea un hecho `comision` (Ef → P 20,00, el 12/01). Desde el 12/01, el resultado es igual que en la v2. **Entre el 10/01 y el 11/01, el efectivo es 1.000,00** (no 980,00).

### 2.2 §5.3: el ejemplo completo

> - Efectivo inicial: **2.000,00**. Lote de apertura L0: 10 acciones, **coste desconocido** (sin apuntes).
> - **Venta v1** (4 por 400,00): Psc → C 400,00 → **C = 2.400,00 · Psc = −400,00 · B = 2.000,00** · CSC = 400,00 · PCq = 2.400,00 (cota inferior: quedan 6 acciones sin coste).
> - **Más tarde, L0 v2: coste 800,00:** E → P 800,00 (en la fecha de corte) · **venta v2:** P → C 320,00 · E → C 80,00 (la v1 queda superada) → **C = 2.400,00 · P = 480,00 · Psc = 0 · B = 2.880,00** = 2.000,00 + 800,00 + 80,00.
> - **No hay duplicidad:** el cobro de 400,00 está una sola vez en C; con la v2, 320,00 vienen de P y 80,00 de E, en lugar de 400,00 de Psc.

### 2.3 §4.3: la identidad PCq = B + RND + CSC (demostración y dominio)

**Hipótesis:**
- **H1.** B = Σ de las partes conocidas de las bolsas del libro: efectivo y pasivos con su K, H, lotes conocidos con asignación determinada (P_det), grupos G y Psc.
- **H2.** En el libro, cada **parte** de una venta con asignación indeterminada (por el orden o por coste desconocido) se traduce como un **traspaso neutro** G → C o Psc → C. La parte determinada de coste conocido se traduce como P → C: K + E ↔ C: R − K.
- **H3.** En cada escenario s y en cada grupo G: C_G = K_s + RC_s (el coste se conserva).
- **H4.** El cobro de cada venta R (neto de la comisión, D3) se reparte por unidades en el escenario: R = R^k_s + R^u_s (P4).
- **H5.** Transferencias, aperturas con coste, retenciones (C → H, E → H), pasivos y comisiones entran **con el mismo valor** en B y en PCq.

**Definiciones corregidas:**

```
PCq_s^libro = Σ K_c (efectivo) + Σ K_d (pasivos) + H + P_det + Σ_G RC_s(G)
RND_s = Σ_G ( Σ R^k_s − K_s )                (realizado de las partes de coste conocido cuya asignación depende de s)
CSC_s = Σ cobros asignados a lotes sin coste (en G según s, más los determinados en Psc)
```

**Demostración.** Para cada grupo G, su parte conocida en el libro es g = C_G − cobros_G. Sustituyendo H3 y H4: g = (K_s + RC_s) − (ΣR^k_s + ΣR^u_s) = RC_s − RND_s(G) − CSC_s(G). Psc = −CSC^det. Entonces:

```
B = Σ K_c + Σ K_d + H + P_det + Σ_G (RC_s − RND_s − CSC_s) − CSC^det = PCq_s^libro − RND_s − CSC_s   ∎
```

**Dominio:** la identidad vale **solo sobre la base del libro** (canónica). Sobre la base que se muestra (anclada):

```
PCq_s^mostrado = PCq_s^libro + Σ_b R_b      ⇒      PCq_s^mostrado = B + Σ R + RND_s + CSC_s
```

**No se aplica al patrimonio a mercado.**

**Repaso de los tipos de operación:**
- **Apertura con coste:** E → P en B y en P_det ✓.
- **Apertura sin coste:** ningún apunte, y no entra en PCq ✓.
- **Compra:** C → P, neutra en los dos ✓.
- **Venta determinada:** el realizado entra en B por E ↔ C y no está en RND ✓.
- **Comisiones:** dentro de K o de R ✓.
- **Transferencias:** neutras ✓.
- **Pasivos:** con su K en los dos ✓.
- **Retenciones:** H en los dos ✓ (**en la definición de la V3.3, H faltaba**).
- **Lotes sin coste:** a través de CSC ✓.

**Comprobación con el ejemplo S3' de X** (C4): B = 1.420 + (300 − 560) = 1.160 · RND = 420 − 300 = 120 · CSC = 140 · PCq = 1.420 + 0 = **1.420** ✓.

**Corrección de §4.3:** sustituir la fila «PC cuantificable» por las dos definiciones (libro y mostrado), incluir H, y escribir la identidad con su dominio.

### 2.4 §6.2 y §6.3: la evidencia y las etiquetas de conciliación (D51 y D71)

**La regla nueva: separar la precisión de la evidencia.**
- Cada atestación tiene `evidencia ∈ {documental, declarada}`.
- **documental** = un extracto, una API o una captura legible con su fecha y su tipo.
- **declarada** = lo escribió o lo confirmó el usuario (manual, saldo del alta, R1 o R2 confirmados).

| Ancla al principio y al final del tramo | Residuo | Etiqueta |
|---|---|---|
| Las dos documentales y exactas | r = 0 exacto | «**Cuadra con tu banco**» |
| Alguna declarada (aproximada, reconstruida o manual) | r = 0 | «**Coincide con el saldo que indicaste**» (nunca «cuadra») |
| Cualquiera | 0 ∈ R_posibles | «**Podría cuadrar**» (+ «respecto a lo que indicaste» si hay alguna declarada) |
| — | Límite superado, m > 3 o sin ancla válida | «**No comprobado**» |
| Cualquiera | 0 ∉ R_posibles | «**Discrepancia detectada**» (+ «respecto a lo que indicaste») |

- **«Saldo verificado» (D51)** exige una atestación **exacta + documental**.
- **Un saldo manual confirmado** se muestra como «**Saldo indicado por ti el dd/mm**».
- **Corrección de la tabla §6.2:** en la fila «Manual», la columna «¿Verificado?» pasa de «Solo si es exacta» a «**Nunca**, es declarada».
- **«Patrimonio verificado» (§4.3)** exige atestaciones documentales.

### 2.5 §6.3: política de recursos (D63 v7)

**La regla determinista:**
1. Las variables (agrupadas por la regla de 6 condiciones) con oᵢ = kᵢ + 1 opciones se ordenan por (oᵢ de mayor a menor, id).
2. Se asignan **una a una** a la mitad con el producto acumulado más pequeño (en caso de empate, a la mitad 1).
3. **Es viable si y solo si** las dos mitades tienen un producto ≤ M = 2¹⁶ **y** Σ|x| ≤ 2⁵³ − 1 (las sumas en céntimos son exactas con `Number`).
4. Si no es viable → «**No comprobado**», con el rango [mín, máx]. **Cualquier aparato da el mismo resultado.**

**Coste real:**
- **Memoria:** dos `Float64Array` de 2¹⁶ → **1 MB**, más una copia temporal al ordenar.
- **Tiempo:**
  - generar las sumas: O(M);
  - ordenar: O(M log M), unas 10⁶ comparaciones;
  - buscar el par con dos punteros: O(M).
  - Del orden de **10–30 ms en un móvil** [S]. No es un límite: es solo una estimación.

**Peor caso:**
- El máximo C viable es 2³² (cuando las dos mitades quedan llenas).
- **La partición voraz puede no encontrar una partición que sí existe.** En ese caso da «No comprobado», que es correcto y reproducible: no es un falso «cuadra».
- **Una sola variable con o > 2¹⁶** → «No comprobado».
- Con hipótesis de duplicados: hasta 2³ = 8 ejecuciones por tramo.
- **Cuándo se calcula:**
  - solo el **último tramo** de cada cuenta, y los demás cuando se abren;
  - los resultados van a una **caché** con la clave (hash de las entradas del tramo, `VERSION_MOTOR`);
  - **la memoria máxima es la de un tramo**, porque se calculan uno a uno.

**Corrección:** en el §6.3 y en la matriz, sustituir «C ≤ 2³⁰» y «2¹⁶ por mitad» por esta regla.

### 2.6 §9.2 y §9.3: las garantías, sin absolutos (D66 v5)

| Consulta | Técnicamente posible | Reproducible (el mismo resultado al repetirla) | Resultado verificado | No recuperable |
|---|---|---|---|---|
| **Q2** (hoy, sobre F) | Sí | **Solo mientras** no cambian los datos ni el motor. Para fijarla hace falta una instantánea | No (es un cálculo) | — |
| **Q1'** (lo que se sabía en X, con las reglas de hoy) | Sí, para X posterior a la fase 1a | **Con condiciones:** R8 (las versiones son de solo añadir) se cumple y el motor actual se ejecuta | No | Antes de la fase 1a |
| **Q1** (con las reglas de X) | Sí, si el paquete de X está archivado y su `FORMATO_ENTRADA` es el actual o el anterior | **Con condiciones:** lo anterior + que el entorno archivado se pueda ejecutar (lo comprueban las pruebas de referencia; **no está garantizado a 10 años**) | No | Antes de la fase 1a; motores de la Fase 1 sin archivar |
| **Algo emitido** (instantánea + hash) | Sí | **Con condiciones:** que el entorno se pueda ejecutar | **«Reproducción verificada»** si al volver a ejecutarla da el mismo hash. **No es una verificación financiera**: esa solo la dan las atestaciones documentales | — |

**No recuperable, en cualquier caso:**
- lo que se borró o editó físicamente antes de la fase 1a;
- los cuadres con diferencia 0;
- las fechas de despliegue de las versiones del motor de la Fase 1;
- la zona horaria del dispositivo en los ajustes antiguos (sus fechas usan `hoyIso` local).

**Corrección:** en §9.2, cambiar «Garantizada desde la fase 1a» por «**posible desde la fase 1a; reproducible si se cumplen R8 y el entorno**», y «Siempre (T2)» por «**siempre calculable; no reproducible sin instantánea**».

### 2.7 §11, §13 y D33: la puerta de salida PM-0 (patrimonio a mercado)

**La regla:**
- Mientras la capa de valoraciones (A4 + D68) no esté implementada y no pase **V1–V7, Z1, Z2, A1 y A2**, el motor devuelve `PM = null`, con el estado «**no disponible**». **Nunca 0, nunca parcial.**
- **Tampoco se usa el precio de las operaciones** (D37): un PM a medias es peor que no tener PM.

**La experiencia mínima de la fase 1:**
- «**Patrimonio a coste: X €**» + su cobertura («las inversiones aparecen a lo que te costaron; no a su valor actual»);
- D33 se aplica **solo cuando PM esté disponible**.

**Cómo se verifica:**
- **Prueba e2e:** sin la capa activa, **ninguna pantalla** muestra «a mercado» ni «valor actual».
- **Prueba unitaria:** sin la capa, `calcular()` devuelve `PM = null`.

**Correcciones:**
- **§11:** la primera fila pasa a ser «Patrimonio a coste: X € de lo que conoces» (fase 1); la de «a mercado», para después de la puerta PM-0.
- **§13:** añadir PM-0 como puerta de salida de la fase P, «valoraciones».

### 2.8 §8.2, punto 4 (D49): la cuenta histórica L y las posiciones

- **El contraejemplo:** una compra de la Fase 1 que se migra con `cuenta = L` incumple «compra → cuenta de tipo bróker o cripto» (V3 §13.3).
- **La corrección mínima:** en V3 §13.3, admitir la clase **`historico_sin_desglosar`** en compra, venta y traslado de posición (D49).
- Las posiciones de L se pasan a cuentas reales en el corte, con `traslado_posicion` (los lotes mantienen su intervalo y su coste).

---

## 3. Pruebas de regresión necesarias

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

## 4. Impacto en la matriz de decisiones

| ID | Cambio |
|---|---|
| D61 | Texto de §2.1: distingue corrección del registro, pago adicional y apertura. **Sigue «Aprobable con condiciones»**, con D61-2 añadida |
| A6 (D67) | Las definiciones libro y mostrado, H incluida, y la identidad con su dominio. **Pendiente de aprobación** |
| D63 | **v6 → v7** (§2.5). Aprobable con condiciones: MEM-1 a MEM-3 |
| D71 | **v2 → v3:** atributo `evidencia`. Aprobable con condiciones: ET-1 |
| D51 | **v2:** «verificado» exige una atestación documental. Pendiente de aprobación |
| D66 | **v4 → v5:** la tabla de garantías de §2.6. Aprobable con condiciones: GAR-1 |
| D68 / D33 / A4 | Se añade la **puerta PM-0**. D33 queda **condicionada** a que PM-0 se haya superado |
| D49 | `historico_sin_desglosar` admitida para posiciones (§2.8). Pendiente de aprobación |
| No hay decisiones nuevas | Los cambios van dentro de las decisiones que ya existen |

## 5. Dictamen

**La V3.3 está lista con condiciones**, después de aplicar las 8 correcciones (E1–E8) del apartado 2. Ninguna cambia el diseño: todas son precisiones o correcciones de definición. **No queda ninguna contradicción bloqueante**, aparte de las enmiendas a `MOTOR.md` que ya estaban identificadas (A1–A7) y siguen pendientes de tu aprobación.

**Para pasar a «lista para aprobación» faltan dos cosas:**
1. Que **autorices aplicar estas correcciones** a los tres documentos (por ejemplo, como una V3.3.1 en archivos nuevos, sin tocar los existentes).
2. Que **autorices guardarlos en el repositorio** (D60), porque hoy solo existen en una carpeta temporal.

**Requisitos para implementar** (de BRECHAS §6): la restauración probada de la copia, la copia cifrada, las vistas previas apuntando a DEV y el volcado del esquema real.

---
🔔 **Pendientes tuyos, guardados:**
1. **S1:** la **prueba de restaurar** la copia, **guardarla cifrada** (D32) y decidir si pasas a Supabase Pro (D16).
2. **S2:** que las vistas previas de Vercel apunten a «palanca dev».
3. **Autorizar** dos cosas: aplicar estas correcciones (V3.3.1, en archivos nuevos) y **D60**, guardar la arquitectura en el repositorio (urgente).
4. **Para archivar v1:** el commit y la versión de Node de producción (en Vercel), y tu permiso.
5. **Revisar y aprobar** las decisiones (BRECHAS §3).
6. **Las 8 decisiones** del Excel y el extracto del banco con saldo (D15).
7. **La cuenta de Google de solo lectura.**
8. **Decidir los colores** para el Perfil.