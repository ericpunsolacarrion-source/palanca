# Identidad de comercios — que no se pierda ni un gasto

> Cómo sabe Palanca que «PAGO TARJETA ALIPAM23», «ALIPAM77», «mercadoma» y
> «MERCADONA» son **el mismo sitio**, y cómo lo recuerda para siempre.
> Código: `src/lib/comercios.js` (núcleo, sin React) + `src/lib/useComercios.js`
> (memoria del usuario). Tests: `comercios.test.js`, `conciliarFijos.test.js`,
> `motorInvariantes.test.js`.

## 1. La regla de oro
**Una sola función decide qué comercio es un movimiento**: `directorio().identificar(m)`.
Todas las pantallas la usan (listas, buscador, Inicio, Fulcro, suscripciones,
categorizador, importación, Fijos). Nadie compara nombres «a mano».

## 2. Cómo se reconoce un comercio (en este orden)
1. **Memoria del usuario** (`comercios_alias`): «este texto del banco es Mercadona». Gana siempre.
2. **Memoria aproximada**: el mismo texto con otra errata o con otro número.
3. **Lo que apuntó el usuario** (el concepto/fuente de un movimiento a mano).
4. **Diccionario de marcas** (`MARCAS`: súper, gasolineras, telefonía, luz, plataformas…).
5. El texto del banco, **limpio y presentable** («COMPRA TARJ. 4512 BAR LA ESQUINA» → «Bar La Esquina»).

## 3. La clave del comercio (`claveComercio`)
De cualquier texto del banco se saca una clave estable:
- mayúsculas/minúsculas, acentos y signos dan igual (`normalizarTexto`);
- fuera el ruido bancario: «PAGO», «COMPRA», «TARJ», «RECIBO», pasarelas (SumUp, Redsys, PayPal…), fechas, números de tarjeta;
- **los números pegados a la palabra se quitan** → `ALIPAM23` y `ALIPAM77` dan la misma clave `alipam`;
- las palabras de devolución también («DEVOLUCION BAR PACO» = «BAR PACO»), para que la devolución se asocie a su compra.

## 4. Erratas, mayúsculas y plurales
- `mismaEtiqueta`: «comida» = «Comida» = «COMIDAS»; «Restaurantes» = «restaurante».
- `buscarParecido`: distancia de edición con tolerancia según la longitud
  (≤4 letras: exacto; 5-8: 1 error; ≥9: 2). «mercadoma» → «Mercadona».
- Al crear una categoría o un concepto nuevo, si ya existe igual se reutiliza
  y si es parecido se pregunta «¿Querías decir X?» (`SelectorEtiqueta`).

## 5. Lo que escribe el usuario (`nombreParaComercio`)
Al renombrar en la importación o editar en el historial: uno que ya tiene (con
errata incluida) → una marca conocida ("mercadoma" → "Mercadona") → lo escrito
con mayúscula inicial ("bar paco" → "Bar Paco").

## 5b. La memoria (`comercios_alias`)
Tabla `(usuario_id, clave, nombre, categoria)` con RLS (cada uno solo ve las suyas),
en `supabase-schema-metricas.sql` §8. Se borra con la cuenta y sale en «Descargar mis datos».
Sin el SQL, se guarda en el dispositivo (`palanca_comercios_<uid>`) y se sube sola
cuando la tabla exista.

Se aprende en dos sitios:
- **Importar**: al renombrar un grupo («Alipam» → «Mercadona») o cambiarle la categoría.
- **Editar un movimiento** del historial: cambiar el comercio o la categoría lo recuerda,
  y ofrece **igualar los demás movimientos de ese comercio** de una vez.

A partir de ahí, el siguiente extracto con «ALIPAM55» sale como **Mercadona · Reconocido · Comida**.

## 6. Lo que se apoya en la identidad
| Dónde | Qué hace |
|---|---|
| Importar (`revisionImportacion.js`) | agrupa por comercio real; duplicados a ±3 días para cargos que el banco asienta tarde |
| Categorizar (`categorizar.js`) | memoria → tu historial (por comercio) → diccionario → por defecto |
| Fijos (`conciliarFijos.js`) | si el cargo del gimnasio ya está en movimientos (importado o a mano), el fijo sale **hecho**: nunca se cobra dos veces |
| Suscripciones detectadas | agrupa cargos aunque el código cambie cada mes |
| Buscador, listas, Inicio, Fulcro | muestran y encuentran «Mercadona», nunca «ALIPAM23» |

## 7. Extractos de cada banco (probados con clientes simulados)
`src/lib/clientesSimulados.js` genera un año de vida real de 5 clientes con el
extracto TAL CUAL lo exporta su banco; `clientesSimulados.test.js` comprueba que,
tras importarlo, Palanca dice exactamente lo que pasó (al céntimo).

| Banco | Formato | Lo que había que entender |
|---|---|---|
| BBVA | `;`, líneas del banco antes de la tabla, "PAGO CON TARJETA EN …" | nombres limpios ("Bar Paco", no "Con En Bar Paco") |
| Santander | importes `-32,57 EUR`, tarjeta `5402XXXXXXXX1234` | el código de moneda y la tarjeta enmascarada |
| CaixaBank | columnas Cargo / Abono sin signo | el lado decide gasto o ingreso |
| ING | trae SU categoría ("Alimentación", "Movimientos excluidos") | solo como pista, traducida a la de Palanca (`categoriaDesdeBanco`) |
| Revolut | inglés, comas, "Started Date", tipo `CARD_PAYMENT`, estado `REVERTED` | fecha, tipo inservible ignorado, operaciones no completadas fuera |

En todos: traspasos a y desde la cuenta de ahorro (neutros), aportaciones y
**retiradas** de inversión ("REEMBOLSO FONDO" no es una devolución de compra),
devoluciones, intereses y dividendos (sí son ingreso). Reimportar el mismo
extracto no duplica nada, y "Descargar mis datos" en CSV se reimporta con las
mismas cifras exactas (ida y vuelta).

## 8. Contabilidad conectada
- **Devoluciones** (`esDevolucion`): un ingreso «Devolución/Reembolso» **no es ingreso**,
  resta gasto, y en el desglose resta de la categoría del comercio que devuelve
  (MOTOR.md E6). El patrimonio sí lo cuenta como dinero que entra.
- **Fechas futuras**: el importador rechaza filas con fecha posterior a hoy (cargos programados) (T2).
- `motorInvariantes.test.js` comprueba, sobre miles de historiales aleatorios, que patrimonio,
  ahorro, desglose por categorías y lo que dice Fulcro cuadran **al céntimo**.
