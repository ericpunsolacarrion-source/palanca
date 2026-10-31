// Diseño v3 «Vidrio» (docs/DISENO.md). En pruebas mientras Eric lo valida:
// se activa en la versión de pruebas y en local, NUNCA por defecto en la app
// pública. Se fuerza con ?diseno=v3 o ?diseno=v2 (se recuerda en el navegador).
const DOMINIO_PUBLICO = 'palanca-zeta.vercel.app'
const CLAVE = 'palanca_diseno'

export function disenoActivo(ubicacion = globalThis.location, almacen = globalThis.localStorage) {
  try {
    const pedido = new URLSearchParams(ubicacion?.search ?? '').get('diseno')
    if (pedido === 'v2' || pedido === 'v3') almacen?.setItem(CLAVE, pedido)
    const guardado = almacen?.getItem(CLAVE)
    if (guardado === 'v2' || guardado === 'v3') return guardado
  } catch {
    // sin almacenamiento: se decide por el dominio
  }
  return ubicacion?.hostname === DOMINIO_PUBLICO ? 'v2' : 'v3'
}

export function aplicarDiseno() {
  const d = disenoActivo()
  document.documentElement.dataset.diseno = d
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && d === 'v3') meta.setAttribute('content', '#EFE9DE')
  return d
}

export const esV3 = () => document.documentElement.dataset.diseno === 'v3'
