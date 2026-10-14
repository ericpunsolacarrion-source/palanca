const PESTANAS = [
  { id: 'dashboard', etiqueta: 'Inicio', icono: '◆' },
  { id: 'movimientos', etiqueta: 'Movimientos', icono: '≡' },
  { id: 'suscripciones', etiqueta: 'Fijos', icono: '↻' },
  { id: 'presupuesto', etiqueta: 'Presupuesto', icono: '◐' },
  { id: 'inversiones', etiqueta: 'Inversión', icono: '▲' },
  { id: 'simulador', etiqueta: 'Simulador', icono: '◎' },
]

// `avisos`: { [idPestaña]: número } → globo de pendientes (p. ej. cobros por
// confirmar este mes en Suscripciones).
export default function BottomNav({ activa, onCambiar, avisos = {} }) {
  return (
    <nav className="bottom-nav">
      {PESTANAS.map((p) => (
        <button
          key={p.id}
          type="button"
          className={activa === p.id ? 'nav-item activo' : 'nav-item'}
          onClick={() => onCambiar(p.id)}
          aria-current={activa === p.id ? 'page' : undefined}
        >
          <span className="nav-icono">
            {p.icono}
            {avisos[p.id] > 0 && <span className="nav-badge">{avisos[p.id]}</span>}
          </span>
          <span className="nav-etiqueta">{p.etiqueta}</span>
        </button>
      ))}
    </nav>
  )
}
