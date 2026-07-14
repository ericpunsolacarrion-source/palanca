import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatearEuros } from '../lib/categorias'
import { CATEGORIAS_HITOS, estadoLogros } from '../lib/hitos'
import { usePresupuesto } from '../lib/usePresupuesto'
import { useObjetivosAhorro } from '../lib/useObjetivosAhorro'

// Formatea el valor/meta de un hito según su métrica (euros, %, días, cuenta).
function formatoMeta(hito) {
  if (['bolsaLiquidez', 'invertidoTotal', 'patrimonio'].includes(hito.metric)) {
    return formatearEuros(hito.meta)
  }
  if (hito.metric === 'ratioAhorroMes') return `${hito.meta}%`
  if (hito.metric === 'diasActivos') return `${hito.meta} días`
  if (hito.metric === 'mesesSeguidosAhorrando') return `${hito.meta} meses`
  return null
}

export default function Logros({ usuarioId, movimientos, movimientosMes }) {
  const [abierto, setAbierto] = useState(false)
  const { objetivoInversionMensual } = usePresupuesto(usuarioId)
  const { objetivos } = useObjetivosAhorro(usuarioId)

  const logros = useMemo(
    () =>
      estadoLogros({
        movimientos,
        movimientosMes,
        objetivoInversion: objetivoInversionMensual ?? 0,
        objetivos,
      }),
    [movimientos, movimientosMes, objetivoInversionMensual, objetivos],
  )

  const conseguidos = logros.filter((l) => l.alcanzado).length
  const total = logros.length
  // Próximo por desbloquear (el de mayor progreso entre los no alcanzados).
  const proximo = logros
    .filter((l) => !l.alcanzado)
    .sort((a, b) => b.progreso - a.progreso)[0]

  return (
    <>
      <button type="button" className="logros-card fade-in-up" onClick={() => setAbierto(true)}>
        <div className="logros-card-cab">
          <span className="logros-card-titulo">Camino de logros</span>
          <span className="logros-card-cuenta">
            {conseguidos}/{total}
          </span>
        </div>
        <div className="logros-card-barra">
          <div className="logros-card-relleno" style={{ width: `${(conseguidos / total) * 100}%` }} />
        </div>
        {proximo && (
          <span className="logros-card-proximo">
            Próximo: <strong>{proximo.titulo}</strong> · {Math.round(proximo.progreso * 100)}%
          </span>
        )}
      </button>

      {abierto &&
        createPortal(
          <div className="logros-overlay" onClick={() => setAbierto(false)}>
            <section
              className="logros-panel"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Camino de logros"
            >
            <header className="logros-panel-cab">
              <div>
                <h2>Camino de logros</h2>
                <p className="consultor-sub">
                  {conseguidos} de {total} desbloqueados
                </p>
              </div>
              <button
                type="button"
                className="consultor-cerrar"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <div className="logros-lista">
              {CATEGORIAS_HITOS.map((cat) => {
                const items = logros.filter((l) => l.categoria === cat)
                if (items.length === 0) return null
                // El primer no conseguido de cada categoría es el "próximo"; los
                // siguientes bloqueados se muestran difuminados (lejanos).
                let proximoMarcado = false
                return (
                  <div key={cat} className="logros-grupo">
                    <span className="logros-grupo-titulo">{cat}</span>
                    {items.map((l) => {
                      let estado = 'conseguido'
                      if (!l.alcanzado) {
                        if (!proximoMarcado) {
                          estado = 'proximo'
                          proximoMarcado = true
                        } else {
                          estado = 'lejano'
                        }
                      }
                      return (
                      <div key={l.id} className={`logro-fila ${estado}`}>
                        <span className="logro-icono">{l.alcanzado ? l.icono : '🔒'}</span>
                        <span className="logro-cuerpo">
                          <span className="logro-titulo">{l.titulo}</span>
                          {l.alcanzado ? (
                            <span className="logro-estado conseguido">Desbloqueado</span>
                          ) : (
                            <>
                              <span className="logro-mensaje">{l.mensaje}</span>
                              <span className="logro-barra">
                                <span
                                  className="logro-barra-relleno"
                                  style={{ width: `${l.progreso * 100}%` }}
                                />
                              </span>
                              {formatoMeta(l) && (
                                <span className="logro-meta">Meta: {formatoMeta(l)}</span>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </section>
          </div>,
          document.body,
        )}
    </>
  )
}
