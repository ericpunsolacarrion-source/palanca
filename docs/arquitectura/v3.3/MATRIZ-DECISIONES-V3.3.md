# Palanca — Matriz de decisiones V3.3

Acompaña a `ARQUITECTURA-V3.3-BORRADOR.md` (las secciones «§» remiten a ese documento).

**Estados** (los del encargo):
- **Aprobada:** solo si el usuario la aprobó de forma expresa.
- **Aprobable con condiciones:** lo recomienda el análisis, con sus condiciones. **No está aprobada.**
- **Pendiente de aprobación.**
- **No consolidable** por falta de una fuente.
- **Sustituida.**

**Fuentes:**
- **v2:** `arq_v2_maestro.md` / `arq_v2.md`.
- **V3, V3.1 y V3.2:** `ARQUITECTURA-V3*.md` (las dos en `scratchpad`).
- **Chat:** auditorías y contrastes posteriores, solo en el historial de la conversación. Nombre de cada una:
  - **D34-1/2/3:** primera, segunda y tercera auditoría de D34.
  - **Rean.:** informe de reanudación.
  - **C1–C5:** primer a quinto contraste.
  - **Cierre-1, Cierre-2:** revisiones de cierre.

## 1. Enmiendas a `MOTOR.md`

| ID | Tema | Versión vigente | Estado | Fuente | Dependencias | Condiciones | Pruebas | Riesgo pendiente |
|---|---|---|---|---|---|---|---|---|
| A1 | Apuntes derivados + asignación versionada | A1 + D61 | Pendiente de aprobación | V3.1 §9.2; C2 | D61 | Sin D61 incumple H4 | D61-1, H4 | Cascada de versiones |
| A2 | Métricas auxiliares: anclado, residuos, cobertura, etiquetas; aclaración de T1 | D34-3 + C3 (T1) | Pendiente de aprobación | D34-2/3; C3 | D48, D51, D63 | — | C1–C3 | Que se entiendan las etiquetas |
| A3 | Excepción RGPD en H1 | V3.1 §8.2 | Pendiente de aprobación | V3, V3.1 | D28, DL | Hay que verificar el rol en DEV | RGPD-1 | Que Supabase no admita el rol |
| A4 | Valor ≠ coste, versión mínima | V3.2 K7 + D68 | Pendiente de aprobación | V3.2 | D68 | EUR | V1–V7 | — |
| A5 | Coste desconocido | V3.2 §2.2.5 + D67 (nombres) + D61 | Pendiente de aprobación | V3.2; C3 | D61, D67 | Cambiar los nombres (B frente a PC) | B-1…B-10 | — |
| A6 (= D67) | E2: base conocida B frente a PCq | Texto de C4 | Pendiente de aprobación | C3, C4 | D54 | — | I-G3, I6 | — |
| A7 (= D50 + D57) | R3: migración conservadora o correctora | Rean. + C2 | Pendiente de aprobación | D34-3; Rean.; C2 | D58, D71 | B1 nunca automática | Rejilla R3 | Borrados físicos que no se pueden detectar |

## 2. Decisiones

| ID | Tema | Versión vigente | Estado | Fuente | Dependencias | Pruebas | Riesgo pendiente |
|---|---|---|---|---|---|---|---|
| D1 | Qué patrimonio se muestra | → A2 / A6 | Sustituida | v2 | — | — | — |
| D2 | FIFO por activo y usuario | → **D55** | Sustituida | v2; Rean. | — | — | — |
| D3 | Comisiones de compra dentro del coste; las de venta, restando de R | v2 | Pendiente de aprobación | v2 | — | B-8 | — |
| D4 | El realizado no cuenta en el ahorro; dividendos e intereses sí | v2 | Pendiente de aprobación | v2 | D21 | — | — |
| D5 | Apuntes derivados | → A1 | Sustituida | v2 | — | — | — |
| D6 | Quitar `borrar_movimientos` y `borrar_sobrantes` del conector | v2 | Pendiente de aprobación (fase 0) | v2 | — | `tools/list` | Borrados irreversibles mientras tanto |
| D7–D14 | Las 8 decisiones del Excel del usuario | v2 §14 | Pendiente de aprobación | v2 | D15 | — | Datos personales: fuera de la V3.3 |
| D15 | Extracto del banco con saldo | v2 | Pendiente (es un dato) | v2 | — | — | Sin él, la historia queda sin verificar |
| D16 | Plan Pro de Supabase | v2 | Pendiente de aprobación | v2 | S1 | — | Sin copias automáticas |
| D17 | Autoridad por campo | V3 §8.4 | Pendiente de aprobación | V3 | — | — | Complejidad de configuración |
| D18 | Vincular solo con puntuación alta | V3 §10.2 | Pendiente (recomendación: «no» por defecto) | V3 | D63 | — | — |
| D19 | No guardar las imágenes de las capturas | V3 | Pendiente de aprobación | V3 | — | — | — |
| **D20a** | El Excel original, solo lectura | — | **Aprobada** | Encargo de auditoría | — | — | — |
| D20b | Pestaña «Palanca» en Sheets, con permiso | V3.1 §7.1 | Pendiente (posterior) | V3.1 | D31 | — | — |
| D21 | Dividendos e intereses en neto para el ahorro | V3 | Pendiente de aprobación | V3 | **D72** | — | **Conflicto con D56** (BRECHAS §2) |
| D22 | Los pendientes solo restan del disponible | V3.1 §5.6 + C4 | Pendiente de aprobación | V3.1; C4 | D63 | C10 | — |
| D23 | Bienes (vivienda) | V3 | Pendiente (posterior) | V3 | — | — | Patrimonio neto negativo con hipoteca |
| D24 | Open Banking | V3 §14 | Pendiente (posterior) | V3 | — | — | Coste y contrato |
| D25 | Moneda base y multidivisa | V3 | Pendiente (posterior); **el aplazamiento está aprobado (PM)** | V3 | PM | — | — |
| D26 | Coste desconocido | → A5 | Sustituida | V3 | — | — | — |
| D27 | Más funciones de Vercel | V3 §7.5 | Pendiente (posterior) | V3 | — | `limiteVercel` | Límite de 12 |
| D28 | Rol dedicado para la supresión | V3.1 §8.2 | Pendiente (verificar en DEV) | V3.1 | — | RGPD-1 | Que no se pueda crear |
| D29 | Declaración «estas son todas mis cuentas» (90 días) | V3.2 §2.4.1 | Pendiente de aprobación | V3.2 | — | I24 | Plazo sin justificar del todo |
| D30 | Tarjeta de crédito: desglosado o resumido | V3.1 §5.3 | Pendiente de aprobación | V3.1 | — | N8 | Clasificar mal un «pago de tarjeta» |
| D31 | Fusible de borrado masivo en Sheets | V3.1 §7.2 | Pendiente (posterior) | V3.1 | D20b | — | Umbral sin calibrar |
| D32 | Copias cifradas y retención | V3.1 §8.1 | Pendiente de aprobación | V3.1 | S1 | — | **La copia está sin cifrar** |
| D33 | Cifra principal: a mercado o a coste | V3.2 | Pendiente de aprobación | V3.2 | D68 | — | — |
| D34 | Cuentas sin saldo inicial: suma la parte conocida | D34-1/2 | Pendiente de aprobación | V3.2; D34-1/2 | A2 | T1–T5 (D34-2) | Una parte conocida negativa, rara a la vista |
| D35 | Actualidad de 7 y 31 días | → D51 (saldos) / D68 (valoraciones) | Sustituida | V3.2 | — | — | — |
| D36 | Texto «Cobrado sin coste conocido» | V3.2 | Pendiente de aprobación | V3.2 | A5 | — | Que se entienda |
| D37 | El precio de una operación como valoración | V3.2 K4 | Pendiente de aprobación (está dentro de D68: `naturaleza = operacion`) | V3.2 | D68 | N2 | — |
| D38 | No deducir el saldo inicial a partir de una atestación | D34-1 | Pendiente (recomendación: no deducirlo) | D34-1 | — | — | — |
| D39 | Mostrar el anclado | → A2 | Sustituida | D34-1 | — | — | — |
| D40 | No reconstruir hacia atrás | D34-1 | Pendiente de aprobación | D34-1 | — | — | — |
| D41 | `saldo_inicial` al empezar el día ≡ atestación al cerrar el día anterior (**solo para saldos exactos**) | D34-2 + D34-3 | Pendiente de aprobación | D34-2/3 | — | D34-2 §3 | — |
| D42 | `saldo_inicial` de 0 o negativo | D34-1 | Pendiente de aprobación | D34-1 | — | — | Cambia V3 §13.3 |
| D43 | Migración de ajustes | → D49 + A7 + D52 + D71 | Sustituida | D34-1/2 | — | — | — |
| D44 / D45 | Etiquetas y antigüedad | → D51 | Sustituidas | D34-2 | — | — | — |
| D46 | Clase R3 sin cambios por defecto | D34-2 | Pendiente de aprobación | D34-2 | A7 | — | Tapones antiguos que se quedan |
| D47 | R3 «al céntimo» | → A7 | Sustituida | D34-2 | — | — | — |
| D48 | Atestaciones de una sola bolsa + comprobaciones de conjunto | D34-3 | Pendiente de aprobación | D34-3 | — | Casos 1–6 (D34-3) | — |
| D49 | Cuenta histórica L + corte | D34-3 | Pendiente de aprobación | D34-3 | — | Ejemplo del corte | — |
| D50 | R3 conservadora o correctora | → A7 | (en A7) | — | — | — | — |
| D51 | Etiquetas por alcance; 31 días (saldos); dispersión 0 | D34-3 (la parte de valoraciones → D68) | Pendiente de aprobación | D34-3 | D29 | Escenarios 1–5 (D34-3) | 31 días = un ciclo de extracto (justificación de producto) |
| D52 | Saldo del alta, aproximado | D34-3 | Pendiente de aprobación | D34-3 | — | — | Comprobación en producción (P4) |
| D53 | No repartir la historia anterior al corte | D34-3 | Pendiente de aprobación | D34-3 | D49 | — | — |
| D54 | Grupos de orden indeterminado y escenarios | v3 (C4) | Pendiente (**posterior a la fase 1** por D69) | C3, C4 | D55, D61, D67 | I-G1…G7 | Complejidad |
| D55 | FIFO patrimonial por (activo, cuenta); fiscal entre cuentas | Rean. | Pendiente de aprobación | Rean. | — | — | — |
| D56 | Retenciones → H; liquidación del IRPF | v3 (C4) | Pendiente (**validación fiscal**) | C2, C3, C4 | D64, **D72** | I8, I9 | Interpretación fiscal |
| D57 | Catálogo de R3: B3 y B4 | Rean. | (en A7) | — | — | — | — |
| D58 | Precisión `exacta` / `aproximada` / `reconstruida` | Rean. + D71 v2 | Pendiente de aprobación | Rean. | D71 | A1–A3 | — |
| D59 | Qué hacer con `perfiles.saldo_inicial` | Rean. | **No consolidable** (hace falta un dato de producción) | Rean. | — | — | Una segunda fuente de saldo inicial |
| D60 | Guardar la arquitectura en el repositorio | Rean. | Pendiente (**autorización**) | Rean. | — | — | **Se pierde la arquitectura** |
| D61 | Asignación de coste versionada en la venta | C2 | Aprobable con condiciones | C2 | A1 | D61-1, H4 | Cascada |
| D62 | Capital de apertura aparte de lo aportado | C2 | Pendiente de aprobación | C2 | — | Ejemplo C2 §3 | — |
| D63 | Conciliación | **v6** (Cierre-2) | Aprobable con condiciones | C3 … Cierre-2 | D48, D58, D71 | C1–C12, G1–G4, T1, T2 | Que los límites se superen a menudo |
| D64 | Cómo cuenta la regularización del IRPF en el ahorro | C2 | Pendiente de aprobación | C2 | D56 | — | Es de producto |
| D65 | Grupo cerrado sin orden: «sin asignar» (B) | C3 | Pendiente (posterior, con D54) | C3 | D54 | I-G5 | — |
| D66 | Reproducibilidad | **v4** (Cierre-2) | Aprobable con condiciones | C2 … Cierre-2 | D70 | S1, S2, R1–R8, V1a | Que el entorno no funcione dentro de 10 años |
| D67 | = A6 | — | (en A6) | — | — | — | — |
| D68 | Valoraciones | **v3** (Cierre-2) | Aprobable con condiciones | C5 … Cierre-2 | A4 | V1–V7, Z1, Z2, A1, A2 | Ritmos reales de cada fuente [S] |
| D69 | Intervalos para todos los lotes; si se solapan, pendiente | **v2** (Cierre-1) | Aprobable con condiciones | Cierre-1 | D55 | F1 | — |
| D70 | Núcleo sin reloj; `hoy`, τ y `tz` como parámetros | Cierre-1 | Aprobable con condiciones | Cierre-1 | — | R2, Z1, C11 | **Afecta al código actual** |
| D71 | Qué es una atestación + R1/R2/R3 en 4 dimensiones | **v2** (Cierre-2) | Aprobable con condiciones | Cierre-1/2 | D58, v1 archivado | R1a–c, A1–A3 | Versión de la Fase 1 sin archivar → `no_comprobable` |
| **D72** *(nueva)* | La retención de un dividendo o un interés va a H (E → H); ingreso para el ahorro = neto | V3.3 §4.1 | Pendiente de aprobación | V3.3 (corrige el conflicto D21/D56) | D21, D56 | Dividendo con retención: Ef + H = bruto | Validación fiscal |
| **PF** | Fases | — | **Aprobada** | Encargo V3.1 | — | — | — |
| **PM** | Multidivisa y cripto aplazadas | — | **Aprobada** | Encargo V3.1 | — | — | — |
| **PE** | No implementar sin aprobación | — | **Aprobada** | Encargos | — | — | — |

## 3. Componentes del modelo (de V3, V3.1 y V3.2) sin un identificador D

| Componente | Versión vigente | Estado | Condiciones abiertas |
|---|---|---|---|
| Observaciones inmutables + vínculos de solo añadir | V3.2 §2.3 + cierre del bloque 3 (V1–V11) | Pendiente de aprobación | V1: funciones `SECURITY DEFINER` con un rol dedicado · V2: `advisory lock` · V4: quitar `politica_id` en la fase 1 · V7/V8: pruebas de concurrencia y de un solo vínculo de origen |
| Lotes de ingesta idempotentes (`hash_contenido`, `LOTE_CONFLICTO`) | V3 §7.4 | Pendiente de aprobación | — |
| Excel A + B | V3.1 §7.1 | A = aprobada (D20a) · B = pendiente | — |
| Saldo contable, disponible y pendiente | V3.1 §5.6 + C4 | Pendiente de aprobación | Las autorizaciones son observaciones |
| Pasivos y tarjeta | V3.1 §5.3–5.4 | Pendiente de aprobación | D30 |
