import Icono from './Icono'

const PESTANAS = [
  { id: 'dashboard', etiqueta: 'Inicio', icono: 'inicio' },
  { id: 'movimientos', etiqueta: 'Movimientos', icono: 'movimientos' },
  { id: 'suscripciones', etiqueta: 'Fijos', icono: 'fijos' },
  // "Plan" agrupa Presupuesto y Simuladores (5 pestañas caben bien en un móvil).
  { id: 'presupuesto', etiqueta: 'Plan', icono: 'presupuesto', tambien: ['simulador'] },
  { id: 'inversiones', etiqueta: 'Inversión', icono: 'inversion' },
]

// `avisos`: { [idPestaña]: número } → globo de pendientes (p. ej. cobros por
// confirmar este mes en Suscripciones).
export default function BottomNav({ activa, onCambiar, avisos = {} }) {
  return (
    <nav className="bottom-nav">
      {PESTANAS.map((p) => {
        const esActiva = activa === p.id || p.tambien?.includes(activa)
        return (
        <button
          key={p.id}
          type="button"
          data-pestana={p.id}
          className={esActiva ? 'nav-item activo' : 'nav-item'}
          onClick={() => onCambiar(p.id)}
          aria-current={esActiva ? 'page' : undefined}
        >
          <span className="nav-icono">
            <Icono nombre={p.icono} tam={22} />
            {avisos[p.id] > 0 && <span className="nav-badge">{avisos[p.id]}</span>}
          </span>
          <span className="nav-etiqueta">{p.etiqueta}</span>
        </button>
        )
      })}
    </nav>
  )
}
