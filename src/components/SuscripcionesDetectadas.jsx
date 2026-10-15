import { useMemo, useState } from 'react'
import { formatearEuros } from '../lib/categorias'
import { formatearFecha } from '../lib/movimientosUtils'
import { toast } from '../lib/toast'
import Icono from './Icono'
import { useComerciosCompartidos } from '../lib/DatosCompartidos'
import { costeAnualTotal, detectarSuscripciones, guardarDescartadas, leerDescartadas } from '../lib/suscripciones'

// Cargos periódicos detectados en tus movimientos (p. ej. tras importar el
// extracto del banco) que aún no sigues en Fijos. Un toque para añadirlos; otro
// para descartar los que no son suscripción (descartes en lib/suscripciones).
export default function SuscripcionesDetectadas({ usuarioId, movimientos, recurrentes, onAnadir }) {
  const [descartadas, setDescartadas] = useState(() => leerDescartadas(usuarioId))
  const [anadiendo, setAnadiendo] = useState(null)
  // La memoria de comercios cambia quién es quién: se recalcula con ella.
  const { alias } = useComerciosCompartidos()

  const detectadas = useMemo(
    () => detectarSuscripciones(movimientos ?? [], recurrentes, { descartadas }),
    [movimientos, recurrentes, descartadas, alias], // eslint-disable-line react-hooks/exhaustive-deps
  )

  if (detectadas.length === 0) return null

  function descartar(clave) {
    const nuevo = new Set(descartadas).add(clave)
    setDescartadas(nuevo)
    guardarDescartadas(usuarioId, nuevo)
  }

  const datosDe = (d) => ({
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

  async function anadir(d) {
    setAnadiendo(d.clave)
    await onAnadir(datosDe(d))
    setAnadiendo(null)
  }

  // Tras importar un año suelen salir varios: todos de una vez.
  async function anadirTodos() {
    setAnadiendo('todos')
    const lista = [...detectadas]
    for (const d of lista) await onAnadir(datosDe(d))
    setAnadiendo(null)
    toast(`${lista.length} pagos añadidos a tus fijos. Te avisaremos el día de cada cobro.`)
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
        {detectadas.length > 1 && (
          <button type="button" className="tb-detectadas-todos" disabled={anadiendo !== null} onClick={anadirTodos}>
            {anadiendo === 'todos' ? 'Añadiendo…' : `Añadir los ${detectadas.length}`}
          </button>
        )}
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
                  disabled={anadiendo !== null}
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
                  <Icono nombre="cerrar" tam={14} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
