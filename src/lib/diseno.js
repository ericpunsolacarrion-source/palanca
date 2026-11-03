// Diseño v4 «El punto de apoyo» (docs/DISENO.md). En pruebas mientras Eric lo valida:
// se activa en la versión de pruebas y en local, NUNCA por defecto en la app
// pública. Se fuerza con ?diseno=v4 o ?diseno=v2 (se recuerda en el navegador).
// El antiguo «v3» (Vidrio) se retiró: quien lo tuviera guardado pasa a v4.
const DOMINIO_PUBLICO = 'palanca-zeta.vercel.app'
const CLAVE = 'palanca_diseno'

export function disenoActivo(ubicacion = globalThis.location, almacen = globalThis.localStorage) {
  try {
    const pedido = new URLSearchParams(ubicacion?.search ?? '').get('diseno')
    if (pedido === 'v2' || pedido === 'v4') almacen?.setItem(CLAVE, pedido)
    if (pedido === 'v3') almacen?.setItem(CLAVE, 'v4')
    const guardado = almacen?.getItem(CLAVE)
    if (guardado === 'v2') return 'v2'
    if (guardado === 'v4' || guardado === 'v3') return 'v4'
  } catch {
    // sin almacenamiento: se decide por el dominio
  }
  return ubicacion?.hostname === DOMINIO_PUBLICO ? 'v2' : 'v4'
}

export function aplicarDiseno() {
  const d = disenoActivo()
  document.documentElement.dataset.diseno = d
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && d === 'v4') meta.setAttribute('content', '#F4EFE6')
  return d
}

export const esV4 = () => document.documentElement.dataset.diseno === 'v4'
