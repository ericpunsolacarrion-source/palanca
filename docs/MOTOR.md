# Constitución del motor financiero de Palanca

> **Estado: versión final estable (sellada).** Este documento define el
> **contrato** del motor: las propiedades que promete cumplir siempre, con
> independencia de cómo esté implementado. Mientras estas invariantes se
> respeten, el motor puede reimplementarse por dentro sin que Palanca pierda
> coherencia. A partir de aquí no se modifica el contrato: se implementa sobre él.
>
> Diseño de referencia asociado (entidades, traducción, migración): ver el
> historial de decisiones del proyecto. Arquitectura aprobada e inamovible:
> **nodos, hechos versionados, apuntes, estado derivado y reconciliación.**

---

## §0. Vocabulario

- **Nodo**: un lugar donde puede haber valor. Es una **bolsa** (dentro de tu
  patrimonio) o el **exterior** (fuera de tu frontera; se representa como la
  ausencia de bolsa).
- **Apunte**: la unidad interna. Un importe **positivo** que sale de un nodo
  origen y entra en un nodo destino. Es inmutable.
- **Hecho**: la acción declarada. Se traduce a uno o más apuntes. Está
  **versionado**. Lleva:
  - un **`tipo_evento`**: vocabulario estructural **controlado** (enumerado, no
    libre) que determina su traducción a apuntes y su clasificación de flujo;
  - una **categoría/motivo**: semántica **libre**, sin rol estructural;
  - una **procedencia** (ver §9, F4).
- **Estado derivado**: patrimonio, saldos, flujos, residuos. Nunca se almacena;
  siempre se calcula.
- **Atestación**: afirmación de que una bolsa tenía un saldo real en una fecha.
  Es un Hecho.
- **Fecha económica**: cuándo ocurrió algo. Es el **único** tiempo del motor.

---

## §1. Invariantes estructurales (E)

- **E1 — Partida.** Todo apunte mueve un importe > 0 de un origen a un destino.
  Lo que sale de un lado entra exactamente en el otro. El valor no se crea ni se
  destruye dentro del sistema: solo cruza la frontera.
- **E2 — Patrimonio derivado y único.** `patrimonio = Σ saldos de las bolsas`,
  siempre. Es una **única** cifra. Nunca es un número guardado y autoritativo.
- **E3 — Teorema de frontera.** El patrimonio cambia por un Hecho **si y solo
  si** alguno de sus apuntes tiene un extremo en el exterior. Equivalente:
  `patrimonio = Σ entradas − Σ salidas`.
- **E4 — Traspaso neutro.** Si los dos extremos de un apunte son bolsas, el
  patrimonio no cambia. Exacto por construcción, no por vigilancia.
- **E5 — La estructura manda, no la semántica.** El efecto de un Hecho sobre el
  **patrimonio** depende solo de entre qué nodos se mueve el valor. La
  categoría/motivo nunca determina ese efecto.
- **E6 — Los flujos derivan del `tipo_evento`.** Las métricas de flujo
  (ingresos, gastos, ahorro, tasa) se computan del **vocabulario estructural
  controlado** (`tipo_evento`), no solo de la dirección entrada/salida. Un
  reembolso no es un ingreso: entra por su propio `tipo_evento` (`devolucion`,
  que cuenta como contra-gasto), no como entrada genérica. Añadir un
  `tipo_evento` es cómo entran nuevos eventos realizados (ver §9, F1/F2a); no es
  semántica libre.

---

## §2. Invariantes temporales (T) — monotemporal

- **T1 — Un solo eje para el patrimonio.** El patrimonio y los saldos de las
  bolsas son función exclusiva de los apuntes vigentes proyectados por
  `fecha_economica`. No dependen de `created_at` ni de la hora actual.
- **T2 — Una sola verdad por fecha.** El patrimonio a fecha D es el pliegue de
  los apuntes vigentes con `fecha_economica ≤ D`. No hay dos interpretaciones
  ("lo que sabías" / "lo que sabes").
- **T3 — Corregir el pasado corrige la foto, no la congela.** Registrar hoy una
  corrección con fecha pasada actualiza el patrimonio de aquel periodo a la
  realidad correcta, sin destruir nada de lo anterior.

**Usos sancionados de `created_at`.** `created_at` puede usarse en señales
auxiliares (recordatorios, "días sin registrar"), en el corte de consolidación
para logros, en el desempate de orden (ver §4), en snapshots y en auditoría. La
"liquidez consolidada" es una **métrica auxiliar conservadora, explícitamente
distinta del patrimonio canónico** (E2).

---

## §3. Invariantes de precisión (P)

- **P1 — Céntimos enteros.** Todo importe **almacenado** del núcleo es un entero
  de céntimos. El float no existe dentro del motor.
- **P2 — Agregación exacta.** Las agregaciones del estado derivado (sumas de
  importes almacenados) son exactas y no redondean.
- **P3 — Redondeo solo en los bordes.** Solo se redondea al presentar, nunca en
  el almacén.
- **P4 — Generación que conserva.** Toda traducción que **genere** importes
  (intereses, FX, prorrateos, repartos) debe: (a) redondear a céntimos de forma
  determinista; y (b) **conservar** — la suma de las partes es exactamente igual
  al total de origen; el céntimo residual se asigna explícitamente (p. ej. resto
  mayor). Ninguna generación de importes crea ni destruye valor: respeta E1.

---

## §4. Invariantes de historia (H) — la historia no se pierde

- **H1 — Nada se borra ni se sobreescribe.** Editar o borrar crea una **versión
  nueva**; las versiones previas y sus apuntes permanecen para siempre.
- **H2 — Como máximo un vigente por linaje.** En todo momento hay como máximo una
  versión `vigente` por `hecho_id`; el estado actual del linaje lo define su
  **última** versión (`vigente` / `superado` / `anulado`). Un linaje `anulado`
  puede **reactivarse** añadiendo una nueva versión `vigente` (deshacer un
  borrado), respetando R1. Nunca dos vigentes.
- **H3 — El cálculo solo lee lo vigente.** El estado derivado usa exclusivamente
  apuntes de versiones `vigente`. Lo `superado`/`anulado` vive para auditoría,
  fuera del cálculo.
- **H4 — Apunte inmutable.** Un apunte, una vez escrito, jamás cambia de importe
  ni de nodos. Las correcciones se expresan con versiones nuevas, nunca mutando
  un apunte.
- **H5 — Reconstruibilidad.** La historia completa de cualquier Hecho (todas sus
  versiones y cuándo se registró cada una) es siempre reconstruible.
- **H6 — La reconciliación también es historia.** Una atestación es un Hecho: se
  versiona, no se pierde y se puede corregir, igual que cualquier otro.
- **H7 — Convergencia ante concurrencia.** Ante versiones concurrentes del mismo
  linaje (p. ej. dos dispositivos offline) se **conservan todas** (H1) y una
  **regla determinista de orden** (p. ej. reloj lógico + desempate por id)
  selecciona la única `vigente`; el resto pasan a `superado`. La convergencia es
  **determinista e independiente del dispositivo**. La versión ganadora proyecta
  igualmente por `fecha_economica` (no reintroduce `created_at` en el patrimonio;
  solo la *selección* usa metadato de orden, uso sancionado por §2).

---

## §5. Definición de correctitud (C)

- **C1 — Patrimonio correcto (respecto a lo declarado).** El patrimonio es
  correcto cuando es igual, al céntimo, a `Σ entradas − Σ salidas` de todos los
  apuntes vigentes. Esto el motor lo garantiza **siempre**.
- **C2 — Fidelidad a la realidad.** Que lo declarado coincida con la realidad no
  lo puede garantizar el motor: depende de que el usuario registre. La
  reconciliación es el puente **auditable** entre ambas.
- **C3 — Reconciliación correcta.** Una reconciliación es correcta cuando: (a)
  el patrimonio sigue siendo suma pura de bolsas, sin tapones; (b) el desajuste
  con la realidad atestiguada es un **residuo derivado, explícito y etiquetado**;
  (c) ese residuo tiende a 0 **solo** porque aparecen los eventos reales que lo
  explican, nunca porque se oculte. Cuadrar = entender, no tapar.

---

## §6. Reversibilidad (R)

- **R1 — Toda acción del usuario es reversible sin pérdida.** Editar, borrar y
  reconciliar se deshacen registrando nuevas versiones. Como nada se destruye,
  siempre se puede volver a un estado anterior.
- **R2 — Deshacer también se registra.** La reversibilidad no borra el rastro:
  volver atrás es otro Hecho versionado.
- **R3 — Migración reversible.** La migración desde el sistema actual se puede
  revertir, y solo se da por válida si el patrimonio recomputado coincide **al
  céntimo** con el actual.

---

## §7. Qué puede cambiar y qué nunca

**Puede cambiar:** la versión vigente de un Hecho (vía versión nueva), el
conjunto de atestaciones (se añaden), el estado derivado (se recalcula), los
nodos (se añaden o archivan, nunca se borran).

**Nunca cambia:** el contenido de un apunte ya escrito; el contenido de una
versión ya registrada; la `fecha_economica` y `created_at` de una versión
existente; la neutralidad de un traspaso sobre el patrimonio.

---

## §8. Qué nunca puede ocurrir (prohibiciones absolutas)

- **N1** Nunca se pierde un dato histórico.
- **N2** Nunca un traspaso cambia el patrimonio.
- **N3** Nunca el patrimonio se almacena como número autoritativo.
- **N4** Nunca el cálculo del **patrimonio o de los saldos** depende de
  `created_at` ni de la hora actual. (Otras métricas auxiliares sí pueden usar
  `created_at`: ver §2, usos sancionados.)
- **N5** Nunca se falsea el patrimonio con un tapón para cuadrar. El patrimonio
  es único (E2). Una atestación produce un **residuo derivado** que es siempre
  señal diagnóstica mostrada aparte y **jamás se suma al patrimonio**. El residuo
  no es una bolsa.
- **N6** Nunca un importe pierde céntimos por redondeo en el núcleo (ver P4:
  toda generación conserva).
- **N7** Nunca la semántica decide el efecto sobre el patrimonio; solo la
  estructura.
- **N8** Nunca se edita un apunte directamente; solo vía versión de su Hecho.
- **N9** Nunca hay dos versiones vigentes del mismo linaje.

*No-invariante deliberado:* el motor **sí** permite saldos negativos en una
bolsa. Una liquidez negativa es una señal (error o descubierto); una deuda es una
bolsa negativa por diseño. No se prohíben.

---

## §9. Reglas que ninguna funcionalidad futura podrá romper (F)

- **F1 — Todo se expresa en el núcleo, no como excepción a él.** Cualquier
  funcionalidad nueva es, o bien un **nuevo `tipo_evento`** que traduce a apuntes
  entre nodos, o bien un **nuevo tipo de nodo**. Jamás una excepción al cálculo
  del patrimonio.
- **F2a — Los eventos realizados encajan sin tocar el núcleo.** Todo evento
  realizado (dividendos, retirada de inversión, préstamos, transferencias,
  reembolsos) = nueva traducción o nuevo nodo. La retirada de inversión solo
  necesita, además, una política de asignación de coste (FIFO/medio).
- **F2b — Extensión prevista y acotada: valor ≠ coste.** La valoración de
  mercado, la revalorización y la multidivisa con cifra única **no** son "solo
  una traducción": requieren añadir, cuando llegue el momento, una capa de
  **valor ≠ coste** sobre las bolsas (más un atributo de divisa). Es una
  ampliación **aditiva** del modelo, no una excepción al núcleo. Hasta entonces
  rige §10 (patrimonio a coste).
- **F3 — El eje semántico crece libre; el estructural permanece controlado.** Se
  pueden inventar infinitos motivos; el repertorio de efectos posibles de un
  apunte (valor de origen a destino) no crece.
- **F4 — Ningún automatismo opaco fija la verdad.** Todo Hecho lleva una
  **procedencia** ∈ { `manual`, `regla`, `importado` }:
  - `manual`: el usuario la declara directamente.
  - `regla`: generada de forma **determinista** por una instrucción que el
    usuario creó, puede **inspeccionar y detener**, y cuyos Hechos son
    **editables y versionados** como cualquier otro (recurrencias, amortizaciones,
    devengo de intereses de un préstamo configurado por el usuario). El humano
    declaró la **regla**; las instancias son su consecuencia.
  - `importado` (Open Banking) o **sugerido por IA**: propuesto por una fuente
    externa y **ratificado** por el usuario o por una política que el usuario
    definió; editable y marcado.

  Ningún origen puede escribir un Hecho no inspeccionable, no editable o no
  versionado.

---

## §10. La frontera de responsabilidad (qué NO promete)

- No promete que los datos reflejen la realidad si el usuario no la registra
  (garantiza fidelidad a lo declarado, no omnisciencia).
- No promete valoración de mercado: el patrimonio es a **coste** hasta que se
  añada la capa valor ≠ coste (F2b).
- No promete conocimiento retroactivo ("lo que sabías entonces"): es
  monotemporal por decisión consciente.
- No promete **revertir efectos externos ya emitidos** a partir de un estado
  anterior (logros concedidos, notificaciones enviadas, informes exportados). El
  motor garantiza la corrección y recomputabilidad del estado derivado; la **capa
  de consecuencias** debe tolerar la reescritura monotemporal del pasado:
  consumir vistas **consolidadas/estables** o ser **idempotente/revisable**.
