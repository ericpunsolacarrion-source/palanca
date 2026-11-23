# Palanca — Arquitectura de referencia v3.2

**Corrección puntual de la v3.1** · 21/11/2026 · Estado: **propuesta, no aprobada**
Base: `docs/MOTOR.md` (sin modificar), `ARQUITECTURA-V3.md` y `ARQUITECTURA-V3.1.md` (sin modificar).

> **No he cambiado nada.** No he tocado el repositorio, la base de datos, Supabase, Vercel ni los conectores.
> **Lo que este documento no menciona sigue exactamente como en la v3.1.**
> Etiquetas: **[C]** comprobado · **[D]** decisión ya establecida · **[X]** problema detectado · **[P]** propuesta · **[V]** pendiente de validar.

---

## 1. Cambios concretos respecto a la v3.1

| # | Sección de la v3.1 | Qué decía | Qué dice la v3.2 | Por qué |
|---|---|---|---|---|
| K1 | 5.1 | «Patrimonio conocido» = el **mejor valor** de cada pieza: mercado si existe, si no coste | **Dos cifras separadas**, cada una con un solo criterio: **a coste** y **a mercado**, más la **cobertura** de cada una. Ninguna cifra mezcla criterios | Una cifra híbrida engaña [X] |
| K2 | 5.1 | Las cuentas sin punto de partida «no entran» | Entran **solo con la parte que conocemos** (sus movimientos), nunca con un saldo inventado. Su saldo real se ve como «desconocido» | Excluirlas por completo haría que una transferencia desde una de esas cuentas **subiera** el patrimonio, y eso rompe E4 (2.1.3) [X] |
| K3 | 5.5 y A5 | Al vender un lote sin coste: **exterior → efectivo**, como «capital anterior» | **Posición sin coste → efectivo**: un movimiento **entre dos bolsas tuyas**, que no cambia el patrimonio (E4). La posición se queda con un saldo conocido negativo («cobrado sin coste conocido») hasta que se sepa el coste | La v3.1 **subía de forma artificial** el patrimonio a coste en lo cobrado [X] (2.2) |
| K4 | 5.1 | Sin regla para valorar a mercado una posición recién comprada | **El precio de una operación es una observación de mercado** en su fecha (compra o venta). Envejece con la regla de actualidad | Sin esto, comprar algo sin valorar **bajaría** el patrimonio a mercado de forma artificial |
| K5 | 6.2 | `vinculos` con unicidad básica | Restricciones completas: clave foránea a la **misma observación**, que la observación sea del **mismo tipo** que el destino, que no haya **ciclos**, que se sustituya **solo el vínculo vigente** y que el destino coincida con el tipo (2.3) | Integridad [X] |
| K6 | 5.1 y D29 | «Completo y verificado» en una sola condición | **Cinco dimensiones independientes**: cuentas declaradas, saldos, costes, valoración y actualidad. Las etiquetas para cada cifra salen de reglas fijas (2.4) | No confundir una cuenta sin saldo con una posición sin coste [X] |
| K7 | 9.2 A2, A4 y A5 | Textos de la v3.1 | A2 y A5 **reescritas**. A4 se propone en **versión mínima** para la subfase 1e: solo valoraciones manuales o por captura, en EUR, sin precios automáticos | Hace falta para tener la cifra a mercado sin adelantar toda la fase posterior |
| K8 | 9.3 | Decisiones sueltas | Tabla única con estado (sección 4) | Lo pediste así |

**No cambia:**
- las cinco piezas (observación, vínculo, decisión, hecho y versión);
- la tarjeta de crédito;
- el Excel A + B;
- el saldo contable frente al disponible;
- la seguridad;
- el plan por fases (solo se añade A4 mínima en la subfase 1e).

---

## 2. Resolución de los cuatro problemas

### 2.1 Criterios de valoración separados

#### 2.1.1 Partes conocidas y partes indeterminadas

Toda bolsa (cuenta o posición) tiene:
- una **parte conocida**: la suma, en céntimos, de sus apuntes vigentes, que siempre existe;
- y, si procede, una **parte indeterminada**: un saldo de partida desconocido o el coste de un lote sin importe.

**La parte indeterminada nunca se convierte en número.** Se **lista** en la cobertura.

| Pieza | Parte conocida | Parte indeterminada |
|---|---|---|
| Cuenta con saldo inicial o con atestación | su saldo (calculado o anclado) | ninguna |
| Cuenta sin punto de partida | Σ de sus movimientos (por ejemplo, −340 €) | el saldo de partida |
| Lote de coste conocido | su coste | ninguna |
| Lote de coste desconocido | 0 (no tiene apuntes) | su coste |
| Posición sin coste que se ha vendido | lo que se ha cobrado de ella, con signo **negativo** | su coste |

#### 2.1.2 Las cifras

| Cifra | Fórmula | Excluye (y lo dice) | Rol en la Constitución |
|---|---|---|---|
| **Patrimonio a coste** | Σ partes **conocidas** de todas las bolsas (efectivo, pasivos y posiciones) | Las partes indeterminadas, que se **listan** en la cobertura de coste | **Es el canónico de E2.** Una sola cifra, exacta sobre lo declarado (C1) |
| **Patrimonio a mercado** | Σ partes conocidas de efectivo y pasivos **+** Σ valor de mercado de las **posiciones abiertas con valoración** | Las posiciones abiertas **sin** valoración (no se sustituyen por su coste) | Métrica auxiliar de la capa «valor ≠ coste» (F2b, A4). **No es canónica** |
| **Resultado no realizado** | Σ (valor − coste) **solo** de las posiciones con coste conocido **y** valoración | Todo lo demás, listado | Explicación, no patrimonio |
| **Cobertura de coste** | Lista de partes indeterminadas: lotes sin coste, ventas sin coste, cuentas sin punto de partida | — | Diagnóstico |
| **Cobertura de valoración** | Posiciones abiertas sin valoración, o con valoración antigua | — | Diagnóstico |

**Por qué esto mantiene E2 sin crear varios patrimonios canónicos:**
- **Hay un solo canónico, a coste**, que es justo Σ bolsas (E2) sobre lo declarado (C1).
- **La cifra a mercado es la capa que F2b ya prevé.** No sustituye al canónico: se enseña con su propio nombre («a mercado»).
- **No existe una tercera cifra «híbrida».** El «patrimonio conocido» de la v3.1 **desaparece** como cifra. «Conocido» pasa a ser un **calificativo** de las dos cifras («a coste, de lo conocido»), que remite a la cobertura.

**¿Por qué el precio de una operación es una valoración de mercado (K4)?**
- El precio pagado o cobrado **es** el precio de mercado de ese día. No es el coste sustituyendo al valor.
- Sin esta regla:
  - comprar algo sin valorar **bajaría** la cifra a mercado (sale efectivo y la posición no cuenta);
  - y vender algo nunca valorado la **subiría**.
- Con ella, la operación es **neutra** en las dos cifras el día que ocurre. Después, la valoración envejece según su actualidad (2.4).

#### 2.1.3 Por qué hay que incluir las partes conocidas de las bolsas indeterminadas (K2)

**La alternativa** sería excluir del todo las cuentas sin punto de partida.

**Contraejemplo:**
- La cuenta X no tiene saldo inicial, y el banco A está verificado con 1.000 €.
- Transfieres 500 € de X a A.
- Si X está excluida: el patrimonio pasa de 1.000 a 1.500 €. **Sube 500 € por una transferencia entre cuentas tuyas.** Esto incumple E4 y N2.
- Si se incluye la parte conocida de X (−500): 1.500 − 500 = **1.000 €** ✓, neutro.

**La regla es la misma para las posiciones sin coste** (2.2) y así sale una sola regla para todo:
- **las partes conocidas siempre suman;**
- **las partes indeterminadas nunca suman, pero se listan.**

**El coste de esta regla:** una cuenta sin punto de partida puede aportar una cifra negativa (sus gastos). Por eso:
- en su ficha **no se muestra como saldo**: se ve «Saldo desconocido · movimientos registrados: −340 €»;
- la cobertura lo dice: «incluye −340 € de movimientos de 1 cuenta sin saldo inicial».

La alternativa a esta regla es D34 (sección 4).

### 2.2 Venta de una posición con coste desconocido

#### 2.2.1 El error de la v3.1

- **La v3.1 traducía la venta de un lote sin coste como exterior → efectivo («capital anterior»).** Al cruzar la frontera (E3), el patrimonio a coste **subía en lo cobrado** el día de la venta. Antes de vender, la posición no contaba (no tenía coste); después, el efectivo sí. **Era un aumento artificial** de 1.000 €.
- **La corrección:** la posición sin coste es una **bolsa tuya**, P(a)·sc, con una parte indeterminada. Vender es **P(a)·sc → efectivo**: los dos extremos son bolsas tuyas, así que es **neutro por construcción** (E4). La parte conocida de P(a)·sc baja de 0 a −1.000 € y compensa exactamente el efectivo que entra.
- **Encaja con la Constitución:**
  - E1: importe > 0, de un nodo a otro;
  - E4: neutro;
  - §8: «el motor sí permite saldos negativos en una bolsa»;
  - N5: no hay ningún tapón; la parte conocida negativa es la suma exacta de apuntes reales;
  - P4: los repartos conservan los céntimos.

#### 2.2.2 Venta total: 10 acciones sin coste, cobras 1.000 €

**Datos:**
- antes, el usuario tiene 2.000 € de efectivo en el bróker, verificados;
- última valoración: 100 € por acción el día de la venta;
- no hay comisión.

| | Efectivo | P(a)·sc, parte conocida | Coste indeterminado | **A coste** | **A mercado** | Realizado | Aportado |
|---|--:|--:|---|--:|--:|---|--:|
| Antes | 2.000 | 0 | 10 acciones | **2.000** (+ 10 acciones sin coste, listadas) | 2.000 + 10 × 100 = **3.000** | — | X (+ anterior desconocido) |
| Apunte de la venta | **P(a)·sc → Efectivo: 1.000** | | | | | | |
| Después | **3.000** | **−1.000** | cerrada (0 acciones) | 3.000 − 1.000 = **2.000** | 3.000 + 0 = **3.000** | **no calculable** | **X (sin cambios)** |
| Variación | +1.000 | −1.000 | — | **0** ✓ | **0** ✓ | — | 0 ✓ |

- **El efectivo** aparece en su cuenta: 3.000 € ✓.
- **El patrimonio a coste no sube** ✓. No se inventa ni coste ni resultado.
- **Lo que verá el usuario:**
  - Efectivo de TR: **3.000 €**.
  - En Inversión: «**Cobrado sin coste conocido: 1.000 €** (venta de 10 acciones de A). Este dinero ya está en tu cuenta; para calcular lo que ganaste, falta lo que te costaron. [Añadir coste]».
  - Patrimonio a coste: 2.000 €, «excluye el resultado de 1 venta sin coste».
- **Capital aportado:** no cambia, porque el dinero se queda en el bróker. Si después lo pasas a tu banco, la retirada **resta** de lo aportado. El aportado podría quedar por debajo de cero, porque la aportación original no se conoce. Por eso se enseña como «aportado **conocido**: … + aportaciones anteriores de importe desconocido».

**Si más tarde indicas el coste** (por ejemplo, 700 € el día que empezaron tus datos):
- el lote de apertura recibe una versión con importe, que genera un `saldo_inicial` E → P(a) de 700 € **en esa fecha**;
- la venta pasa a traducirse como una venta normal: P(a) → Efectivo 700 + E → Efectivo 300.

Por T3 se recalcula todo:

| | Efectivo | P(a) | A coste |
|---|--:|--:|--:|
| Día de inicio de los datos | 2.000 | 700 | 2.700 |
| Después de la venta | 3.000 | 0 | **3.000** |

- Realizado **+300**. Comprobación: 2.700 + 300 = 3.000 ✓.
- **Lo que cambia es el pasado**, y es lo correcto: aquel día ya tenías esas acciones. No hay ningún salto el día de la venta.

#### 2.2.3 Venta parcial: vendes 4 de 10 acciones sin coste por 400 €

| | Efectivo | P(a)·sc, parte conocida | Acciones sin coste | A coste | A mercado (100 €/acción) | Realizado |
|---|--:|--:|--:|--:|--:|---|
| Antes | 2.000 | 0 | 10 | 2.000 | 3.000 | — |
| P(a)·sc → Efectivo: 400 | 2.400 | −400 | 6 | **2.000** | 2.400 + 600 = **3.000** | no calculable |

**Si después indicas el coste** (800 € por las 10):
- K de la venta = 4/10 × 800 = **320**, con lo que el realizado es **+80**;
- las 6 que quedan cuestan **480**;
- a coste: 2.400 + 480 = **2.880** = 2.000 + 800 + 80 ✓.

#### 2.2.4 Posición mixta: un lote sin coste y otro conocido

**Datos:**
- **L0:** 5 acciones sin coste, el lote más antiguo, que FIFO consume primero;
- **L1:** 5 acciones compradas por 500 €;
- vendes 7 acciones a 120 € = **840 €**; el día de la venta valen 120 €.

**Reparto (FIFO, P4):**
- 5 acciones de L0 → 600 € cobrados;
- 2 acciones de L1 → 240 € cobrados, con un coste de 2/5 × 500 = **200**.

**Apuntes:**
- P(a)·sc → Efectivo: **600** (neutro);
- P(a) → Efectivo: **200** (el coste);
- E → Efectivo: **40** (resultado realizado).

| | Efectivo | P(a), lotes conocidos | P(a)·sc, parte conocida | A coste | A mercado (120 €) | Realizado |
|---|--:|--:|--:|--:|--:|---|
| Antes | 0 | 500 (L1) | 0 (L0 indeterminado) | **500** | 10 × 120 = **1.200** | — |
| Después | 840 | 300 (3 de L1) | −600 | 840 + 300 − 600 = **540** | 840 + 3 × 120 = **1.200** | **+40** calculable (2 acciones) · **no calculable** (5 acciones) |
| Variación | +840 | −200 | −600 | **+40** = el realizado conocido ✓ | **0** ✓ | — |

- **No realizado:** las 3 acciones que quedan de L1 → 360 − 300 = **+60**.
- **En pantalla:** «Resultado de la venta: **+40 €** en 2 acciones · **sin calcular** en 5 acciones (falta su coste)».

#### 2.2.5 Enmienda A5 (reescrita)

> **F2a, aclaración.** La política de coste es FIFO por activo y usuario. Un lote cuyo coste se desconoce no tiene importe: es una parte **indeterminada** de su posición, que nunca se valora a 0. Al consumirlo, lo cobrado pasa de la posición al efectivo **como traspaso entre bolsas** (E4), y el resultado de esa parte es **no calculable**. La parte conocida de la posición puede quedar negativa (§8) hasta que se registre el coste. Al registrarlo, el coste entra como saldo inicial en la fecha del lote y el resultado se recalcula (T3).

### 2.3 Integridad de la tabla `vinculos`

#### 2.3.1 Requisitos previos en otras tablas

```sql
-- observaciones: inmutable. Se añade la unicidad que necesitan las claves foráneas.
alter table observaciones add constraint obs_uid_id        unique (usuario_id, id);
alter table observaciones add constraint obs_uid_id_clase  unique (usuario_id, id, clase);
-- movimientos y atestaciones: unique (usuario_id, id), ya previsto en la v3 (13.1).
```

#### 2.3.2 Tabla

```sql
create table vinculos (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     text not null,
  observacion_id uuid not null,
  clase          text not null,                       -- copia de observaciones.clase, garantizada por clave foránea
  sustituye_a    uuid,                                -- null = primer vínculo de la observación
  relacion       text not null check (relacion in ('origen','confirma','actualiza','duplicada','descartada')),
  hecho_id       uuid,
  atestacion_id  uuid,
  version_base   int,                                 -- versión del hecho al vincular (fusión a tres bandas)
  autor          text not null check (autor in ('usuario','politica','sistema')),
  politica_id    uuid,
  motivo         text,
  creado         timestamptz not null default now(),

  constraint vin_uid_obs_id unique (usuario_id, observacion_id, id),

  -- (a) mismo usuario y tipo correcto: la observación existe, es del usuario y es de esa clase
  constraint vin_obs  foreign key (usuario_id, observacion_id, clase)
                      references observaciones (usuario_id, id, clase),
  -- (b) destinos del mismo usuario
  constraint vin_hecho foreign key (usuario_id, hecho_id)      references movimientos  (usuario_id, id),
  constraint vin_atest foreign key (usuario_id, atestacion_id) references atestaciones (usuario_id, id),
  -- (c) solo se sustituye un vínculo de la MISMA observación y del MISMO usuario
  --     (si sustituye_a es null, la clave foránea no se comprueba: MATCH SIMPLE)
  constraint vin_sust foreign key (usuario_id, observacion_id, sustituye_a)
                      references vinculos (usuario_id, observacion_id, id),
  constraint vin_no_auto check (sustituye_a is distinct from id),

  -- (d) destino coherente con la relación…
  constraint vin_destino check (
    case when relacion = 'descartada'
         then num_nonnulls(hecho_id, atestacion_id) = 0
         else num_nonnulls(hecho_id, atestacion_id) = 1 end),
  -- …y con la clase de la observación
  constraint vin_clase check (
       (clase = 'movimiento'          and atestacion_id is null)
    or (clase in ('saldo','posicion') and hecho_id is null)),
  -- 'actualiza' necesita la versión base
  constraint vin_actualiza check (relacion <> 'actualiza' or version_base is not null)
);

-- (e) un solo primer vínculo por observación, y cada vínculo se sustituye una vez como máximo → cadena lineal
create unique index vin_raiz   on vinculos (usuario_id, observacion_id) where sustituye_a is null;
create unique index vin_lineal on vinculos (sustituye_a)                where sustituye_a is not null;
create index vin_por_hecho on vinculos (usuario_id, hecho_id)      where hecho_id is not null;
create index vin_por_atest on vinculos (usuario_id, atestacion_id) where atestacion_id is not null;
```

#### 2.3.3 Lo que no cabe en una restricción: un *trigger* que solo comprueba, más una función

**`BEFORE INSERT`** en `vinculos`. No modifica nada; solo lanza el error si algo no cuadra:
1. **Bloquea la observación** (`select … from observaciones where id = NEW.observacion_id for update`). Así dos inserciones a la vez para la misma observación se ponen en cola.
2. **Si la observación no tiene vínculos:** exige `sustituye_a is null`.
3. **Si ya los tiene:** exige que `sustituye_a` sea **el vigente** (el que nadie sustituye). Así se impiden las ramas y que se sustituya un vínculo antiguo.

**`BEFORE UPDATE OR DELETE`:** error, salvo con el rol de supresión RGPD (v3.1, 8.2).

**Permisos:** `authenticated` solo tiene `SELECT`. Los vínculos se escriben con `registrar_lote`, `confirmar_propuestas` y `revincular`.

#### 2.3.4 Cómo se garantiza cada requisito

| Requisito | Garantía |
|---|---|
| Solo se sustituye un vínculo de la misma observación | Clave foránea (c) (usuario, observación, sustituye_a) → (usuario, observación, id) |
| No se cruzan usuarios | Todas las claves foráneas llevan `usuario_id` (a, b, c); RLS en la lectura |
| No hay cadenas circulares | (1) `sustituye_a ≠ id`. (2) El *trigger* exige que `sustituye_a` **ya exista y sea el vigente** en el momento de insertar cada fila. Ni siquiera dos filas que se apuntan entre sí **en la misma orden** pueden pasar: la primera se comprueba antes de que exista la segunda. (3) Las filas no se pueden modificar, así que nunca se puede reapuntar una fila hacia otra más nueva |
| Un solo vigente por observación | Una raíz (e) + cada nodo sustituido una sola vez (e) + no hay ramas (el *trigger*) → la cadena es **lineal** → exactamente **un** vínculo sin sucesor |
| Destino coherente con el tipo | (d): `descartada` → sin destino; las demás → exactamente uno. `vin_clase` + la clave foránea (a): una observación de movimiento solo va a un hecho, y una de saldo o posición solo a una atestación |
| La misma observación no apunta a varios hechos incompatibles | Consecuencia de «un vigente»: una observación está vinculada a **un** destino en cada momento |

**Lo que queda fuera de la base de datos, a propósito, y se cubre con pruebas:**
- «**como máximo un vínculo `origen` vigente por hecho**». Indexarlo obligaría a guardar si un vínculo está vigente, lo que supone modificar filas: justo lo que se quiere evitar. Se garantiza en `confirmar_propuestas` y con una prueba de invariante.
- **Vínculos a un hecho anulado:** se permiten. Es la historia; el cálculo solo lee los hechos vigentes (H3).

**Lectura del vigente:**

```sql
create view vinculos_vigentes as
  select v.* from vinculos v
  where not exists (select 1 from vinculos s where s.sustituye_a = v.id);
```

### 2.4 Completitud, verificación, cobertura y actualidad

#### 2.4.1 Cinco dimensiones independientes

| Dimensión | Pregunta | Estados (por pieza) | Regla |
|---|---|---|---|
| **1. Cuentas declaradas** | ¿Están todas las cuentas? | `declarada completa` / `puede faltar alguna` | Completa **solo** si el usuario confirmó «estas son todas mis cuentas», hace ≤ 90 días (D29), **y** desde entonces no ha añadido ninguna cuenta ni hay una transferencia a una cuenta propia desconocida pendiente de revisar |
| **2. Saldos** | ¿Sabemos cuánto hay en cada cuenta? | `verificado` / `calculado` / `sin saldo inicial` / `sin datos` | `verificado` = atestación **contable**, sin discrepancia abierta y dentro del plazo de la dimensión 5. `calculado` = con punto de partida, pero sin atestación vigente |
| **3. Costes** | ¿Sabemos lo que costó cada posición abierta y cada venta? | `coste conocido` / `coste parcial` / `sin coste` | Por lote; la posición resume. Las ventas sin coste cuentan aquí (2.2) |
| **4. Valoración** | ¿Sabemos lo que vale cada posición abierta? | `valorada` / `sin valorar` | La valoración es una atestación o el precio de una operación (K4) |
| **5. Actualidad** | ¿Están al día los datos? | `al día` / `de hace N días` / `desactualizado` | **Saldos:** al día ≤ 7 días; desactualizado > 31 días (el umbral pendiente). **Valoraciones:** al día ≤ 7 días; desactualizada > 31 días (D35) |

**Las dimensiones no se mezclan.** Una posición con valor conocido y coste desconocido es:
- `valorada` en la 4;
- `sin coste` en la 3.

**Nunca** aparece como «sin saldo» (dimensión 2), que es solo para las cuentas.

#### 2.4.2 Etiquetas de cada cifra (reglas cerradas)

| Etiqueta | **A coste**: se concede si… | **A mercado**: se concede si… |
|---|---|---|
| **«Completo y verificado a dd/mm»** | 1 = completa · 2 = todas las cuentas `verificado` · 3 = sin ninguna parte indeterminada (ni lotes ni ventas sin coste) · 5 = saldos al día. La fecha es la de la atestación **más antigua** | 1 = completa · 2 = todas `verificado` · 4 = todas las posiciones abiertas `valoradas` · 5 = saldos **y** valoraciones al día. La fecha, la más antigua de todas |
| **«Completo»** (sin «verificado») | 1 y 3 se cumplen, pero algún saldo es `calculado` o no está al día | 1 y 4 se cumplen, pero algún saldo o valoración no está verificado o al día |
| **«De lo que conoces»** (por defecto) | Si falla 1 o 3 | Si falla 1 o 4 |
| Nunca | «Tu patrimonio total» si no se cumple «Completo y verificado» | Ídem |

**Ejemplo del encargo de la v3.1, ampliado:**

| Pieza | Datos | Dimensiones |
|---|---|---|
| Banco A | 4.000 €, atestación del 20/11 | saldo `verificado`, al día |
| TR efectivo | 2.000 €, atestación del 20/11 | `verificado`, al día |
| Acciones X | coste 3.000 €, valoradas en 3.500 € el 20/11 | `coste conocido`, `valorada`, al día |
| Acciones Y | coste desconocido, valoradas en 1.500 € el 20/11 | **`sin coste`**, `valorada` |
| Fondo Z | coste 1.000 €, nunca valorado (la compra fue hace 2 meses) | `coste conocido`, valoración **desactualizada** (el precio de compra tiene 60 días) |
| Cuentas | el usuario **no** ha confirmado que estén todas | 1 = **puede faltar alguna** |

**Pantalla:**

```
A mercado    11.000 €    de lo que conoces
A coste      10.000 €    de lo que conoces
  Falta: confirmar que no tienes más cuentas · coste de Acciones Y · valoración al día de Fondo Z
```

**Cálculos:**
- **A mercado:** 4.000 + 2.000 + 3.500 + 1.500 = **11.000 €**. El Fondo Z **no entra**, porque su única valoración (el precio de compra) está desactualizada.
- **A coste:** 4.000 + 2.000 + 3.000 + 1.000 = **10.000 €**. Las Acciones Y **no entran**, porque no tienen coste.
- **No realizado calculable:** solo X → **+500 €**. «Y: sin calcular (falta el coste) · Z: sin calcular (falta una valoración al día)».
- **La diferencia entre las dos cifras (1.000 €) NO es el no realizado (500 €)**, porque cada cifra deja fuera piezas distintas. Por eso **no se muestra** una resta entre ellas, y la prueba I21 lo comprueba.

**Decisión (D35):** ¿una valoración desactualizada sale del todo de la cifra a mercado (lo que propongo, por rigor) o entra marcada como antigua? Si sale, la cifra a mercado **cae** el día que caduca. Hay que explicarlo: «Fondo Z ya no cuenta: valoración de hace 60 días». Si entra, la cifra está «al día» solo en parte.

---

## 3. Ejemplos numéricos que demuestran la coherencia

Todos en EUR y en céntimos enteros. «Δ» es la variación por el hecho.

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

**Invariantes nuevas para las pruebas** (se suman a I1–I20 de la v3):
- **I21:** no se muestra «no realizado = a mercado − a coste» si las dos coberturas no coinciden.
- **I22:** una transferencia, la venta de una parte sin coste o una compra (el día de la operación) **no cambian** ninguna de las dos cifras.
- **I23:** ninguna parte indeterminada se convierte en número.
- **I24:** «Completo y verificado» solo con las condiciones de 2.4.2.
- **I25:** las restricciones de `vinculos` de 2.3.4, probadas en una base de datos con intentos de cruzar usuarios, de crear ciclos dentro de una misma orden y de sustituir un vínculo que no es el vigente.

---

## 4. Tabla de decisiones

**Estados:**
- **Aprobada:** la tomaste tú de forma expresa, y digo cuándo.
- **Aprobada con condiciones:** la aprobaste con un límite expreso.
- **Pendiente:** falta tu decisión; que yo la recomiende no cuenta.
- **Aplazada:** se decide en una fase posterior.

| ID | Decisión | Estado | Origen del estado | Mi recomendación |
|---|---|---|---|---|
| **A1** | Apuntes derivados, no guardados; las fotos y cachés no son autoritativas | **Pendiente** | — | Aprobar |
| **A2** | Métricas auxiliares (rehecha en la v3.2): cifra a coste canónica + cifra a mercado + coberturas + etiquetas de 2.4.2. **Sustituye a D1** | **Pendiente** | — | Aprobar |
| **A3** | Excepción RGPD en H1 | **Pendiente** | — | Aprobar (lo exige la ley) |
| **A4** | Capa valor ≠ coste (F2b) en **versión mínima** para la subfase 1e: valoraciones manuales, por captura y precio de operación; EUR; sin precios automáticos | **Pendiente** | — | Aprobar la versión mínima; la completa, más adelante |
| **A5** | Coste desconocido (rehecha en la v3.2, 2.2.5). **Sustituye a D26** | **Pendiente** | — | Aprobar |
| D1 | Qué patrimonio se enseña | **Sustituida por A2** | — | — |
| D2 | FIFO por activo y usuario | **Pendiente** | — | Aprobar |
| D3 | Comisiones de compra dentro del coste; las de venta, restando de lo cobrado | **Pendiente** | — | Aprobar |
| D4 | Las ganancias realizadas no cuentan en el ahorro; dividendos e intereses sí, como ingreso financiero | **Pendiente** | — | Aprobar |
| D5 | Apuntes derivados | **Sustituida por A1** | — | — |
| D6 | Quitar `borrar_movimientos` y `borrar_sobrantes` del conector | **Pendiente** | — | Aprobar ya (fase 0) |
| D7–D14 | Las 8 decisiones de tu Excel (sin fecha, Mes ≠ fecha, copias, nómina negativa, «No sumado», previstos, tarjeta TR, especiales) | **Pendiente** | — | Las de la v2 (sección 14) |
| D15 | Extracto del banco con saldo | **Pendiente** (es un dato) | — | Aportarlo |
| D16 | Plan Pro de Supabase | **Pendiente** | — | Depende del coste; si no, copia manual con calendario fijo |
| D17 | Autoridad por campo (valores por defecto) | **Pendiente** | — | Aprobar |
| D18 | Vincular solo con puntuación alta | **Pendiente** | — | No por defecto |
| D19 | No guardar las imágenes de las capturas | **Pendiente** | — | Aprobar |
| D20a | **Tu Excel original, solo lectura** | **Aprobada** | Lo decidiste tú: «EL EXCEL ES INTOCABLE» (encargo de auditoría financiera) | — |
| D20b | Opción B: pestaña «Palanca» con permiso expreso, solo en Sheets | **Pendiente** | — | Aprobar como opción futura |
| D21 | Dividendos e intereses en neto para el ahorro | **Pendiente** | — | Aprobar |
| D22 | Los pendientes solo restan del disponible, nunca del patrimonio | **Pendiente** | — | Aprobar |
| D23 | Bienes (vivienda) | **Aplazada** | Fuera del alcance de la v3 | — |
| D24 | Open Banking: cuándo y con qué agregador | **Aplazada** | Lo pusiste en las fases posteriores (encargo v3.1, §10) | — |
| D25 | Moneda base y multidivisa | **Aplazada** | Lo decidiste tú: «la primera versión debe centrarse en EUR» (encargo v3.1, §6) | — |
| D26 | Coste desconocido | **Sustituida por A5** | — | — |
| D27 | Más funciones: Vercel Pro o Edge Functions | **Aplazada** | Solo hace falta con las integraciones | — |
| D28 | Rol dedicado para la supresión RGPD | **Pendiente** (hay que verificarlo técnicamente en dev) | — | Verificar; si no, el plan B documentado |
| D29 | Declaración «estas son todas mis cuentas», con caducidad de 90 días y las causas que la invalidan (2.4.1) | **Pendiente** | — | Aprobar; el plazo se puede ajustar |
| D30 | Tarjeta de crédito en modo desglosado o resumido | **Pendiente** | — | Aprobar |
| D31 | Fusible de borrado masivo en Sheets (10 % o 20 filas) | **Pendiente** | — | Aprobar el concepto |
| D32 | Copias manuales: cifradas, 3 copias o 90 días | **Pendiente** | — | Decidir |
| D33 *(nueva)* | Qué cifra va arriba en Inicio: **a mercado** si hay valoraciones; si no, a coste. Siempre las dos visibles | **Pendiente** | — | A mercado arriba, a coste debajo |
| D34 *(nueva)* | Cuentas sin punto de partida: suma solo la parte conocida (2.1.3). La alternativa, excluirlas del todo, rompe E4 en las transferencias | **Pendiente** | — | Sumar la parte conocida |
| D35 *(nueva)* | Actualidad: al día ≤ 7 días, desactualizado > 31 días; una valoración desactualizada **sale** de la cifra a mercado | **Pendiente** | — | Aprobar |
| D36 *(nueva)* | Texto «Cobrado sin coste conocido» y su línea en Inversión (2.2.2) | **Pendiente** | — | Aprobar |
| D37 *(nueva)* | El precio de una operación cuenta como valoración de mercado de ese día (K4) | **Pendiente** | — | Aprobar |
| U31 | Umbral de «desactualizado» de 31 días | **Pendiente** (lo concreta D35) | — | Aprobar junto con D35 |
| PF | Estructura de fases: fase 0, fase 1 y posteriores | **Aprobada** | Fijada por ti en el encargo v3.1, §10 | — |
| PM | Multidivisa y cripto fuera de la fase 1 | **Aprobada** | Encargo v3.1, §6 | — |
| PE | No implementar nada hasta que apruebes la arquitectura | **Aprobada** | Todos tus encargos de arquitectura | — |
| DF | Validación fiscal con un asesor | **Aplazada** | Capa fiscal en fases posteriores | — |
| DL | Validación legal: ¿hay alguna obligación de conservar datos tras una baja? | **Pendiente** (externa) | — | Consultarlo antes de la subfase 1a |

**No hay ninguna «Aprobada con condiciones»:** no me consta que hayas aprobado nada con un límite expreso.

---

## 5. Autoauditoría final

| Pregunta | Respuesta |
|---|---|
| **¿Se presenta alguna cifra híbrida?** | **No.** El «patrimonio conocido» de la v3.1 desaparece como cifra. La cifra a coste usa solo partes conocidas a coste. La de mercado usa solo valoraciones, con el precio de operación como valoración legítima de su día (K4). No se resta una de otra si sus coberturas no coinciden (I21). |
| **¿Se mantiene un solo canónico (E2)?** | Sí: la cifra a coste es Σ bolsas sobre lo declarado. La de mercado es la capa F2b (A4) y lleva siempre su nombre. |
| **¿Puede el patrimonio a coste subir de forma artificial al vender algo sin coste?** | **No.** Es un traspaso P(a)·sc → efectivo (E4). Demostrado en 2.2.2–2.2.4 y en N4–N7. Solo sube cuando hay un realizado **calculable** (N7) o cuando el usuario aporta el coste, y entonces el cambio cae en **la fecha del lote**, no en la de la venta (N5). |
| **¿Se inventa un coste, una ganancia o una pérdida?** | No. Las partes indeterminadas no se convierten en número (I23); el resultado de esa parte es «no calculable». |
| **¿Puede la parte conocida negativa confundir al usuario?** | **Es el riesgo principal de esta versión.** Por eso no se enseña como «−1.000 €», sino como «Cobrado sin coste conocido: 1.000 €», con su explicación (D36). Hay que probarlo con usuarios reales. |
| **¿Garantiza `vinculos` las seis propiedades?** | Cinco con restricciones declarativas, más un *trigger* que solo comprueba (sin modificar nada). Una («un solo `origen` vigente por hecho») queda en la función y en las pruebas, porque indexarla obligaría a modificar filas. Lo he dicho, no lo he escondido. |
| **¿Se confunde una cuenta sin saldo con una posición sin coste?** | No: dimensiones 2 y 3 distintas, con etiquetas distintas (2.4.1). |
| **¿Se puede dar por «verificado» solo porque los saldos están al día?** | No. «Completo y verificado» exige además la declaración de cuentas y, según la cifra, los costes completos o todas las valoraciones al día (2.4.2). |
| **¿Se ha contradicho `docs/MOTOR.md`?** | No. A5 (reescrita) usa E1, E4 y §8 tal como están, y T3 al recibir el coste. A2 y A4 añaden métricas auxiliares y la capa prevista en F2b. Las enmiendas siguen siendo las mismas 5, con texto nuevo en A2 y A5. |
| **¿Se ha añadido complejidad innecesaria?** | Se ha añadido la idea de **parte indeterminada** (un concepto para tres casos: cuenta sin punto de partida, lote sin coste y venta sin coste) y las **restricciones** de `vinculos`. A cambio se quita una cifra (el patrimonio conocido híbrido) y la clasificación especial «capital anterior» en las ventas. Neto: **más sencillo** que la v3.1. |
| **¿Se ha duplicado alguna funcionalidad que ya existe?** | No. P(a)·sc no es una tabla: es una forma de agrupar los lotes que el motor ya calcula. Las dimensiones de 2.4 sustituyen la «cobertura» de la v3.1, no se suman a ella. |
| **¿Qué sigue sin estar suficientemente justificado?** | (1) **Los umbrales de actualidad** (7 y 31 días) y la **caducidad** de la declaración (90 días): son opiniones de producto. (2) **D35:** que una valoración caducada salga de la cifra hace que esta caiga de golpe; es riguroso, pero puede desconcertar. (3) **D34:** la parte conocida de una cuenta sin punto de partida puede ser negativa y rara a la vista. Es el precio de no romper E4. (4) **El *trigger* de `vinculos`** depende de bloquear filas de `observaciones` (`for update`) sin modificarlas; con mucha concurrencia habrá que medirlo [V]. (5) **El aportado «conocido»** puede quedar por debajo de cero cuando hay aportaciones anteriores desconocidas; la explicación en pantalla está sin probar con usuarios. |
