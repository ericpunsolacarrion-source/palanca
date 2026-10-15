// Firma de los enlaces de baja: cada email lleva ?u=<id>&t=<firma>. Sin el
// secreto nadie puede dar de baja a otra persona. El prefijo "_" hace que
// Vercel no lo publique como ruta.
import { createHmac, timingSafeEqual } from 'node:crypto'

export function firmar(uid, secreto) {
  return createHmac('sha256', secreto).update(`baja:${uid}`).digest('base64url').slice(0, 32)
}

export function firmaValida(uid, firma, secreto) {
  if (!uid || !firma || !secreto) return false
  const a = Buffer.from(firmar(uid, secreto))
  const b = Buffer.from(String(firma))
  return a.length === b.length && timingSafeEqual(a, b)
}

export function enlaceBaja(base, uid, secreto) {
  return `${base}/api/baja?u=${encodeURIComponent(uid)}&t=${firmar(uid, secreto)}`
}
