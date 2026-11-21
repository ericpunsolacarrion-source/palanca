// Punto de entrada del MOTOR para el servidor (api/mcp.js). El código de
// src/lib usa imports sin extensión (Vite); para la función de Vercel se
// empaqueta en api/_motor.js con `npm run motor:api`. Nada de aquí toca el
// navegador ni Supabase: solo cálculo puro (las mismas reglas que la app).
export { bolsas, totalesDe, gastoPorCategoria, claveMes } from '../lib/movimientosUtils'
export { configurarPeriodo } from '../lib/periodo'
export { esInversion, esRetiradaInversion, esAjuste, esTraspaso, esDevolucion, CATEGORIA_INVERSION, CATEGORIA_AJUSTE } from '../lib/categorias'
export { procesarFilas, tablaDesdeFilas, detectarMapeo, claveDuplicado, parseImporteConSigno, parseFecha } from '../lib/importarCsv'
export { crearCategorizador } from '../lib/categorizar'
export { categorizarFilas } from '../lib/revisionImportacion'
export { COLUMNAS_PLANTILLA, TIPOS_PLANTILLA, INSTRUCCIONES_ASISTENTE } from '../lib/plantillaPalanca'
export { formaEtiqueta } from '../lib/comercios'
