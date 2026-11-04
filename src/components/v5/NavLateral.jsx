import Icono, { Marca } from '../Icono'

// Secciones de Palanca (v5). Los id son las pestañas de siempre (App.jsx), así
// los enlaces de Fulcro, las píldoras y los avisos siguen funcionando:
// «inversiones» es Patrimonio y «simulador» es Objetivos.
export const SECCIONES_V5 = [
  { id: 'dashboard', etiqueta: 'Inicio', icono: 'inicio', titulo: 'Inicio' },
  { id: 'movimientos', etiqueta: 'Movimientos', icono: 'movimientos', titulo: 'Movimientos', sub: 'Todo lo que entra y sale, en un solo sitio' },
  { id: 'inversiones', etiqueta: 'Patrimonio', icono: 'inversion', titulo: 'Patrimonio', sub: 'Lo que tienes y cómo ha crecido' },
  { id: 'suscripciones', etiqueta: 'Base', icono: 'fijos', titulo: 'Base', sub: 'Tus compromisos fijos y cuándo se cobran' },
  { id: 'presupuesto', etiqueta: 'Presupuesto', icono: 'presupuesto', titulo: 'Presupuesto', sub: 'Cuánto llevas gastado y cuánto te queda' },
  { id: 'simulador', etiqueta: 'Objetivos', icono: 'objetivo', titulo: 'Objetivos', sub: 'Hacia dónde vas y a qué ritmo' },
]

export const seccionV5 = (pestana) => SECCIONES_V5.find((s) => s.id === pestana) ?? SECCIONES_V5[0]

// Menú lateral del ordenador (≥ 1024 px). En el móvil se oculta por CSS y
// manda la barra inferior.
export default function NavLateral({ activa, onCambiar, onNuevo, onFulcro, avisos = {} }) {
  return (
    <aside className="v5-lateral" aria-label="Navegación principal">
      <div className="v5-lateral-marca">
        <Marca tam={26} color="var(--accent)" />
        Palanca
      </div>
      <button type="button" className="v5-boton primario v5-lateral-nuevo" onClick={onNuevo}>
        <Icono nombre="mas" tam={18} /> Nuevo movimiento
      </button>
      <nav aria-label="Secciones">
        {SECCIONES_V5.map((s, i) => (
          <div key={s.id}>
            {i === 1 && <div className="v5-lateral-grupo">Tu dinero</div>}
            {i === 4 && <div className="v5-lateral-grupo">Planificar</div>}
            <button
              type="button"
              data-pestana={s.id}
              className={`v5-lateral-item ${activa === s.id ? 'activo' : ''}`}
              aria-current={activa === s.id ? 'page' : undefined}
              onClick={() => onCambiar(s.id)}
            >
              <Icono nombre={s.icono} tam={19} />
              {s.etiqueta}
              {avisos[s.id] > 0 && (
                <span className="v5-lateral-globo" aria-label={`${avisos[s.id]} pendientes`}>
                  {avisos[s.id]}
                </span>
              )}
            </button>
          </div>
        ))}
      </nav>
      <div className="v5-lateral-pie">
        <button type="button" className="v5-lateral-fulcro" onClick={onFulcro} aria-label="Preguntar a Fulcro">
          <span className="v5-lateral-fulcro-ico">
            <Icono nombre="consultor" tam={17} />
          </span>
          <span>
            <b>Fulcro</b>
            <small>Pregunta sobre tu dinero</small>
          </span>
        </button>
      </div>
    </aside>
  )
}
