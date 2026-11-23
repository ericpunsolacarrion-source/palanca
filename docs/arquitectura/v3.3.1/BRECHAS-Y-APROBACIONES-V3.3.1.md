# Palanca — Brechas y aprobaciones V3.3.1

Solo lo que impide aprobar o implementar con seguridad. Acompaña a `ARQUITECTURA-V3.3.1-BORRADOR.md` y a `MATRIZ-DECISIONES-V3.3.1.md`. **Sustituye a** `BRECHAS-Y-APROBACIONES-V3.3.md`, que se conserva sin cambios.

## 1. Fuentes que faltan o se pueden perder

| # | Fuente | Estado | Qué bloquea |
|---|---|---|---|
| F1 | **Esquema real de producción** (volcado solo del esquema) | No existe | §1.2 y §8 del borrador (la migración) |
| F2 | **Configuración de Vercel:** SHA de producción, versión de Node, variables de Preview, qué ramas despliegan | No la he visto | Archivar v1 (§9.4) y S13 |
| F3 | **Prueba de restaurar la copia** | No se ha hecho | Toda la fase 1 |
| F4 | **Inventario de producción** (solo lectura): ajustes por clase, `perfiles.saldo_inicial`, movimientos anteriores o del mismo día que el alta | No existe | D52, D59 y la clasificación de la migración |
| F5 | **La V3, la V3.1, la V3.2 y la v2** solo están en una **carpeta temporal** (`scratchpad`), y **las auditorías de D34 y posteriores, solo en el chat** | Riesgo alto de perderlas | Toda la trazabilidad → **D60** |
| F6 | **Las versiones del motor de la Fase 1 anteriores a hoy** (para reconstruir R2 y comprobar la coherencia de R1) | Solo el historial de git, sin las fechas de despliegue | D71: la coherencia puede quedar `no_comprobable` |
| F7 | **Validación fiscal** (retenciones por producto, IRPF, compensación) | No se ha hecho | D56, D64, D72 y la capa fiscal |
| F8 | **Validación legal** de la conservación tras una baja y de la retención de las copias | No se ha hecho | A3 y D32 |
| F9 | **Catálogo detallado de pruebas:** muchas definiciones (C2–C12, G, T2, I-G, R1a–c, V, Z, A1–A3, S2, R2–R8, V1a) solo están en los informes del chat | Sin consolidar | La trazabilidad de las pruebas → al ejecutar D60 |

## 2. Contradicciones reales

| # | Texto 1 | Texto 2 | Corrección mínima |
|---|---|---|---|
| X1 | `MOTOR.md` **E2**: «Es una única cifra» (el patrimonio) | D67: con indeterminación, la cifra única es la base B, que no es patrimonio | Enmienda **A6** |
| X2 | `MOTOR.md` **R3**: «solo se da por válida si… coincide al céntimo» | A7: migración correctora (cambia el patrimonio de forma justificada) | Enmienda **A7** |
| X3 | `MOTOR.md` **H1**: «Nada se borra» | El RGPD, art. 17 (supresión) | Enmienda **A3** |
| X4 | `MOTOR.md` **T1**: «el patrimonio y los saldos de las bolsas son función exclusiva de… `fecha_economica`» | D63: el anclado y los residuos usan `fecha_valor` | Aclaración en **A2** (T1 rige el canónico) |
| X5 | `MOTOR.md` **H4**: un apunte nunca cambia | A1 sin D61: corregir un lote cambia los apuntes de una venta sin una versión de la venta | **D61** dentro de A1 |
| X6 | **D21** (V3): dividendos en **neto** (la retención no se registra) | **D56 (v3):** las retenciones son un activo H | **D72:** E → Ef (neto, en el ahorro) + E → H (retención, fuera del ahorro) |
| X7 | **V3.2 §2.1.2:** «Patrimonio a coste… es el canónico de E2» | D67: el canónico es B | La V3.3 §4.3 sustituye a la V3.2 |
| X8 | **V3 §13 y V3.1 §8.3:** el saldo del alta «se migra a `saldo_inicial` sin cambiar ningún número» | D52: falso si hay movimientos anteriores, y el dato es aproximado | La V3.3 §8.2, punto 5 |
| X9 | **El código** (v1) lee el reloj (`claveMesActual`, `hoyIso`) | **D70** | Se arregla en la fase 1b; v1 se reproduce con una capa aparte que fija la fecha |
| X10 | **El código:** venta = «resta lo cobrado con tope», con una prueba que lo fija (`motorInvariantes.test.js:158`) | F2a, A5, D55 | Cambiar la prueba **a propósito** en la fase 1d (corrección B3 en la migración) |
| X11 | **`CLAUDE.md`** («Reglas de cálculo» por categoría: Ajuste, Inversion, Ahorro…) | El modelo `tipo_evento` de la V3.3 | Actualizar `CLAUDE.md` **cuando se implemente** cada subfase (en la fase 1, `deducirTipo` mantiene la compatibilidad) |

**Contradicciones de la V3.3, corregidas en la V3.3.1:**

| # | Texto en conflicto | Corrección (sección de la V3.3.1) |
|---|---|---|
| X12 | V3.3 §4.3: PCq con P_b (incluye residuos) y sin H, frente a B sobre el libro | PCq en la base del libro y en la mostrada; la identidad con su dominio (§4.3) |
| X13 | V3.3 §6.2: un saldo manual confirmado podía dar «verificado» o «Cuadra» | `evidencia`; «Cuadra con tu banco» con 7 condiciones (§6.2, §6.3) |
| X14 | V3.3 §11 / D33 («A mercado» como cifra principal), frente al aplazamiento de D68 (§13) | Puerta PM-0 (§11, §13) |
| X15 | V3.3 §8.2, punto 4 (posiciones en L), frente a V3 §13.3 (compra solo en cuentas de bróker o cripto) | Se amplía la restricción a L (§8.2) |
| X16 | La instrucción de la plantilla («Inversiones anteriores… Compra inversión con la fecha de la primera fila») [C], frente a añadir *capital_apertura* en la migración | Reclasificar, no añadir (§5.7, caso 2) |
| X17 | V3.3 §9.2: «Q1' garantizada» y «Q2 siempre» | Garantías en 4 niveles (§9.2) |
| X18 | Matriz V3.3, D63 v6 («C ≤ 2³⁰»), frente a V3.3 §6.3 («2¹⁶ por mitad») | D63 v7 (§6.3) |

No he encontrado **otras** contradicciones entre D34, D48–D53, D54, D56, D58, D61–D71 y `MOTOR.md`. Las X1–X11 siguen **abiertas** (las resuelven enmiendas o la implementación); las X12–X18 están **corregidas en el texto** de la V3.3.1.

## 3. Decisiones que necesitan tu aprobación (por orden de bloqueo)

1. **Para empezar la fase 0b y la fase 1a:** D60 · D6 · A3 (+ D28, DL) · A1 + D61 · D32 · D16.
2. **Para las fases 1b–1d:** D70 · D3 · D55 · **D62 v2** (§5.7) · A5 · A6 (D67, base del libro y mostrada) · D69 · D36 · D42 · **D49** (L con posiciones).
3. **Para las fases 1e–1f y la migración:** A2 · A7 (D50 + D57, **incluido B5**, la reclasificación de aperturas) · D34 · D38 · D40 · D41 · D46 · D48 · D51 v2 · D52 · D53 · D58 · D63 v7 · D71 v3 · D22 · D29 · D30.
4. **Fases posteriores:** A4 + D68 (con la **puerta PM-0**) · D33 · D37 · D54 · D65 · D56 + D72 + D64 · D21 · D4 · D17 · D18 · D19 · D20b · D31 · D23 · D24 · D27.
5. **Datos del usuario:** D7–D14 · D15.

## 4. Validaciones pendientes

| # | Validación | Quién o dónde |
|---|---|---|
| VA1 | Restaurar la copia en un PostgreSQL aparte: mismos recuentos y mismo Σ `importe_centimos` por usuario | El usuario + yo (con su permiso) |
| VA2 | Rol dedicado de Supabase (D28, vínculos V1) | En DEV |
| VA3 | Ritmos, retrasos y zonas horarias de publicación de las fuentes reales (D68) | La documentación de cada fuente |
| VA4 | El tratamiento fiscal de retenciones y ventas por producto (D56, D72) | Asesor fiscal |
| VA5 | Obligaciones legales de conservación (A3, D32) | Asesor legal |
| VA6 | Que se entiendan las etiquetas (§11) | Prueba con usuarios en la beta |
| VA7 | Que solo `main` despliega a producción y que Preview no toca producción | Vercel (el usuario) |
| VA8 | **PERF-1 a PERF-4:** peor caso de D63 v7, memoria total del proceso y tiempo en un móvil modesto y en un ordenador; fijar el presupuesto de M | DEV (**pendiente**; hasta entonces solo hay cotas teóricas) |
| VA9 | Inventario de los usuarios que importaron aperturas con la plantilla (caso 2 de §5.7) | Producción, solo lectura (AU3) |

## 5. Acciones que necesitan autorización

| # | Acción | Afecta a | Riesgo |
|---|---|---|---|
| AU1 | **D60:** guardar la V3.x y las auditorías (sin datos personales) en `docs/arquitectura/`, con commit en la rama de desarrollo | El repositorio (no producción, si no va a `main`) | Bajo |
| AU2 | **Archivar v1:** `git worktree` del SHA de producción, paquetes, manifiesto, etiqueta `motor-v1` en una rama que no sea `main` y una *release* con el binario de Node | El repositorio y GitHub | Bajo (sin push a `main`) |
| AU3 | Consultas **de solo lectura** a producción (F1 y F4) | La base de datos de producción (lectura) | Bajo (privacidad: solo recuentos, sin conceptos) |
| AU4 | Cambiar las variables de Preview en Vercel (S13) | Vercel | Medio (lo hace el usuario) |
| AU5 | D6: quitar las herramientas de borrado del conector y desplegarlo | Producción | Bajo |
| AU6 | Mover la copia a un volumen cifrado y fijar su retención (D32) | El Mac del usuario | — (lo hace el usuario) |

## 6. Riesgos que impiden implementar con seguridad

| # | Riesgo | Gravedad | Mitigación |
|---|---|---|---|
| RI1 | Una copia **sin restaurar** y **sin cifrar**, con los datos de todos los usuarios | **Alta** | VA1 + AU6 antes de cualquier migración |
| RI2 | **Las vistas previas escriben en producción** (según `ESTADO.md`) | **Alta** | AU4 antes de probar nada |
| RI3 | **Se pierde la arquitectura** (carpeta temporal y chat) | **Alta** | AU1 |
| RI4 | El esquema de producción no se conoce | Alta | F1 antes de diseñar ningún SQL |
| RI5 | Herramientas de borrado irreversible en el conector | Media | AU5 |
| RI6 | Reconstrucción R2 con versiones del motor no archivadas | Media | AU2 ya; si falta el motor de una fecha → `no_comprobable` |
| RI7 | Supresión RGPD rota por la protección del historial | Alta (legal) | D28 + RGPD-1 en DEV **antes** de la fase 1a |
| RI8 | **Doble capital** al migrar aperturas importadas como «Compra inversión» (plantilla) | Alta | §5.7, caso 2 + AP-1 + la confirmación del usuario |
| RI9 | Rendimiento de D63 sin medir | Media | VA8 antes de cerrar la fase 1f |
