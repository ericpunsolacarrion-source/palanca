import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatearEuros } from '../lib/categorias'
import { bolsas, ultimaReconciliacion } from '../lib/movimientosUtils'
import { crearAjuste } from '../lib/ajustes'
import { useSaldo } from '../lib/useSaldo'
import { toast } from '../lib/toast'

const DIAS_AVISO = 45

function diasDesde(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

export default function Patrimonio({ usuarioId, movimientos, onGuardado, onVerInversion }) {
  const [abierto, setAbierto] = useState(false)
  const [saldoReal, setSaldoReal] = useState('')
  const [guardando, setGuardando] = useState(false)
  const { ultimaReconciliacion: ultimaMeta, marcarReconciliado } = useSaldo(usuarioId)

  const { bolsaInversion, bolsaLiquidez, patrimonio } = useMemo(() => bolsas(movimientos), [movimientos])

  // La reconciliación más reciente: la marca local o el último ajuste registrado.
  const ultimaAjuste = useMemo(() => ultimaReconciliacion(movimientos), [movimientos])
  const ultima = [ultimaMeta, ultimaAjuste].filter(Boolean).sort().pop() ?? null
  const dias = diasDesde(ultima)

  async function confirmarAjuste(e) {
    e.preventDefault()
    const real = Number(saldoReal)
    if (saldoReal === '' || !Number.isFinite(real) || real < 0) return
    setGuardando(true)
    const diff = Math.round((real - bolsaLiquidez) * 100) / 100
    try {
      if (Math.abs(diff) >= 0.01) {
        const tipo = diff > 0 ? 'ingreso' : 'gasto'
        const nota =
          diff > 0
            ? `Ajuste de saldo: tenías ${formatearEuros(Math.abs(diff))} más de lo registrado`
            : `Ajuste de saldo: tenías ${formatearEuros(Math.abs(diff))} menos (gastos sin anotar)`
        const ok = await crearAjuste(usuarioId, { importe: diff, tipo, nota })
        if (!ok) throw new Error('No se pudo crear el ajuste')
      }
      marcarReconciliado()
      setSaldoReal('')
      setAbierto(false)
      toast(Math.abs(diff) < 0.01 ? 'Tu saldo ya cuadraba' : 'Saldo reconciliado')
      onGuardado?.()
    } catch (err) {
      console.error(err)
      toast('No se ha podido ajustar el saldo. Inténtalo de nuevo.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="patrimonio-card fade-in-up">
      <div className="patrimonio-total">
        <span className="etiqueta">Patrimonio total</span>
        <span className="patrimonio-cifra">{formatearEuros(patrimonio)}</span>
      </div>

      <div className="patrimonio-bolsas">
        <button type="button" className="bolsa bolsa-boton" onClick={onVerInversion}>
          <span className="bolsa-dot inversion" />
          <span className="etiqueta">Inversión</span>
          <span className="bolsa-valor inversion">{formatearEuros(bolsaInversion)}</span>
          <span className="bolsa-ver">Ver ›</span>
        </button>
        <div className="bolsa">
          <span className="bolsa-dot liquidez" />
          <span className="etiqueta">Ahorro líquido</span>
          <span className="bolsa-valor">{formatearEuros(bolsaLiquidez)}</span>
        </div>
      </div>

      <div className="patrimonio-pie">
        <span className={`patrimonio-fiabilidad ${!ultima || dias > DIAS_AVISO ? 'aviso' : ''}`}>
          {!ultima
            ? 'Sin reconciliar: la liquidez es una estimación'
            : dias > DIAS_AVISO
              ? `Reconciliado hace ${dias} días — puede haberse desviado`
              : `Saldo reconciliado hace ${dias === 0 ? 'hoy' : `${dias} día${dias === 1 ? '' : 's'}`}`}
        </span>
        <button type="button" className="link" onClick={() => setAbierto(true)}>
          Ajustar saldo
        </button>
      </div>

      {abierto &&
        createPortal(
          <div className="logros-overlay" onClick={() => setAbierto(false)}>
            <section
              className="modal-caja patrimonio-modal"
              onClick={(ev) => ev.stopPropagation()}
              role="dialog"
              aria-label="Ajustar saldo"
            >
              <h3 className="patrimonio-modal-titulo">Ajustar tu saldo líquido</h3>
              <p className="ayuda">
                Introduce el dinero líquido que tienes ahora mismo (cuenta del banco). Compararemos
                con nuestra estimación y crearemos un ajuste visible para cuadrarlo.
              </p>
              <div className="patrimonio-teorica">
                Nuestra estimación: <strong>{formatearEuros(bolsaLiquidez)}</strong>
              </div>
              <form onSubmit={confirmarAjuste} className="patrimonio-form">
                <label htmlFor="saldo-real">Tu saldo real (€)</label>
                <div className="campo-euro">
                  <input
                    id="saldo-real"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={saldoReal}
                    onChange={(ev) => setSaldoReal(ev.target.value)}
                    autoFocus
                  />
                  <span className="campo-euro-simbolo" aria-hidden="true">
                    €
                  </span>
                </div>
                <div className="modal-acciones">
                  <button
                    type="button"
                    className="modal-cancelar"
                    onClick={() => setAbierto(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="modal-confirmar" disabled={guardando || saldoReal === ''}>
                    {guardando ? 'Ajustando…' : 'Ajustar'}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body,
        )}
    </div>
  )
}
