# Propuesta · Periodo financiero y nóminas a final de mes

> **Estado: pendiente de aprobación de Eric.** No se ha tocado el motor.
> Fecha: 07-11-2026.

## 1. Cómo funciona hoy (auditoría)

- **Un movimiento pertenece al mes de su `fecha`.** Es el mes natural (alternativa A): `claveMes(fecha) = fecha.slice(0, 7)`.
  - Ese cálculo aparece en **41 sitios de 17 archivos**: motor (`movimientosUtils`), Inicio, Análisis, Presupuesto, Base, historial, Fulcro, informes…
  - Unos usan `claveMes` y otros recortan la fecha directamente.
- **No existe ninguna noción de periodo distinta del mes natural.**
- **Ingresos, gastos, ahorro y tasa de ahorro** (`totalesDe`, `agregarPorMes`) se agrupan por ese mes.
- **El presupuesto en modo porcentaje** se calcula con lo que ha entrado **en el mes natural en curso** (`limiteGastoPresupuesto(config, ingresosDelMes)`).
- **El patrimonio** es un stock: no depende del mes, solo de la suma de movimientos hasta una fecha.
- **Lo que ya mitiga el problema:**
  - `resumenDelMes` y `insightsDelMes` detectan el «día habitual de tu ingreso». Si aún no ha llegado, no juzgan el ahorro del mes.
  - Las comparaciones del mes en curso son «hasta el mismo día».

**Qué falla con una nómina el 28:**
- **Octubre** se lleva la nómina del 28 de octubre, que es para vivir en noviembre: infla el ahorro y la tasa de octubre.
- **Noviembre**, entre el día 1 y el 27, aparece con 0 € de ingresos:
  - el presupuesto en porcentaje da 0 € de límite;
  - Análisis dice «aún no ha entrado nada»;
  - la tasa de noviembre se hunde, porque sus gastos no tienen ingreso.
- **Los gastos del 28 al 31 de octubre** (ya con la nómina nueva) cuentan en octubre, cuando el usuario los vive como parte de noviembre.

## 2. Alternativas

| | A. Mes natural (hoy) | B. Ciclo personal (día de inicio) | C. Asignar cada ingreso a un periodo |
|---|---|---|---|
| Qué es | Cada movimiento, en el mes de su fecha | El usuario elige el día en que empieza su mes (p. ej. 28). Todo lo que pasa del 28-oct al 27-nov es «noviembre» | Un ingreso concreto se marca «cuenta para noviembre» sin cambiar su fecha |
| Nómina del 28 | Cae en el mes anterior | Cae en el periodo que paga | Cae donde el usuario diga |
| Gastos 28–31 | Mes anterior | Con la nómina que los paga | Siguen en el mes anterior (incoherente) |
| Dos nóminas (28 y 2) | Una en cada mes natural | Las dos en el mismo periodo, si ambas caen del 28 al 27 | Cada una en el periodo elegido |
| Cambio en datos | Ninguno | Un ajuste por usuario (`dia_inicio_periodo`, 1 = como hoy) | Una columna por movimiento (`periodo_imputado`) |
| Coherencia entre pantallas | Total | Total, si todas usan la misma función de periodo | Difícil: ingresos y gastos se desacoplan |
| Riesgo | — | Medio: hay que sustituir los 41 usos por una sola función | Alto: cada suma debe mirar dos campos |

## 3. Recomendación

**B como base, con C solo como excepción futura.**

1. **Una sola función de periodo** en el motor: `periodoDe(fecha, diaInicio)` devuelve `'YYYY-MM'` (el mes al que «pertenece»). Con `diaInicio = 1` da exactamente lo de hoy, así que nadie ve cambios hasta que lo configure.
   - Los 41 usos pasan a llamarla; ninguna pantalla calcula el mes por su cuenta.
   - Una prueba de invariante comprueba que, con día 1, **todos** los totales históricos son idénticos a los actuales.
2. **Ajuste del usuario** en Tu cuenta: «Mi mes empieza el día…» (1 a 28), con una vista previa como «Noviembre = 28 oct – 27 nov» y el efecto en los últimos meses antes de guardar.
   - Se guarda en `perfiles.dia_inicio_periodo` (`smallint`, por defecto 1). El SQL se prepara solo para **palanca dev**.
3. **Lo que no cambia nunca:**
   - la fecha real de ningún movimiento;
   - el patrimonio (es stock, no periodo);
   - el número de movimientos.
   - Cada ingreso y cada gasto pertenece a **un único** periodo, así que no se puede duplicar.
4. **Dónde se ve:**
   - las etiquetas de periodo dicen el rango («Noviembre · 28 oct – 27 nov»);
   - Movimientos agrupa por periodo (Año → Periodo), con la fecha real en cada fila;
   - Presupuesto calcula el límite con los ingresos del periodo;
   - Análisis compara periodos con periodos.
5. **Dos nóminas:** en el detalle del periodo, «Ingresos de este periodo» lista cada nómina con su fecha real, así se entiende por qué hay dos.
   - Si alguna no corresponde a ese periodo (un atraso, una paga extra), C se añade más adelante como corrección puntual, «Cuenta para…», en ese ingreso concreto. Eso sí requiere una columna nueva y su propia aprobación.

**Por qué no C sola:** mueve el ingreso pero deja los gastos del 28–31 en el mes anterior. El ahorro de los dos meses queda descuadrado y la tasa de ahorro, sin sentido.

**Por qué no un filtro visual:** cada pantalla calcularía «su» mes y habría cifras distintas para lo mismo, que es justo lo que pides evitar.

## 4. Plan si se aprueba

1. Crear `periodoDe` y su prueba de invariante con día 1, contra el cliente de 3 años y las personas extremas.
2. Sustituir los 41 usos, archivo a archivo, con las pruebas en verde en cada paso.
3. Añadir el ajuste en Tu cuenta, con la vista previa (en local primero; columna en palanca dev).
4. Pruebas nuevas:
   - nómina el día 28;
   - dos nóminas;
   - gastos del 28 al 31;
   - periodos que cruzan de año;
   - meses de 28, 30 y 31 días;
   - presupuesto en porcentaje con día de inicio;
   - mes sin movimientos.
5. e2e y capturas.

**Decisión que necesito:**
1. ¿Apruebas B (día de inicio por usuario, 1 por defecto)?
2. ¿Y dejar C para más adelante?
