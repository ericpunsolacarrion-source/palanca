import Icono from './Icono'
import { esAjuste } from '../lib/categorias'
import { esConsumo } from '../lib/movimientosUtils'

// Primer arranque guiado: aparece en el dashboard hasta que el usuario nuevo
// registra su primer ingreso y su primer gasto. Poco texto, muy accionable.
// En cuanto tiene ambos, desaparece y da paso al "momento ajá" (el dashboard
// se llena: tasa de ahorro, proyección…).
export default function PrimerosPasos({ nombre, movimientos, onRegistrar }) {
  const tieneIngreso = movimientos.some((m) => m.tipo === 'ingreso' && !esAjuste(m))
  const tieneGasto = movimientos.some((m) => esConsumo(m))

  if (tieneIngreso && tieneGasto) return null

  const pasos = [
    { modo: 'ingreso', hecho: tieneIngreso, texto: 'Registra tu primer ingreso', cta: 'Añadir ingreso' },
    { modo: 'gasto', hecho: tieneGasto, texto: 'Registra tu primer gasto', cta: 'Añadir gasto' },
  ]
  const hechos = pasos.filter((p) => p.hecho).length

  return (
    <div className="primeros-pasos fade-in-up">
      <span className="pp-badge">Empieza aquí</span>
      <h2 className="pp-titulo">
        {nombre ? `¡Vamos, ${nombre}!` : '¡Empecemos!'}
      </h2>
      {/* Lo más potente primero: traer meses de golpe engancha mucho más que
          apuntar el primer gasto a mano. */}
      {hechos === 0 && (
        <button type="button" className="pp-importar" onClick={() => onRegistrar('importar')}>
          <span className="pp-importar-texto">
            <strong>Lo más rápido: trae tu último año del banco</strong>
            <span>Extracto en Excel o CSV, o capturas de la app. En 2 minutos verás tus suscripciones y cuánto puedes ahorrar.</span>
          </span>
          <Icono nombre="chevron" tam={18} />
        </button>
      )}
      <p className="pp-sub">
        {hechos === 0 ? 'O empieza a mano: con ' : 'Con '}solo <strong>un ingreso</strong> y <strong>un gasto</strong> ya verás tu tasa de
        ahorro y tu proyección de futuro.
      </p>

      <ul className="pp-lista">
        {pasos.map((p) => (
          <li key={p.modo} className={`pp-paso ${p.hecho ? 'hecho' : ''}`}>
            <span className="pp-check" aria-hidden="true">
              {p.hecho && <Icono nombre="check" tam={14} />}
            </span>
            <span className="pp-texto">{p.texto}</span>
            {!p.hecho && (
              <button type="button" className="pp-cta" onClick={() => onRegistrar(p.modo)}>
                {p.cta}
              </button>
            )}
          </li>
        ))}
      </ul>

      {hechos === 1 && (
        <p className="pp-animo">¡Vas por la mitad! Un paso más y se desbloquea todo.</p>
      )}
    </div>
  )
}
