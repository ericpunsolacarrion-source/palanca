const PESTANAS = [
  { id: 'dashboard', etiqueta: 'Dashboard', icono: '◆' },
  { id: 'movimientos', etiqueta: 'Movimientos', icono: '≡' },
  { id: 'presupuesto', etiqueta: 'Presupuesto', icono: '◐' },
  { id: 'inversiones', etiqueta: 'Inversión', icono: '▲' },
  { id: 'simulador', etiqueta: 'Simulador', icono: '◎' },
]

export default function BottomNav({ activa, onCambiar }) {
  return (
    <nav className="bottom-nav">
      {PESTANAS.map((p) => (
        <button
          key={p.id}
          type="button"
          className={activa === p.id ? 'nav-item activo' : 'nav-item'}
          onClick={() => onCambiar(p.id)}
        >
          <span className="nav-icono">{p.icono}</span>
          <span className="nav-etiqueta">{p.etiqueta}</span>
        </button>
      ))}
    </nav>
  )
}
