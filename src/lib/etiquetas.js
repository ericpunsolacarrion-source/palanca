export const NUEVA_ETIQUETA = '__nueva__'

// Resuelve la selección de un SelectorEtiqueta: si el usuario eligió
// "+ Nuevo", crea la etiqueta; si no, devuelve el id seleccionado (o null).
export async function resolverEtiqueta(valorId, nuevoNombre, crearFn, etiqueta, setError) {
  if (valorId === NUEVA_ETIQUETA) {
    if (!nuevoNombre.trim()) {
      setError(`Escribe un nombre para la ${etiqueta} nueva.`)
      return { ok: false }
    }
    const creada = await crearFn(nuevoNombre)
    if (!creada) {
      setError(`No se ha podido crear la ${etiqueta}. Inténtalo de nuevo.`)
      return { ok: false }
    }
    return { ok: true, id: creada.id }
  }
  return { ok: true, id: valorId || null }
}
