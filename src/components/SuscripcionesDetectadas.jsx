import { useMemo, useState } from 'react'
import { formatearEuros } from '../lib/categorias'
import { formatearFecha } from '../lib/movimientosUtils'
import { costeAnualTotal, detectarSuscripciones, guardarDescartadas, leerDescartadas } from '../lib/suscripciones'

// Cargos periódicos detectados en tus movimientos (p. ej. tras importar el
// extracto del banco) que aún no sigues en Fijos. Un toque para añadirlos; otro
// para descartar los que no son suscripción (descartes en lib/suscripciones).
export default function SuscripcionesDetectadas({ usuarioId, movimientos, recurrentes, onAnadir }) {
  const [descartadas, setDescartadas] = useState(() => leerDescartadas(usuarioId))
  const [anadiendo, setAnadiendo] = useState(null)

  const detectadas = useMemo(
    () => detectarSuscripciones(movimientos ?? [], recurrentes, { descartadas }),
    [movimientos, recurrentes, descartadas],
  )

  if (detectadas.length === 0) return null

  function descartar(clave) {
    const nuevo = new Set(descartadas).add(clave)
    setDescartadas(nuevo)
    guardarDescartadas(usuarioId, nuevo)
  }

  async function anadir(d) {
    setAnadiendo(d.clave)
    await onAnadir({
      tipo: 'gasto',
      nombre: d.nombre,
      importe: d.importe,
      categoriaId: d.categoriaId,
      categoriaNombre: d.categoriaNombre,
      fuenteId: d.fuenteId,
      diaMes: d.diaMes,
      confirmar: false,
      periodoMeses: d.periodoMeses,
      mesInicio: d.mesInicio,
      // El cargo detectado ya está en tus movimientos: su mes cuenta como pagado.
      mesesYaPagados: [d.ultimaFecha.slice(0, 7)],
    })
    setAnadiendo(null)
  }

  const total = costeAnualTotal(detectadas)

  return (
    <section className="tb-detectadas fade-in-up" aria-label="Suscripciones detectadas">
      <header className="tb-detectadas-cab">
        <span className="tb-detectadas-titulo">
          {detectadas.length === 1 ? 'Hemos detectado 1 cargo periódico' : `Hemos detectado ${detectadas.length} cargos periódicos`}
        </span>
        <span className="tb-detectadas-total">
          {formatearEuros(total)} <span>al año</span>
        </span>
      </header>

      <ul className="tb-detectadas-lista">
        {detectadas.map((d) => {
          const mensual = d.periodicidad === 'mensual'
          return (
            <li key={d.clave} className="tb-detectada">
              <div className="tb-row-main">
                <span className="tb-row-nombre">{d.nombre}</span>
                <span className="tb-row-bio">
                  {mensual
                    ? `${formatearEuros(d.importe)}/mes · día ${d.diaMes} · ${d.nCargos} cargos`
                    : `${formatearEuros(d.importe)} ${d.periodicidad} · próximo ${formatearFecha(d.proximaFecha)}`}
                </span>
                {d.subida && (
                  <span className="tb-detectada-subida">
                    Ha subido de {formatearEuros(d.subida.antes)} a {formatearEuros(d.subida.ahora)}
                  </span>
                )}
              </div>
              <div className="tb-detectada-acciones">
                <button
                  type="button"
                  className="tb-detectada-anadir"
                  disabled={anadiendo === d.clave}
                  onClick={() => anadir(d)}
                >
                  {anadiendo === d.clave ? '…' : 'Añadir'}
                </button>
                <button
                  type="button"
                  className="tb-detectada-descartar"
                  aria-label={`${d.nombre} no es una suscripción`}
                  title="No es una suscripción"
                  onClick={() => descartar(d.clave)}
                >
                  ×
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
