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
      <div className="chips-fila" role="group" aria-label={label}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={valor === item.id ? 'chip activo' : 'chip'}
            onClick={() => onChange(item.id)}
          >
            {item.nombre}
          </button>
        ))}
        <button
          type="button"
          className={valor === NUEVA_ETIQUETA ? 'chip chip-nuevo activo' : 'chip chip-nuevo'}
          onClick={() => onChange(NUEVA_ETIQUETA)}
        >
          + Nuevo
        </button>
      </div>
      {valor === NUEVA_ETIQUETA && (
        <input
          id={`${id}-nuevo`}
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
