import Icono from './Icono'

const PESTANAS = [
  { id: 'dashboard', etiqueta: 'Inicio', icono: 'inicio' },
  { id: 'movimientos', etiqueta: 'Movimientos', icono: 'movimientos' },
  { id: 'suscripciones', etiqueta: 'Fijos', icono: 'fijos' },
  { id: 'presupuesto', etiqueta: 'Presupuesto', icono: 'presupuesto' },
  { id: 'inversiones', etiqueta: 'Inversión', icono: 'inversion' },
  { id: 'simulador', etiqueta: 'Simulador', icono: 'simulador' },
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
            <Icono nombre={p.icono} tam={22} />
            {avisos[p.id] > 0 && <span className="nav-badge">{avisos[p.id]}</span>}
          </span>
          <span className="nav-etiqueta">{p.etiqueta}</span>
        </button>
      ))}
    </nav>
  )
}
