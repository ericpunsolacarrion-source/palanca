import Icono from './Icono'
import { esV5 } from '../lib/diseno'

const PESTANAS = [
  { id: 'dashboard', etiqueta: 'Inicio', icono: 'inicio' },
  { id: 'movimientos', etiqueta: 'Movimientos', icono: 'movimientos' },
  { id: 'suscripciones', etiqueta: 'Fijos', icono: 'fijos' },
  // "Plan" agrupa Presupuesto y Simuladores (5 pestañas caben bien en un móvil).
  { id: 'presupuesto', etiqueta: 'Plan', icono: 'presupuesto', tambien: ['simulador'] },
  { id: 'inversiones', etiqueta: 'Inversión', icono: 'inversion' },
]

// v5 (móvil): Inicio · Movimientos · [+] · Base · Plan. «Plan» agrupa
// Presupuesto, Patrimonio y Objetivos (subpestañas en App.jsx). En el
// ordenador manda el menú lateral (NavLateral) y esta barra se oculta.
const PESTANAS_V5 = [
  { id: 'dashboard', etiqueta: 'Inicio', icono: 'inicio' },
  { id: 'movimientos', etiqueta: 'Movimientos', icono: 'movimientos' },
  { id: 'suscripciones', etiqueta: 'Base', icono: 'fijos' },
  { id: 'presupuesto', etiqueta: 'Plan', icono: 'presupuesto', tambien: ['simulador', 'inversiones'] },
]

// `avisos`: { [idPestaña]: número } → globo de pendientes (p. ej. cobros por
// confirmar este mes en Suscripciones).
export default function BottomNav({ activa, onCambiar, onApuntar, avisos = {} }) {
  // Diseño v5: «+» (nuevo movimiento) en el centro de la barra.
  const v5 = esV5()
  const conMas = v5 && onApuntar
  return (
    <nav className="bottom-nav">
      {(v5 ? PESTANAS_V5 : PESTANAS).flatMap((p, i) => {
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
              <button key="mas" type="button" className="nav-mas" onClick={onApuntar} aria-label="Nuevo movimiento">
                <Icono nombre="mas" tam={24} />
                <span className="nav-mas-texto">Apuntar</span>
              </button>,
              boton,
            ]
          : [boton]
      })}
    </nav>
  )
}
