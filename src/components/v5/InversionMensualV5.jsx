import { useMemo, useState } from 'react'
import { agregarPorMes, claveMesActual, etiquetaMes } from '../../lib/movimientosUtils'
import { formatearEuros } from '../../lib/categorias'
import { resumenInversionMensual } from '../../lib/patrimonio'
import { usePresupuestoCompartido } from '../../lib/DatosCompartidos'
import { GraficoInversion, Leyenda } from './Graficos'

// PATRIMONIO · INVERSIÓN MENSUAL (v5): cuánto aportas, si eres regular y cómo
// va este mes frente al anterior. Son APORTACIONES netas (aportar − retirar),
// no rentabilidad ni valor de mercado: Palanca no conoce cotizaciones.
const PERIODOS = [
  { id: 12, etq: '12 meses' },
  { id: 24, etq: '24 meses' },
  { id: 'todo', etq: 'Desde el inicio' },
]

export default function InversionMensualV5({ aportaciones, nMesesDesdeInicio }) {
  const [periodo, setPeriodo] = useState(12)
  const { objetivoInversionMensual: objetivo } = usePresupuestoCompartido()
  const clave = claveMesActual()
  const n = periodo === 'todo' ? nMesesDesdeInicio : Math.min(periodo, Math.max(nMesesDesdeInicio, 1))
  const meses = useMemo(() => agregarPorMes(aportaciones, n), [aportaciones, n])
  const r = useMemo(() => resumenInversionMensual(meses, clave), [meses, clave])
  const serie = meses.map((m) => ({ etiqueta: etiquetaMes(m.clave, { month: 'short' }).replace('.', ''), etiquetaLarga: etiquetaMes(m.clave), valor: m.invertido, enCurso: m.clave === clave }))
  const hayDatos = aportaciones.length > 0

  return (
    <section className="v5-tarjeta v5-inv-mensual" aria-label="Inversión mensual">
      <header className="v5-tarjeta-cab">
        <h2>Inversión mensual</h2>
        {hayDatos && nMesesDesdeInicio > 12 && (
          <div className="v5-seg" role="group" aria-label="Periodo">
            {PERIODOS.filter((p) => p.id === 'todo' || p.id === 12 || nMesesDesdeInicio > 12).map((p) => (
              <button key={p.id} type="button" className={periodo === p.id ? 'activo' : ''} aria-pressed={periodo === p.id} onClick={() => setPeriodo(p.id)}>
                {p.etq}
              </button>
            ))}
          </div>
        )}
      </header>
      {!hayDatos ? (
        <p className="v5-nota-vacia">Cuando apuntes tu primera aportación verás aquí cuánto inviertes cada mes y lo constante que eres.</p>
      ) : (
        <>
          <dl className="v5-inv-kpis">
            <div>
              <dt>Aportado en {periodo === 'todo' ? 'total' : `${n} meses`}</dt>
              <dd className="num v5-oro">{formatearEuros(r.total)}</dd>
            </div>
            <div>
              <dt>Media al mes</dt>
              <dd className="num">{r.n ? formatearEuros(r.media) : '—'}</dd>
            </div>
            <div>
              <dt>Este mes</dt>
              <dd className="num">
                {formatearEuros(r.actual)}
                {r.difAnterior != null && Math.abs(r.difAnterior) >= 0.01 && (
                  <small className={r.difAnterior > 0 ? 'v5-positivo' : 'v5-tenue'}>
                    {' '}
                    {r.difAnterior > 0 ? '+' : '−'}
                    {formatearEuros(Math.abs(r.difAnterior))} vs el anterior
                  </small>
                )}
              </dd>
            </div>
            <div>
              <dt>Meses con aportación</dt>
              <dd className="num">
                {r.conAportacion} <span className="v5-tenue">de {r.n}</span>
              </dd>
            </div>
          </dl>
          <GraficoInversion serie={serie} media={r.media} objetivo={objetivo} alto={220} titulo={`Aportaciones de cada mes, ${periodo === 'todo' ? 'desde la primera' : `últimos ${n} meses`}`} />
          <div className="v5-ana-pie">
            <Leyenda
              series={[
                { clave: 'a', nombre: 'Aportado (neto)', color: 'var(--inversion)' },
                { clave: 'm', nombre: `Media ${formatearEuros(r.media)}`, color: 'var(--text-h)' },
                ...(objetivo > 0 ? [{ clave: 'o', nombre: `Objetivo ${formatearEuros(objetivo)}`, color: 'var(--accent)' }] : []),
              ]}
            />
            <span className="v5-tenue">* Mes en curso. Son aportaciones, no rentabilidad.</span>
          </div>
        </>
      )}
    </section>
  )
}
