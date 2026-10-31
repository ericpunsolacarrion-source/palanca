import Icono from './Icono'
import { esV3 } from '../lib/diseno'

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
export default function BottomNav({ activa, onCambiar, onApuntar, avisos = {} }) {
  // Diseño v3: barra flotante con el «+» de apuntar en el centro.
  const conMas = esV3() && onApuntar
  return (
    <nav className="bottom-nav">
      {PESTANAS.flatMap((p, i) => {
        const esActiva = activa === p.id || p.tambien?.includes(activa)
        const boton = (
        <button
          key={p.id}
          type="button"
          data-pestana={p.id}
          className={esActiva ? 'nav-item activo' : 'nav-item'}
          onClick={() => onCambiar(p.id)}
          aria-current={esActiva ? 'page' : undefined}
          aria-label={p.etiqueta}
        >
          <span className="nav-icono">
            <Icono nombre={p.icono} tam={22} />
            {avisos[p.id] > 0 && <span className="nav-badge">{avisos[p.id]}</span>}
          </span>
          <span className="nav-etiqueta">{p.etiqueta}</span>
        </button>
        )
        return conMas && i === 2
          ? [
              <button key="mas" type="button" className="nav-mas" onClick={onApuntar} aria-label="Apuntar un gasto">
                <Icono nombre="mas" tam={24} />
              </button>,
              boton,
            ]
          : [boton]
      })}
    </nav>
  )
}
