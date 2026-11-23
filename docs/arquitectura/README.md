# Arquitectura del motor financiero — índice

> **Nada de esta carpeta está aprobado ni implementado.** Es la conservación documental (D60) de la arquitectura en revisión.
> - **Candidata vigente:** [`v3.3.1/`](v3.3.1/). **Pendiente de aprobación.**
> - **Decisiones aprobadas por el usuario hasta hoy (solo cuatro):** D20a (el Excel original, solo de lectura), PF (estructura de fases), PM (multidivisa y cripto aplazadas) y PE (no implementar sin aprobación).
> - **Contrato vigente del motor:** sigue siendo [`../MOTOR.md`](../MOTOR.md). Las enmiendas A1–A7 están **propuestas**, no aplicadas.
> - **Ninguna** de las pruebas del [catálogo](CATALOGO-PRUEBAS.md) se ha ejecutado.

## Cadena de versiones

```
v2 consolidada + revisión crítica (NO conservadas aquí: contienen datos personales)
  → V3 → V3.1 → V3.2
  → auditorías de D34 (1, 2, 3) · extractos de la V3.2 (bloques 1–4) · reanudación · contrastes 1–5 · cierres 1–3
  → V3.3 → auditoría de cierre de la V3.3 → V3.3.1 (CANDIDATA)
```

Una versión posterior **prevalece solo en lo que cambia**. Lo que no cambia sigue como en la anterior.

## Archivos

| Archivo | Contenido | Sustituye a | Estado |
|---|---|---|---|
| [`v3/ARQUITECTURA-V3.md`](v3/ARQUITECTURA-V3.md) | Arquitectura multifuente: observaciones, hechos y estado derivado; adaptadores; sincronización; discrepancias; seguridad; plan; decisiones D17–D28 | La v2 (no conservada) | Histórico |
| [`v3.1/ARQUITECTURA-V3.1.md`](v3.1/ARQUITECTURA-V3.1.md) | Patrimonio incompleto, observaciones inmutables + vínculos, tarjeta de crédito, Excel A + B, coste desconocido, saldos, seguridad (S1–S14), fases 0/1/posteriores | V3 (solo en lo que cambia) | Histórico |
| [`v3.2/ARQUITECTURA-V3.2.md`](v3.2/ARQUITECTURA-V3.2.md) | Criterios a coste y a mercado separados, ventas sin coste, integridad de `vinculos`, completitud y verificación, tabla de decisiones | V3.1 (solo en lo que cambia) | Histórico |
| [`auditorias/extractos-v3.2/`](auditorias/extractos-v3.2/) (bloques 1–4) | Extractos literales de la V3.2 para una revisión externa, más notas de análisis (2-B, 2-C, 3-B, 3-C, 4-P) | — | Histórico |
| [`auditorias/2026-11-22_D34-auditoria-1.md`](auditorias/2026-11-22_D34-auditoria-1.md) | Primera auditoría de D34 (cuentas sin saldo inicial) | — | Histórico |
| [`auditorias/2026-11-22_D34-auditoria-2.md`](auditorias/2026-11-22_D34-auditoria-2.md) | Segunda auditoría de D34: residuos acumulados, T5, conversión del saldo inicial, migración de ajustes, A2 | Auditoría 1 de D34 (en lo que corrige) | Histórico |
| [`auditorias/2026-11-22_D34-auditoria-3.md`](auditorias/2026-11-22_D34-auditoria-3.md) | Tercera auditoría de D34: solo atestaciones individuales, R3 conservadora o correctora, etiquetas, saldo del alta (D48–D53) | Auditoría 2 de D34 (en lo que corrige) | Histórico |
| [`auditorias/2026-11-23_reanudacion_ANONIMIZADO.md`](auditorias/2026-11-23_reanudacion_ANONIMIZADO.md) | Registro maestro de control propuesto, bloques A–D, D54–D60. **Una sola cifra personal retirada**, marcada como «[cifra personal retirada]» | — | Histórico |
| [`auditorias/2026-11-23_contraste-1.md`](auditorias/2026-11-23_contraste-1.md) … [`contraste-5`](auditorias/2026-11-23_contraste-5.md) | Contrastes técnicos: D54, D56, D61–D63, D65–D68, D70 | Sucesivamente | Histórico |
| [`auditorias/2026-11-23_cierre-1.md`](auditorias/2026-11-23_cierre-1.md), [`cierre-2`](auditorias/2026-11-23_cierre-2.md), [`cierre-3`](auditorias/2026-11-23_cierre-3.md) | Cierres de D63 (signos, unidades, límites), D68 (zonas horarias, avisos), D69, D70, D71 (R1/R2/R3) y D66 | Sucesivamente | Histórico |
| [`v3.3/`](v3.3/) (3 archivos) | Primera consolidación: borrador, matriz de decisiones, brechas y aprobaciones | V3.2 + auditorías | **Sustituida por la V3.3.1** (se conserva sin cambios) |
| [`auditorias/2026-11-23_auditoria-cierre-V3.3.md`](auditorias/2026-11-23_auditoria-cierre-V3.3.md) | Auditoría de la V3.3: errores E1–E8 | — | Histórico |
| [`v3.3.1/`](v3.3.1/) (3 archivos) | **Candidata vigente:** V3.3 + E1–E8 + las condiciones A (capital de apertura), B (conciliación documental) y C (rendimiento). Registro de cambios al principio del borrador | V3.3 | **Pendiente de aprobación** |
| [`CATALOGO-PRUEBAS.md`](CATALOGO-PRUEBAS.md) | Las tablas de pruebas de todas las fuentes, literales, más lo que solo se describe en prosa y las definiciones pendientes | — | **Ninguna prueba ejecutada** |
| [`MANIFIESTO-SHA256.txt`](MANIFIESTO-SHA256.txt) | Hash de cada archivo y de dónde viene | — | — |

**Las auditorías y los extractos** son **la transcripción literal** de los informes de la conversación de trabajo (la reanudación, con una cifra retirada). **No se ha añadido ni reconstruido ningún contenido.**

## Nombres que usan las matrices de la V3.3 y la V3.3.1

| Nombre en la matriz | Archivo |
|---|---|
| D34-1 / D34-2 / D34-3 | `auditorias/2026-11-22_D34-auditoria-{1,2,3}.md` |
| Rean. | `auditorias/2026-11-23_reanudacion_ANONIMIZADO.md` |
| C1 … C5 | `auditorias/2026-11-23_contraste-{1..5}.md` |
| Cierre-1 | `auditorias/2026-11-23_cierre-1.md` |
| Cierre-2 | `auditorias/2026-11-23_cierre-2.md` |
| Cierre-V3.3 | `auditorias/2026-11-23_auditoria-cierre-V3.3.md` |
| v2 | **No conservada** (ver «Ausencias») |

**Errata de las matrices** (se registra aquí; las matrices no se modifican):
- Las versiones **D63 v6, D66 v4, D68 v3 y D71 v2** vienen del **cierre 3** (`cierre-3.md`), no del «Cierre-2» que dice la matriz.
- **D70** aparece por primera vez en el **contraste 5** y se perfila en el cierre 1.

## Decisiones pendientes

Todas, salvo las cuatro aprobadas. La lista completa, con su versión vigente, dependencias y pruebas, está en [`v3.3.1/MATRIZ-DECISIONES-V3.3.1.md`](v3.3.1/MATRIZ-DECISIONES-V3.3.1.md). El orden recomendado para aprobarlas está en [`v3.3.1/BRECHAS-Y-APROBACIONES-V3.3.1.md`](v3.3.1/BRECHAS-Y-APROBACIONES-V3.3.1.md) §3.

## Ausencias (no se han reconstruido)

| Documento | Motivo |
|---|---|
| Arquitectura v2 consolidada y su revisión crítica (D1–D16) | **Contienen datos financieros personales** de una cuenta real. Están fuera del repositorio. Hace falta una versión anonimizada aprobada |
| Auditorías iniciales 1–3 (conciliación con el Excel; integridad y seguridad; M1–M5) | Igual: datos personales |
| Auditoría financiera con cifras reales (`data/import/`, ignorado por git) | Datos personales: no se conserva aquí |
| Esquema real de producción, configuración de Vercel, resultado de la restauración de la copia | No existen todavía (V3.3.1, BRECHAS §1) |
| Definiciones de algunas pruebas | Ver [CATALOGO-PRUEBAS.md](CATALOGO-PRUEBAS.md), «Identificadores sin ninguna definición localizable» |
| Los encargos (prompts) del usuario de cada ronda | No forman parte de la arquitectura; están en el historial de la conversación |
