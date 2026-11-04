// Diseño v5 «Bosque» (docs/DISENO.md). En pruebas mientras Eric lo valida:
// se activa en la versión de pruebas y en local, NUNCA por defecto en la app
// pública (que sigue en v2). Se fuerza con ?diseno=v5 o ?diseno=v2 (se
// recuerda en el navegador). Los diseños retirados (v3 «Vidrio», v4 «El punto
// de apoyo») pasan a v5 si alguien los tenía guardados.
const DOMINIO_PUBLICO = 'palanca-zeta.vercel.app'
const CLAVE = 'palanca_diseno'
const RETIRADOS = new Set(['v3', 'v4'])

export function disenoActivo(ubicacion = globalThis.location, almacen = globalThis.localStorage) {
  try {
    const pedido = new URLSearchParams(ubicacion?.search ?? '').get('diseno')
    if (pedido === 'v2' || pedido === 'v5') almacen?.setItem(CLAVE, pedido)
    if (RETIRADOS.has(pedido)) almacen?.setItem(CLAVE, 'v5')
    const guardado = almacen?.getItem(CLAVE)
    if (guardado === 'v2') return 'v2'
    if (guardado === 'v5' || RETIRADOS.has(guardado)) return 'v5'
  } catch {
    // sin almacenamiento: se decide por el dominio
  }
  return ubicacion?.hostname === DOMINIO_PUBLICO ? 'v2' : 'v5'
}

export function aplicarDiseno() {
  const d = disenoActivo()
  document.documentElement.dataset.diseno = d
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && d === 'v5') meta.setAttribute('content', '#0A100D')
  return d
}

export const esV5 = () => document.documentElement.dataset.diseno === 'v5'
