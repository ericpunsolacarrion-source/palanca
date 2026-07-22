import { esAjuste, esInversion } from '../lib/categorias'

// Primer arranque guiado: aparece en el dashboard hasta que el usuario nuevo
// registra su primer ingreso y su primer gasto. Poco texto, muy accionable.
// En cuanto tiene ambos, desaparece y da paso al "momento ajá" (el dashboard
// se llena: tasa de ahorro, proyección…).
export default function PrimerosPasos({ nombre, movimientos, onRegistrar }) {
  const tieneIngreso = movimientos.some((m) => m.tipo === 'ingreso' && !esAjuste(m))
  const tieneGasto = movimientos.some((m) => m.tipo === 'gasto' && !esInversion(m) && !esAjuste(m))

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
      <p className="pp-sub">
        Con solo <strong>un ingreso</strong> y <strong>un gasto</strong> ya verás tu tasa de ahorro y
        tu proyección de futuro. Se tarda un minuto.
      </p>

      <ul className="pp-lista">
        {pasos.map((p) => (
          <li key={p.modo} className={`pp-paso ${p.hecho ? 'hecho' : ''}`}>
            <span className="pp-check" aria-hidden="true">
              {p.hecho ? '✓' : ''}
            </span>
            <span className="pp-texto">{p.texto}</span>
            {!p.hecho && (
              <button type="button" className="pp-cta" onClick={() => onRegistrar(p.modo)}>
                {p.cta} →
              </button>
            )}
          </li>
        ))}
      </ul>

      {hechos === 1 && (
        <p className="pp-animo">¡Vas por la mitad! Un paso más y se desbloquea todo. 🚀</p>
      )}
    </div>
  )
}
