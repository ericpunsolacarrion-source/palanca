# Auditoría previa al diseño v5 «Bosque» (2026-11-04)

Situación de partida antes de tocar nada. Sirve de referencia para medir el
resultado.

## Fase 0 — estado inicial

- **Rama de trabajo:** `claude/capabilities-overview-m3ry1u`, igual a `develop` (`0e8dfac`).
  - Árbol limpio, sin cambios sin confirmar.
  - `main` sigue en `76527f5` (beta pública, diseño v2).
- **Cómo se ejecuta:**
  - `npm run dev` arranca la app real; necesita el `.env` con Supabase.
  - `npm run e2e` arranca la app con Supabase e IA simulados (`tests/e2e/`).
  - `node tests/e2e/capturas.mjs <diseño> <carpeta>` hace capturas en 1280 / 1440 / 1920 / 390.
- **Tests base:**
  - vitest: 483 en verde y 1 omitido.
  - `vite build`: OK.
  - e2e en v4: en verde (última ejecución en CI, «Revisión» run 1: éxito).
- **Entornos:**
  - Producción: `palanca-zeta.vercel.app`, rama `main`, diseño v2.
  - Pruebas: `develop`, diseño v4.
  - Cada rama tiene su preview de Vercel.
  - Supabase es el mismo proyecto para todos los entornos (deuda conocida: PENDIENTES).
- **Capturas del «antes»:** `tests/e2e/salida/capturas/antes-v4/` y `antes-v2/` (no se suben a git).

## Inventario de pantallas (lo que existe de verdad)

| Pantalla | Componente | Qué hace hoy |
|---|---|---|
| Inicio | `Inicio.jsx` (+ `InicioV4.jsx`, `Patrimonio.jsx`, `AvisosCobros.jsx`) | Patrimonio y su evolución, el mes contra tu media, avisos de cobros y últimos movimientos. Pestaña «Análisis» con los gráficos de v2. |
| Movimientos | `MovimientosTab.jsx` → `RegistroMovimiento`, `ListaMovimientos`, `ImportarHistorial` | Alta (gasto/ingreso/inversión), historial agrupado por mes con búsqueda y filtros, edición en línea, borrado con confirmación, importación de extractos/capturas. |
| Base (Fijos) | `Recurrentes.jsx` (+ `CalendarioCobros`, `PlanAhorro`, `SuscripcionesDetectadas`) | Compromisos con periodicidad, confirmar/deshacer 1:1, detectadas, plan de ahorro de recibos, línea de 30 días. |
| Presupuesto | `Presupuesto.jsx` | UN límite mensual global (por tasa de ahorro o fijo). No hay presupuestos por categoría. |
| Planificación | `PlanificacionFutura.jsx` | Plan de ingresos/gastos de los próximos meses y comparación con lo real. |
| Inversión | `Inversiones.jsx` | Aportaciones y retiradas por plataforma; solo lo APORTADO (no hay valor de mercado). |
| Simuladores | `Simulador.jsx` + `simuladores/*` | Objetivos de ahorro (tabla `objetivos_ahorro`), interés compuesto, hipoteca, independencia. |
| Fulcro | `Consultor.jsx` | Chat con respuestas locales del motor y, en beta, IA limitada (3 preguntas por usuario). |
| Cuenta | `CuentaPanel.jsx` | Perfil, demo, exportar, privacidad, cerrar sesión. |

## Problemas encontrados (clasificados)

### 1. Visuales
- v4 («papel y latón») no transmite una app financiera moderna: Eric lo rechaza («hemos ido a peor»).
- Cifras en serifa: legibles, pero sin carácter de producto digital.
- Las tarjetas grandes dejan huecos en el ordenador.
  - Ejemplo: el formulario de Apuntar, centrado con 300 px vacíos a cada lado.
  - Ejemplo: el calendario de Fijos con burbujas solapadas.
- Iconos de comercio: solo una inicial en un círculo gris, sin color de marca.

### 2. Usabilidad
- Movimientos abre en «Nuevo», no en el historial. En el ordenador lo útil es ver y gestionar; apuntar es una acción.
- La edición de un movimiento se despliega dentro de la lista y desplaza todo.
- Los meses anteriores del historial están en acordeones cerrados: mucho clic para revisar.
- «Futuro» mezcla Presupuesto, Inversión y Simuladores tras subpestañas: en el ordenador, sobra un nivel.
- El patrimonio no tiene pantalla propia: vive en una tarjeta del Inicio y en Inversión.

### 3. Inconsistencias de diseño
- Tres capas de estilo:
  - `index.css`: tokens oscuros de v2;
  - `App.css`: 10.500 líneas;
  - `diseno-v4.css`: anula a v2 con colores claros.
- Muchos componentes con su propio estilo de botón y chip (`chip`, `ini-accion`, `tb-add`, `link`, `btn-eliminar` usado como «Cancelar»…).

### 4. Arquitectura frontend
- Navegación por estado (`pestana`) en `App.jsx`, sin rutas: el botón «atrás» del navegador no cambia de pantalla. Se mantiene: cambiarlo es un riesgo innecesario.
- `App.css` es monolítico, pero está bien acotado por prefijos de componente.

### 5. Funcionales
- No se encontraron flujos rotos: el e2e de 16 pasos pasa.
- Con datos de prueba, «Entró 2.150 € · primer mes con datos» en noviembre: el texto se apoya en la serie de 6 meses y los datos simulados apenas tienen meses previos con ingresos. Es correcto con esos datos, no un error.

### 6. Rendimiento
- Precarga PWA de 1,4 MB.
- Las pestañas secundarias ya se cargan bajo demanda.
- Las fuentes variables pesan; se usarán solo las necesarias.

### 7. Accesibilidad
- El contraste AA ya se audita automáticamente (`auditoria.mjs`).
- Faltan estados `:focus-visible` uniformes en v4.
- Las filas de Fijos son `div role="button"` con un botón dentro (anidado de interactivos: se mantiene, pero se cuida el foco).

### 8. Integridad financiera
- El motor (céntimos, bolsas, traspasos, devoluciones, conciliación de fijos) está cubierto por tests de invariantes (`motorInvariantes.test.js`, `estres.test.js`).
- El rediseño **no toca** `lib/movimientosUtils.js`, `bolsas()`, `confirmarCobro`/`desmarcar` ni el esquema.
- Las cifras nuevas que muestra v5 (p. ej. distribución por plataforma) se derivan SOLO de las utilidades existentes.
