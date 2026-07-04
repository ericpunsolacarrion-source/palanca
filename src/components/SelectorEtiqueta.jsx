export const NUEVA_ETIQUETA = '__nueva__'

export default function SelectorEtiqueta({
  id,
  label,
  valor,
  onChange,
  items,
  nuevoNombre,
  onNuevoNombreChange,
  placeholder,
}) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sin especificar</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.nombre}
          </option>
        ))}
        <option value={NUEVA_ETIQUETA}>+ Añadir nuevo…</option>
      </select>
      {valor === NUEVA_ETIQUETA && (
        <input
          type="text"
          value={nuevoNombre}
          onChange={(e) => onNuevoNombreChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      )}
    </>
  )
}

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
