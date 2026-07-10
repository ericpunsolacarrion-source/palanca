import { useMemo, useState } from 'react'
import { formatearEuros } from '../../lib/categorias'
import { proyectarInteresCompuesto } from '../../lib/movimientosUtils'
import SimulacionesGuardadas from '../SimulacionesGuardadas'

// Usa la fórmula única de movimientosUtils; el toggle "al principio del mes"
// aplica un mes extra de interés sobre esa base.
function valorFinal(inicial, mensual, tasaMensual, meses, alPrincipio) {
  const anios = meses / 12
  const rentabilidadAnual = tasaMensual * 12 * 100
  const base = proyectarInteresCompuesto({ inicial, mensual, anios, rentabilidadAnual }).valorFinal
  return alPrincipio && tasaMensual !== 0 ? base * (1 + tasaMensual) - mensual : base
}

export default function InteresCompuesto({ usuarioId }) {
  const [inicial, setInicial] = useState('')
  const [mensual, setMensual] = useState('')
  const [anios, setAnios] = useState('')
  const [rentabilidad, setRentabilidad] = useState('')
  const [momentoDeposito, setMomentoDeposito] = useState('final')

  const aportacionInicial = Number(inicial) || 0
  const aportacionMensual = Number(mensual) || 0
  const numAnios = Number(anios) || 0
  const numRentabilidad = Number(rentabilidad) || 0
  const alPrincipio = momentoDeposito === 'inicio'

  const puedeCalcular = numAnios > 0 && (aportacionInicial > 0 || aportacionMensual > 0)

  const porAnio = useMemo(() => {
    if (!puedeCalcular) return []
    const r = numRentabilidad / 100 / 12
    const filas = []
    for (let anio = 1; anio <= numAnios; anio += 1) {
      const meses = anio * 12
      const balance = valorFinal(aportacionInicial, aportacionMensual, r, meses, alPrincipio)
      const depositosTotales = aportacionInicial + aportacionMensual * meses
      const interesTotal = balance - depositosTotales
      filas.push({
        anio,
        depositoAnual: aportacionMensual * 12,
        depositosTotales,
        interesTotal,
        balance,
      })
    }
    return filas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeCalcular, aportacionInicial, aportacionMensual, numAnios, numRentabilidad, alPrincipio])

  const resultado = porAnio[porAnio.length - 1]

  const datosPie = resultado
    ? [
        { nombre: 'Balance Inicial', valor: aportacionInicial, color: 'var(--gasto)' },
        {
          nombre: 'Depósitos Periódicos',
          valor: resultado.depositosTotales - aportacionInicial,
          color: 'var(--accent)',
        },
        { nombre: 'Interés total', valor: resultado.interesTotal, color: 'var(--ingreso)' },
      ]
    : []

  const totalPie = datosPie.reduce((s, d) => s + d.valor, 0)
  let acumulado = 0
  const gradiente = datosPie
    .map((d) => {
      const desde = totalPie > 0 ? (acumulado / totalPie) * 100 : 0
      acumulado += d.valor
      const hasta = totalPie > 0 ? (acumulado / totalPie) * 100 : 0
      return `${d.color} ${desde}% ${hasta}%`
    })
    .join(', ')

  const maximoBarra = resultado ? resultado.balance : 0

  return (
    <div className="simulador fade-in-up">
      <h2>Interés compuesto</h2>
      <p className="ayuda">
        Proyección matemática de cómo crecería tu dinero con aportaciones periódicas. No es
        una recomendación de inversión, solo una estimación.
      </p>

      <label htmlFor="ic-inicial">Balance inicial (€)</label>
      <input
        id="ic-inicial"
        type="number"
        inputMode="decimal"
        min="0"
        value={inicial}
        onChange={(e) => setInicial(e.target.value)}
        placeholder="ej. 1000"
      />

      <label htmlFor="ic-mensual">Depósito periódico mensual (€)</label>
      <input
        id="ic-mensual"
        type="number"
        inputMode="decimal"
        min="0"
        value={mensual}
        onChange={(e) => setMensual(e.target.value)}
        placeholder="ej. 100"
      />

      <label>¿Cuándo haces el depósito de cada mes?</label>
      <div className="tipo-toggle">
        <button
          type="button"
          className={momentoDeposito === 'inicio' ? 'activo' : ''}
          onClick={() => setMomentoDeposito('inicio')}
        >
          Al principio
        </button>
        <button
          type="button"
          className={momentoDeposito === 'final' ? 'activo' : ''}
          onClick={() => setMomentoDeposito('final')}
        >
          Al final
        </button>
      </div>

      <label htmlFor="ic-anios">Duración (años)</label>
      <input
        id="ic-anios"
        type="number"
        inputMode="decimal"
        min="0"
        value={anios}
        onChange={(e) => setAnios(e.target.value)}
        placeholder="ej. 10"
      />

      <label htmlFor="ic-rentabilidad">Rentabilidad anual estimada (%)</label>
      <input
        id="ic-rentabilidad"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        value={rentabilidad}
        onChange={(e) => setRentabilidad(e.target.value)}
        placeholder="ej. 6"
      />

      {resultado && (
        <>
          <div className="ic-resultado-hero">
            <span className="balance-etiqueta-principal">Puedes ahorrar</span>
            <span className="balance-hero">{formatearEuros(resultado.balance)}</span>
            <span className="ayuda">
              ahorro {formatearEuros(aportacionMensual)} mensual durante {numAnios}{' '}
              {numAnios === 1 ? 'año' : 'años'}
            </span>
          </div>

          <div className="ic-pie-fila">
            <div className="ic-pie" style={{ background: `conic-gradient(${gradiente})` }} />
            <div className="ic-pie-leyenda">
              {datosPie.map((d) => (
                <div key={d.nombre} className="leyenda-item">
                  <i className="punto" style={{ background: d.color }} />
                  <span className="leyenda-nombre">{d.nombre}</span>
                  <span className="leyenda-valor">{formatearEuros(d.valor)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ic-barras">
            {porAnio.map((f) => (
              <div key={f.anio} className="ic-barra-col" title={`Año ${f.anio}: ${formatearEuros(f.balance)}`}>
                <div className="ic-barra-apilada" style={{ height: '100%' }}>
                  <div
                    className="ic-barra-segmento interes"
                    style={{ height: `${(f.interesTotal / maximoBarra) * 100}%` }}
                  />
                  <div
                    className="ic-barra-segmento depositos"
                    style={{ height: `${((f.depositosTotales - aportacionInicial) / maximoBarra) * 100}%` }}
                  />
                  <div
                    className="ic-barra-segmento inicial"
                    style={{ height: `${(aportacionInicial / maximoBarra) * 100}%` }}
                  />
                </div>
                <span>{f.anio}</span>
              </div>
            ))}
          </div>

          <div className="ic-tabla-scroll">
            <table className="ic-tabla">
              <thead>
                <tr>
                  <th>Año</th>
                  <th>Depósitos totales</th>
                  <th>Interés total</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {porAnio.map((f) => (
                  <tr key={f.anio}>
                    <td>{f.anio}</td>
                    <td>{formatearEuros(f.depositosTotales)}</td>
                    <td>{formatearEuros(f.interesTotal)}</td>
                    <td>{formatearEuros(f.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <SimulacionesGuardadas
        usuarioId={usuarioId}
        tipo="interes_compuesto"
        datosActuales={puedeCalcular ? { inicial, mensual, anios, rentabilidad, momentoDeposito } : null}
        onCargar={(datos) => {
          setInicial(String(datos.inicial))
          setMensual(String(datos.mensual))
          setAnios(String(datos.anios))
          setRentabilidad(String(datos.rentabilidad))
          setMomentoDeposito(datos.momentoDeposito ?? 'final')
        }}
      />
    </div>
  )
}
