import { NUEVA_ETIQUETA } from '../lib/etiquetas'

export default function SelectorEtiqueta({
  id,
  label,
  valor,
  onChange,
  items,
  nuevoNombre,
  onNuevoNombreChange,
  placeholder,
  compacto = false,
}) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div
        className={`chips-fila ${compacto ? 'chips-fila-compacta' : ''}`}
        role="group"
        aria-label={label}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip ${compacto ? 'chip-sm' : ''} ${valor === item.id ? 'activo' : ''}`}
            onClick={() => onChange(item.id)}
          >
            {item.nombre}
          </button>
        ))}
        <button
          type="button"
          className={`chip chip-nuevo ${compacto ? 'chip-sm' : ''} ${valor === NUEVA_ETIQUETA ? 'activo' : ''}`}
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
