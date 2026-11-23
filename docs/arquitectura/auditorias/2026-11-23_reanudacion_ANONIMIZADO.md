Ya he revisado el repositorio y he pasado los tests del motor. Te dejo el informe completo. **No he modificado nada ni he tocado producción.**

---

# Palanca — Reanudación y cierre de la arquitectura V3.2

## 0. Qué he revisado

| Fuente | Qué he mirado | Ubicación real |
|---|---|---|
| `docs/MOTOR.md` | §0–§10 | Repositorio |
| V3, V3.1 y V3.2 | Completas | **Fuera del repositorio**: `/tmp/claude-0/-home-user-palanca/62d1cdb4-c1f4-53c2-bf02-f63d50418b9c/scratchpad/ARQUITECTURA-V3*.md` |
| Auditorías de D34 (primera, segunda y tercera) | Completas | **Solo en esta conversación**, no hay archivo |
| Código | El motor, el saldo del alta, los ajustes, `useSaldo`, `Patrimonio.jsx`, `ImportarHistorial.jsx` y los `.sql` | Repositorio |
| Tests | `motorInvariantes.test.js`: **17/17 en verde** (lo he ejecutado ahora) | Repositorio |

**Hallazgo de organización** [C]: **toda la arquitectura V3–V3.2 vive en una carpeta temporal y en el chat.** Si el contenedor se recicla, se pierde. No está en el repositorio ni en ningún sitio guardado.

## 1. Documentación frente a código frente a tests

| Concepto de la arquitectura | Documentado | En el código | Con tests |
|---|---|---|---|
| Motor en céntimos, una sola fuente de cálculo | ✅ MOTOR P1–P3 | ✅ `movimientosUtils.js` | ✅ fuzz |
| `tipo_evento`, cuentas, FIFO, lotes, coste desconocido | V3–V3.2 | ❌ **nada** (0 resultados al buscar `tipo_evento`, `fifo`, `coste_estado`) | ❌ |
| Atestaciones, residuos, vínculos, observaciones | V3–V3.2 + auditorías | ❌ **nada** | ❌ |
| Versionado y prohibición de borrar | MOTOR H1 | ❌ (borrados físicos en 6 sitios de la app y 3 del conector) | ❌ |
| Venta con «el exceso es ganancia» (Fase 1) | MOTOR E4 (nota de la Fase 1) | ✅ `bolsas()` | ✅ **un test lo fija** (`motorInvariantes.test.js:158`). **Es contrario a A5** |

**Conclusión: ninguna pieza de la V3.x está implementada.** Todo lo que sigue son diseños **sin probar en SQL**.

**Tres hallazgos nuevos en el código** [C]:
1. **`perfiles.saldo_inicial`** existe en el SQL (`supabase-migracion-localstorage.sql:59`), pero **ningún componente lo usa** (búsqueda sin resultados). Puede tener datos antiguos de la época de localStorage. Sería **una segunda fuente de saldo inicial**, además del Ajuste del alta → **REQUIERE COMPROBACIÓN EN PRODUCCIÓN**.
2. **Una reconciliación sin diferencias no deja ningún movimiento.** Si la diferencia es menor de 1 céntimo, `Patrimonio.jsx` no crea ajuste y solo guarda `perfiles.ultima_reconciliacion` (`useSaldo.js:73`), **que se sobrescribe cada vez**. Las verificaciones con residuo 0 de antes **se han perdido**, salvo la última.
3. **El test de la línea 158 tiene que cambiar a propósito** cuando se aplique A5. Es un cambio de regla, no un fallo.

---

## 2. Registro maestro de control (propuesto)

Propongo guardarlo como `docs/CONTROL.md` **cuando lo apruebes**. Ahora no creo el archivo.

````markdown
# Palanca — Registro maestro de control

## 1. Qué es Palanca
App de inteligencia financiera personal: reconstruye y mantiene una visión correcta de la
situación de una persona a partir de lo que apunta y de las fuentes que conecta, sin
depender de ninguna. El motor es único; las fuentes son adaptadores.

## 2. Principios no negociables (en este orden)
1. Precisión financiera: céntimos exactos; ninguna cifra inventada; lo desconocido se dice.
2. Trazabilidad: nada se borra en el uso normal; todo cambio tiene versión, autor y motivo.
3. Seguridad y privacidad: RLS, mínimo privilegio y supresión RGPD completa.
4. Sencillez: un motor, una regla por concepto, sin duplicar.
5. Experiencia excelente, nunca a costa de 1–4.

## 3. Fases y estado
| Fase | Contenido | Estado |
|---|---|---|
| Fase 1 actual (producto en marcha) | Motor en céntimos, app, Fulcro, conector | EN PRODUCCIÓN |
| Arquitectura V3.x | Diseño del núcleo | EN REVISIÓN (no aprobada) |
| 0 · Seguridad | Copia ✅ · restaurar · cifrar · esquema real · Preview → dev · RLS/roles · D6 · foto de números | EN CURSO (1 de 9) |
| 1a Integridad (versiones, nada de borrados) | | NO INICIADA |
| 1b Coherencia (céntimos, claves foráneas compuestas, tipo_evento) | | NO INICIADA |
| 1c Cuentas, pasivos y tarjetas | | NO INICIADA |
| 1d Inversiones (FIFO, coste desconocido) | | NO INICIADA |
| 1e Saldos, atestaciones y cobertura | | NO INICIADA |
| 1f Observaciones, vínculos y conciliación | | NO INICIADA |
| Posteriores | Fulcro escribe, capturas de saldo, valor de mercado completo, Sheets B, fiscal, Open Banking, multidivisa | APLAZADAS |

## 4. Decisiones: APROBADAS / CON CONDICIONES / PENDIENTES / RECHAZADAS
(tabla de la sección 3 de este informe, que se mantiene aquí)

## 5. Riesgos (sección 6 de este informe)

## 6. Criterios de aceptación de cualquier fase
- Tests del motor y de SQL en verde (fuzz + casos concretos + base de datos con dos usuarios).
- Foto de números por usuario: igual (migración conservadora) o con cada diferencia explicada (correctora).
- Ninguna cifra sin cobertura; ningún residuo sumado al canónico.
- Primero en dev; vuelta atrás probada; vista previa para el usuario.

## 7. Próximo paso
(sección 8 de este informe)
````

---

## 3. Lista cerrada de decisiones

**Criterio:**
- **APROBADA** solo si **tú** la decidiste de forma expresa.
- **RECHAZADA** = la retiré porque se demostró una contradicción. Necesita tu confirmación.
- **No hay ninguna «aprobada con condiciones»**, porque no has aprobado nada con un límite expreso.

| ID | Decisión | Estado | Justificación |
|---|---|---|---|
| D20a | Tu Excel original, solo lectura | **APROBADA** | Lo decidiste tú («EL EXCEL ES INTOCABLE») |
| PF | Estructura en fase 0, fase 1 y posteriores | **APROBADA** | Encargo V3.1, §10 |
| PM | Multidivisa y cripto fuera de la fase 1 | **APROBADA** | Encargo V3.1, §6 |
| PE | No implementar nada sin tu aprobación | **APROBADA** | Todos los encargos |
| A1 | Apuntes derivados, no guardados | PENDIENTE | Correcta; falta tu visto bueno |
| A2 (revisada en la 3.ª auditoría) | Canónico / anclado / residuos por tramo y acumulado / cobertura / etiquetas de D51 | PENDIENTE | Coherente; corrige la V3.2 §2.1.1–2.1.2 |
| A3 | Excepción RGPD en H1 | PENDIENTE | Obligatoria por ley; depende de D28 y DL |
| A4 | Valor ≠ coste, en versión mínima | PENDIENTE | Correcta |
| A5 | Coste desconocido con P(a)·sc | PENDIENTE | Demostrada (V3.2 §2.2); faltaban los puntos que se cierran en la sección 4.B |
| R3 / D50 | Migración conservadora o correctora | PENDIENTE, **necesita cambios** | **Su catálogo (B1, B2) no cubre FIFO ni A5** → bloquearía tu propia migración (4.D-2) |
| D2 | FIFO por activo y usuario **entre plataformas** | PENDIENTE, **necesita cambios** | Contradice tener posiciones por cuenta (4.D-1) → D55 |
| D3, D4, D6, D17, D19, D21, D22, D29–D34, D36–D38, D40, D42, D46 | Las de la V3.2 y las auditorías | PENDIENTE | Coherentes; falta tu decisión |
| D18 | Vincular solo con puntuación alta | PENDIENTE | Con un efecto: si es «no», `politica_id` sobra en la fase 1 (4.C) |
| D7–D14, D15, D16, D20b, D23–D25, D27, DF, DL | El Excel, datos, coste, opciones futuras y validaciones externas | PENDIENTE | Las de D23–D25, D27 y DF se deciden en fases posteriores |
| D28 | Rol dedicado para la supresión | PENDIENTE | Hay que verificar en dev que Supabase lo admite |
| D41 | `saldo_inicial` al empezar el día ≡ atestación al cerrar el día anterior | PENDIENTE (**solo** para saldos exactos) | Retirada para el saldo del alta (3.ª auditoría, §4) |
| D48–D53 | Solo atestaciones individuales, cuenta histórica + corte, R3, etiquetas, saldo del alta, no repartir la historia | PENDIENTE | Coherentes (3.ª auditoría); D50 necesita el cambio de 4.D-2 |
| D1, D5, D26 | Sustituidas por A2, A1 y A5 | **RECHAZADA** | Las cubre otra decisión |
| D35, D44, D45 | Umbrales y etiquetas anteriores | **RECHAZADA** | Sustituidas por D51 (el umbral de 7 días no tenía justificación) |
| D39, D43, D47 | Anclado sin condiciones, migración de ajustes, R3 «al céntimo» | **RECHAZADA** | Contradicciones demostradas en la 2.ª y la 3.ª auditoría |
| — | Atestación agregada + enmienda de §0 | **RECHAZADA** | Ambigua (3.ª auditoría, §1) |
| — | «Capital anterior» en las ventas sin coste (V3.1) | **RECHAZADA** | Creaba patrimonio artificial |
| — | «Patrimonio conocido» híbrido (V3.1) | **RECHAZADA** | Mezclaba criterios |
| — | «Coste estimado 0» (V3) | **RECHAZADA** | Inventa un coste |
| — | «El saldo del alta se migra a `saldo_inicial` sin cambiar números» (V3 y V3.1) | **RECHAZADA** | Falso si hay movimientos anteriores |
| **D54** *(nueva)* | Orden FIFO: los lotes de apertura sin fecha van antes que todos los conocidos; los demás, por su fecha de adquisición | PENDIENTE | 4.B-6 |
| **D55** *(nueva)* | FIFO **patrimonial por (activo, cuenta)**; FIFO **fiscal entre plataformas**, solo en la capa fiscal | PENDIENTE | 4.D-1 |
| **D56** *(nueva)* | En una venta, R = neto de comisión **y de retención**; la retención se guarda para lo fiscal | PENDIENTE | 4.B-8 |
| **D57** *(nueva)* | Añadir al catálogo de R3: **B3** «cambio de política de coste (FIFO o A5)» y **B4** «conversión de un tapón en atestación» | PENDIENTE | 4.D-2 |
| **D58** *(nueva)* | Tres precisiones para los saldos: `exacta`, `aproximada` y `reconstruida` (la de un ajuste antiguo calculada a partir de su diferencia) | PENDIENTE | 4.A |
| **D59** *(nueva)* | Qué hacer con `perfiles.saldo_inicial` (antiguo) | PENDIENTE (**REQUIERE COMPROBACIÓN EN PRODUCCIÓN**) | Hallazgo 1 de la sección 1 |
| **D60** *(nueva)* | Guardar la V3.x y las auditorías en el repositorio (`docs/arquitectura/`, sin datos personales) | PENDIENTE | Riesgo de perderlas |

---

## 4. Revisión acotada de los cuatro bloques

### BLOQUE A — D49, D50, D51 y D52 (lo que sigue pendiente)

| Tema | Estado | Qué falta |
|---|---|---|
| Ajustes antiguos → atestaciones | Diseño coherente (D49 + D52) | La comprobación en producción de cuántos hay de cada clase |
| Saldo absoluto frente a diferencia | Resuelto: la reconciliación y la importación guardan **la diferencia** [C]; el saldo absoluto se **reconstruye** con `created_at` | Llamarlo `reconstruida` (D58) para que nunca se confunda con `exacta` |
| Movimientos registrados después | Resuelto (corrección B1) | — |
| Movimientos con fecha anterior a una atestación | Resuelto: caen en su tramo y cambian solo ese residuo (2.ª auditoría, §1) | — |
| Borrados físicos que no se pueden detectar | **NO RESUELTO, y no se puede resolver hacia atrás** | Condición: **la fase 1a va antes que cualquier migración de ajustes**, para que a partir de ahí todo quede registrado. La vista previa avisa del límite |
| Saldos exactos, aproximados y reconstruidos | Propuesta: D58 | Aprobarla |
| Residuo 0 frente a «sin diferencias registradas» | **Hallazgo:** las reconciliaciones con residuo 0 de antes **no existen como dato**, salvo la última (`ultima_reconciliacion`) | Migrar la última como atestación `reconstruida` (K en ese instante, con residuo 0); las anteriores, **perdidas**: se dice así |
| Saldo del alta | D52: aproximado, con instante y alcance por confirmar | La comprobación en producción (P4 de la 3.ª auditoría) y D59 |
| Saldos de 0 o negativos | En el alta no se pueden registrar [C]; en la reconciliación sí (`enNegativo`) [C]; en la importación sí (`parseImporteConSigno`) [C] | D42 (`saldo_inicial` 0 o negativo) y, aparte, permitir 0 o negativo en el alta. Es un cambio de producto, no de arquitectura |
| Fecha efectiva, registro e instante | Resuelto: `fecha` (efectiva, sin hora) · `created_at` / `registrado_en` (registro) · `instante` (solo si se conoce) | — |

### BLOQUE B — Ventas sin coste conocido (cierre de P1 a P10)

E = exterior · Ef = efectivo · P = lotes conocidos · Psc = parte sin coste. A coste = Ef + P + Psc.

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

**Ninguna operación crea patrimonio:** en todos los casos, Δ a coste = Σ de los apuntes con extremo en E (E3), y las ventas sin coste no tienen extremo en E.

### BLOQUE C — `vinculos`: integridad y seguridad

**Nada está implementado ni probado en SQL.** Lo que sigue son las propuestas para cerrar V1 a V11 del bloque 3.

| # | Pendiente | Propuesta | Necesita |
|---|---|---|---|
| V1 | `SECURITY INVOKER` frente a «solo `SELECT`» | Escritura con funciones `SECURITY DEFINER` cuyo **dueño es un rol dedicado** (`palanca_escritor`), con `set search_path`, comprobación de `auth.uid()`, `revoke` a `public`/`anon` y `grant execute` solo a `authenticated`. `INSERT` en la tabla solo para ese rol | Verificar en dev que Supabase lo permite (igual que D28) |
| V2 | `FOR UPDATE` sin permiso `UPDATE` | **Sustituirlo por `pg_advisory_xact_lock`** sobre el id de la observación: **no necesita permisos**. Además, `vin_lineal` ya impide la carrera de forma declarativa | Una prueba de concurrencia |
| V3 | RLS | `SELECT` con `usuario_id = auth.uid()::text`; sin políticas de escritura | Una prueba con dos usuarios |
| V4 | `politica_id` sin clave foránea | **Quitarlo de la fase 1** (también `autor = 'politica'`), si D18 es «no por defecto» | D18 |
| V5 | El *trigger*, sin código | Se escribe en la implementación | Pruebas |
| V6 | Errores | Catálogo: `VINCULO_NO_VIGENTE`, `OBSERVACION_AJENA`, `DESTINO_INCOMPATIBLE`, `ORIGEN_DUPLICADO`, `CONFLICTO_VERSION` | — |
| V7 | Pruebas de concurrencia | Dos sesiones en el PostgreSQL 16 local: a la vez, la misma observación y el mismo vínculo vigente → **una gana y la otra recibe un error** | Pruebas |
| V8 | Un solo `origen` vigente por hecho | Dentro de `confirmar_propuestas`: un bloqueo por hecho + comprobación. **Se puede saltar con la service key**; un usuario no puede. Se completa con una consulta de invariante en el CI | Pruebas |
| V9 | Hechos anulados | El vínculo se mantiene; el conciliador marca la observación como «huérfana, revisar» | — |
| V10 | Supresión RGPD | `DELETE … WHERE usuario_id = uid` en **una sola orden**, que no choca con la clave foránea a sí misma porque se comprueba al final de la orden. Los reintentos de `borrar_mi_cuenta` resuelven el orden entre tablas [C] | Una prueba en dev |
| V11 | Rendimiento de la vista | Anti-*join* con el índice `vin_lineal`; medirlo con 100.000 filas sintéticas | Una prueba de carga |

### BLOQUE D — Coherencia integral: contradicciones **reales** encontradas

| # | Contradicción | Demostración | Solución propuesta |
|---|---|---|---|
| **D-1** | **El FIFO entre plataformas (V3 §6.1 y D2) choca con tener posiciones por cuenta** | Tienes 5 acciones en TR (compradas en 2025) y 5 en MyInvestor (compradas en 2024). Vendes 5 en TR. FIFO entre plataformas les asigna **el coste del lote de MyInvestor**: TR se queda con 0 acciones y coste 0, pero MyInvestor sigue con 5 acciones **con el coste del lote de TR**. **Las unidades y el coste quedan descuadrados en cada cuenta** | **D55:** FIFO patrimonial por (activo, cuenta); el FIFO entre plataformas, solo en el informe fiscal |
| **D-2** | **El catálogo de R3 (D50) bloquearía la migración principal** | El FIFO cambia el patrimonio [cifra personal retirada] en tu caso, y A5 cambia el de cualquier usuario con «ganancias» del tope de `bolsas()`. Ninguno de los dos es B1 ni B2 → **se bloquea** | **D57:** añadir B3 (cambio de política de coste, con la lista de ventas afectadas como prueba) y B4 (tapón → atestación) |
| **D-3** | **La V3.2 §2.1.2 dice «Patrimonio a coste… es el canónico» y la A2 revisada muestra el anclado** | Texto frente a texto | Que la V3.3 consolide la A2 revisada |
| **D-4** | **El orden de fases V3.1 (1d antes que 1c) frente a D55** | Si el FIFO es por cuenta, la subfase 1d necesita cuentas | Con **D49**, todas las posiciones están primero en la cuenta histórica L, así que 1d puede ir antes. El orden se mantiene |
| **D-5** | **MOTOR R3 («al céntimo»)** frente a las migraciones correctoras | Literal | Enmienda de R3 (D50 + D57) |
| **D-6** | **El test de la línea 158** fija la regla que A5 sustituye | Código | Cambiarlo a propósito en la fase 1d; no es un fallo |

**El resto es coherente con `MOTOR.md`.** Lo he comprobado regla por regla en las tres auditorías, y las contradicciones de arriba son las únicas que siguen abiertas.

---

## 5. Pruebas que faltan

**Ninguna existe hoy.** Hay que escribirlas en las fases correspondientes.

1. **Pruebas de SQL en un PostgreSQL local:**
   - restricciones de `vinculos` (cruzar usuarios, ciclos en una misma orden, sustituir un vínculo que no es el vigente);
   - RLS con dos usuarios;
   - supresión RGPD con las tablas protegidas;
   - concurrencia con dos sesiones.
2. **Pruebas del motor:**
   - el teorema anclado = canónico + residuos (fuzz);
   - B-1 a B-10;
   - las transferencias T1 a T5 (2.ª auditoría);
   - etiquetas D51 (los 5 escenarios de la 3.ª auditoría).
3. **Pruebas de migración:**
   - rejilla de R3 con datos sintéticos de las clases (a) a (d);
   - corrección B1 con `created_at`.
4. **Comprobaciones en producción (solo lectura):** las de la 3.ª auditoría, más `perfiles.saldo_inicial` (D59).

## 6. Riesgos que quedan

| Riesgo | Gravedad |
|---|---|
| **Perder la arquitectura** (carpeta temporal y chat) | **Alta** → D60 |
| La copia de seguridad **sin restaurar** y **sin cifrar** | **Alta** (fase 0) |
| Los borrados físicos de antes de la fase 1a no se pueden reconstruir | Media (está asumido y se avisa) |
| Que Supabase no admita los roles dedicados (D28 y V1) | Media → hay que verificarlo en dev **antes** de la fase 1a |
| El esquema de producción es distinto del repositorio | Media (fase 0) |
| Que el usuario no entienda el «cobrado sin coste conocido» o el salto del anclado | Media → probarlo con usuarios |

---

## 7. ¿Se puede aprobar la V3.2?

**No tal como está.** Le faltan las correcciones de las tres auditorías y estas cuatro cosas:
- **D55** (el FIFO por cuenta, D-1);
- **D57** (el catálogo de R3, D-2);
- los puntos **B-4b, B-6 y B-8** (el bloque B);
- la **A2 revisada** (D-3).

Recomiendo **una V3.3 consolidada** que:
- incorpore todo lo anterior **sin rediseñar nada**;
- marque cada decisión con los cuatro estados de este informe;
- y quede guardada en el repositorio, sin datos personales.

Después, la apruebas o la rechazas **decisión por decisión**.

**Orden de resolución:**
1. **Ya:** D60 (guardar la arquitectura) y la fase 0, que haces tú: restaurar la copia, cifrarla y Preview → dev.
2. **La V3.3 consolidada.**
3. **Tu aprobación, en este orden:**
   - lo que bloquea la fase 1a: A1, A3, D6, D28 y DL;
   - después, lo de 1b a 1d: D2/D55, D3, A5, D54, D56 y D57;
   - por último, lo de 1e y 1f: A2, D34, D38, D48–D53, D58, D59 y el resto.
4. **Comprobaciones en dev:** los roles (D28 y V1).
5. **Comprobaciones en producción**, en solo lectura y con tu permiso.
6. **Implementar la fase 1a.**

---

## 8. El siguiente prompt (para copiar)

````
PALANCA — CONSOLIDACIÓN V3.3 (sin implementar)

Reglas: no implementes código, no toques producción, Supabase ni Vercel, no ejecutes migraciones.
Solo puedes crear archivos de documentación nuevos en docs/arquitectura/ (sin datos personales ni
cifras reales de ningún usuario) y hacer commit y push a la rama de desarrollo.

1. Copia a docs/arquitectura/ la V3, la V3.1 y la V3.2 tal cual, revisando antes que no contengan
   datos personales; si los contienen, sustitúyelos por ejemplos sintéticos y dime qué has cambiado.
2. Crea docs/arquitectura/ARQUITECTURA-V3.3.md, que consolide SIN rediseñar:
   - las tres auditorías de D34 (A2 revisada, D48–D53);
   - las correcciones del informe de reanudación: D54, D55, D56, D57, D58, B-4b, B-8, V1–V11;
   - la tabla única de decisiones con los estados APROBADA / APROBADA CON CONDICIONES / PENDIENTE /
     RECHAZADA, sin marcar como aprobado nada que yo no haya aprobado.
3. Crea docs/CONTROL.md con el registro maestro propuesto.
4. Al final, entrégame un formulario de decisiones (una línea por decisión: ID, pregunta en una
   frase, tu recomendación, y espacio para «sí / no / cambiar») para aprobarlas por bloques, empezando
   por las que bloquean la fase 1a.

No avances a implementación.
````

---
🔔 **Pendientes tuyos, guardados:**
1. **S1:** faltan la **prueba de restaurar** la copia, **guardarla cifrada** (D32) y decidir si pasas a Supabase Pro (D16).
2. **S2:** que las vistas previas de Vercel apunten a «palanca dev».
3. **Aprobar o no D60** (guardar la arquitectura en el repositorio) y después la V3.3, decisión por decisión.
4. **Las 8 decisiones** del Excel y el extracto del banco con saldo (D15).
5. **La cuenta de Google de solo lectura.**
6. **Decidir los colores** para el Perfil.