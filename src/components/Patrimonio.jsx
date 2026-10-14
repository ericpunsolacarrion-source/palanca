import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatearEuros } from '../lib/categorias'
import { bolsas, etiquetaMes, hoyIso, ultimaReconciliacion } from '../lib/movimientosUtils'
import { cambioPatrimonioMes, evolucionPatrimonio } from '../lib/inicio'
import Icono from './Icono'
import { crearAjuste } from '../lib/ajustes'
import { useSaldo } from '../lib/useSaldo'
import { toast } from '../lib/toast'

const DIAS_AVISO = 45

function diasDesde(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

// Línea de evolución del patrimonio (últimos meses). Sin ejes: solo la forma
// de la curva y el punto de hoy; las cifras están arriba.
function LineaPatrimonio({ serie }) {
  const W = 320
  const H = 56
  const valores = serie.map((p) => p.valor)
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const rango = max - min || 1
  const pts = valores.map((v, i) => [(i / (valores.length - 1)) * W, H - 6 - ((v - min) / rango) * (H - 12)])
  const linea = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [ux, uy] = pts.at(-1)
  return (
    <div className="hp-linea">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={`${linea} L${W} ${H} L0 ${H} Z`} className="hp-linea-area" />
        <path d={linea} className="hp-linea-trazo" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="hp-linea-punto" style={{ left: `${(ux / W) * 100}%`, top: `${(uy / H) * 100}%` }} />
      <div className="hp-linea-meses" aria-hidden="true">
        {serie.map((p) => (
          <span key={p.mes}>{etiquetaMes(p.mes, { month: 'short' }).replace('.', '')}</span>
        ))}
      </div>
    </div>
  )
}

// Héroe del inicio: lo que tienes (patrimonio), cómo ha cambiado este mes,
// su evolución y el reparto disponible / invertido. Ajustar saldo cuadra la
// liquidez con el banco (crea un ajuste visible).
export default function Patrimonio({ usuarioId, movimientos, onGuardado, onVerInversion, soloLectura = false }) {
  const [abierto, setAbierto] = useState(false)
  const [saldoReal, setSaldoReal] = useState('')
  const [guardando, setGuardando] = useState(false)
  const { ultimaReconciliacion: ultimaMeta, marcarReconciliado } = useSaldo(usuarioId)

  const { bolsaInversion, bolsaLiquidez, patrimonio } = useMemo(
    // Patrimonio A HOY (contrato T2): un movimiento con fecha futura (p. ej.
    // importado por CSV) no cuenta todavía, ni descuadra la reconciliación.
    () => bolsas(movimientos, hoyIso()),
    [movimientos],
  )
  const serie = useMemo(() => evolucionPatrimonio(movimientos, 6), [movimientos])
  const cambioMes = useMemo(() => cambioPatrimonioMes(movimientos), [movimientos])

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

  const pctInvertido = patrimonio > 0 ? Math.min(100, Math.max(0, (bolsaInversion / patrimonio) * 100)) : 0
  const sube = cambioMes >= 0

  return (
    <section className="hp fade-in-up" aria-label="Tu patrimonio">
      <span className="hp-etiqueta">Tu patrimonio</span>
      <div className="hp-cifra">{formatearEuros(patrimonio)}</div>
      {cambioMes !== 0 && (
        <span className={`hp-cambio ${sube ? 'sube' : 'baja'}`}>
          <Icono nombre={sube ? 'sube' : 'baja'} tam={14} />
          {sube ? '+' : '−'}
          {formatearEuros(Math.abs(cambioMes))} este mes
        </span>
      )}

      {/* La línea solo cuenta algo con al menos 2 meses con datos. */}
      {serie.filter((p) => p.valor !== 0).length >= 2 && <LineaPatrimonio serie={serie} />}

      <div className="hp-reparto" aria-hidden="true">
        <span className="hp-reparto-liq" style={{ flexGrow: 100 - pctInvertido }} />
        {pctInvertido > 0 && <span className="hp-reparto-inv" style={{ flexGrow: pctInvertido }} />}
      </div>
      <div className="hp-bolsas">
        <div className="hp-bolsa">
          <span className="hp-bolsa-etq"><i className="hp-punto liq" />Disponible</span>
          <span className="hp-bolsa-valor">{formatearEuros(bolsaLiquidez)}</span>
        </div>
        <button type="button" className="hp-bolsa hp-bolsa-boton" onClick={onVerInversion}>
          <span className="hp-bolsa-etq"><i className="hp-punto inv" />Invertido</span>
          <span className="hp-bolsa-valor">{formatearEuros(bolsaInversion)}</span>
        </button>
      </div>

      {!soloLectura && (
        <div className="hp-pie">
          <span className={`hp-fiabilidad ${!ultima || dias > DIAS_AVISO ? 'aviso' : ''}`}>
            {!ultima
              ? 'Saldo sin cuadrar con tu banco'
              : dias > DIAS_AVISO
                ? `Cuadrado hace ${dias} días`
                : `Cuadrado con tu banco ${dias === 0 ? 'hoy' : `hace ${dias} día${dias === 1 ? '' : 's'}`}`}
          </span>
          <button type="button" className="link" onClick={() => setAbierto(true)}>
            Ajustar saldo
          </button>
        </div>
      )}

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
    </section>
  )
}
