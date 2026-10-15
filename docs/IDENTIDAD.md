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

## 5. La memoria (`comercios_alias`)
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

## 7. Contabilidad conectada
- **Devoluciones** (`esDevolucion`): un ingreso «Devolución/Reembolso» **no es ingreso**,
  resta gasto, y en el desglose resta de la categoría del comercio que devuelve
  (MOTOR.md E6). El patrimonio sí lo cuenta como dinero que entra.
- **Fechas futuras**: el importador rechaza filas con fecha posterior a hoy (cargos programados) (T2).
- `motorInvariantes.test.js` comprueba, sobre miles de historiales aleatorios, que patrimonio,
  ahorro, desglose por categorías y lo que dice Fulcro cuadran **al céntimo**.
