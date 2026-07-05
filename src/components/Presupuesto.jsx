import { useMemo, useState } from 'react'
import { esInversion, formatearEuros } from '../lib/categorias'
import { formatearPorcentaje, totalesDe } from '../lib/movimientosUtils'
import { usePresupuesto } from '../lib/usePresupuesto'
import { useCountUp } from '../lib/useCountUp'

function Cifra({ valor, className }) {
  const animado = useCountUp(valor)
  return <span className={className}>{formatearEuros(animado)}</span>
}

function diasRestantesDelMes() {
  const hoy = new Date()
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  return ultimoDia - hoy.getDate() + 1
}

export default function Presupuesto({ usuarioId, movimientos }) {
  const {
    metodo,
    tasaAhorroObjetivo,
    gastoMaximoFijo,
    configurado,
    cargando,
    guardarPresupuesto,
  } = usePresupuesto(usuarioId)

  const [editando, setEditando] = useState(false)
  const [metodoInput, setMetodoInput] = useState('tasa')
  const [valorInput, setValorInput] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Regla única (ver CLAUDE.md): la inversión no es gasto de consumo,
  // así que no agota el presupuesto.
  const {
    ingresos: totalIngresos,
    gastos: totalGastos,
    ratioAhorro: ratioAhorroReal,
  } = totalesDe(movimientos)

  const topCategorias = useMemo(() => {
    const mapa = new Map()
    for (const m of movimientos) {
      if (m.tipo !== 'gasto' || esInversion(m)) continue
      const nombre = m.categoria?.nombre ?? 'Sin categoría'
      mapa.set(nombre, (mapa.get(nombre) ?? 0) + Number(m.importe))
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [movimientos])

  const [errorGuardado, setErrorGuardado] = useState(null)

  async function handleGuardar(e) {
    e.preventDefault()
    const numero = Number(valorInput)
    if (numero <= 0) return
    if (metodoInput === 'tasa' && numero > 100) return
    setGuardando(true)
    setErrorGuardado(null)
    const ok = await guardarPresupuesto(metodoInput, numero)
    setGuardando(false)
    if (ok) {
      setEditando(false)
    } else {
      setErrorGuardado('No se ha podido guardar. Inténtalo de nuevo.')
    }
  }

  if (cargando) return <p>Cargando presupuesto…</p>

  if (!configurado || editando) {
    return (
      <form className="presupuesto-config fade-in-up" onSubmit={handleGuardar}>
        <h2>{configurado ? 'Ajustar presupuesto' : 'Define tu presupuesto'}</h2>
        <p className="ayuda">Elige cómo prefieres limitar tu gasto mensual.</p>

        <div className="tipo-toggle">
          <button
            type="button"
            className={metodoInput === 'tasa' ? 'activo' : ''}
            onClick={() => setMetodoInput('tasa')}
          >
            Por tasa de ahorro
          </button>
          <button
            type="button"
            className={metodoInput === 'fijo' ? 'activo' : ''}
            onClick={() => setMetodoInput('fijo')}
          >
            Gasto máximo fijo
          </button>
        </div>

        {metodoInput === 'tasa' ? (
          <>
            <label htmlFor="tasa">Tasa de ahorro objetivo (%)</label>
            <input
              id="tasa"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="1"
              value={valorInput}
              onChange={(e) => setValorInput(e.target.value)}
              placeholder="ej. 20"
              autoFocus
            />
            <p className="ayuda">
              Calculamos cuánto puedes gastar cada mes según tus ingresos reales.
            </p>
          </>
        ) : (
          <>
            <label htmlFor="fijo">¿Cuánto quieres gastar como máximo al mes? (€)</label>
            <input
              id="fijo"
              type="number"
              inputMode="decimal"
              min="0"
              value={valorInput}
              onChange={(e) => setValorInput(e.target.value)}
              placeholder="ej. 500"
              autoFocus
            />
            <p className="ayuda">Un límite fijo, sin importar cuánto ingreses ese mes.</p>
          </>
        )}

        {errorGuardado && <p className="error">{errorGuardado}</p>}

        <button type="submit" disabled={guardando || valorInput === ''}>
          {guardando ? 'Guardando…' : 'Guardar presupuesto'}
        </button>

        {configurado && (
          <button type="button" className="btn-eliminar" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        )}
      </form>
    )
  }

  const presupuestoGasto = metodo === 'fijo' ? gastoMaximoFijo : totalIngresos * (1 - tasaAhorroObjetivo / 100)
  const restante = presupuestoGasto - totalGastos
  const porcentajeGastado = presupuestoGasto > 0 ? (totalGastos / presupuestoGasto) * 100 : 0
  const sobrepasado = totalGastos > presupuestoGasto && presupuestoGasto > 0
  const dias = diasRestantesDelMes()
  const presupuestoDiario = restante > 0 ? restante / dias : 0
  const sinIngresosParaCalcular = metodo === 'tasa' && totalIngresos === 0

  return (
    <div className="presupuesto fade-in-up">
      <div className="presupuesto-header">
        <h2>Presupuesto del mes</h2>
        <button
          type="button"
          className="link"
          onClick={() => {
            setMetodoInput(metodo)
            setValorInput(String(metodo === 'fijo' ? gastoMaximoFijo : tasaAhorroObjetivo))
            setEditando(true)
          }}
        >
          Editar
        </button>
      </div>

      <span className="balance-etiqueta-principal">
        {metodo === 'fijo'
          ? `Objetivo: gastar máximo ${formatearEuros(gastoMaximoFijo)} al mes`
          : `Objetivo: ahorrar el ${tasaAhorroObjetivo}% de tus ingresos`}
      </span>

      {sinIngresosParaCalcular ? (
        <p className="ayuda" style={{ marginTop: 12 }}>
          Registra algún ingreso este mes para calcular tu presupuesto de gasto.
        </p>
      ) : (
        <>
          <Cifra valor={presupuestoGasto} className="balance-hero" />
          <span className="balance-etiqueta-principal">disponible para gastar este mes</span>

          <div className="ratio-barra" style={{ marginTop: 16 }}>
            <div
              className={`ratio-barra-relleno ${sobrepasado ? 'sobrepasado' : ''}`}
              style={{ width: `${Math.min(porcentajeGastado, 100)}%` }}
            />
          </div>

          <div className="balance-grid" style={{ marginTop: 16 }}>
            <div className="balance-item">
              <span className="etiqueta">Gastado</span>
              <span className="valor gasto">{formatearEuros(totalGastos)}</span>
            </div>
            <div className="balance-item">
              <span className="etiqueta">{restante >= 0 ? 'Te queda' : 'Excedido en'}</span>
              <span className={`valor ${restante >= 0 ? 'ingreso' : 'gasto'}`}>
                {formatearEuros(Math.abs(restante))}
              </span>
            </div>
            <div className="balance-item">
              <span className="etiqueta">Ahorro real</span>
              <span className="valor">{formatearPorcentaje(ratioAhorroReal)}</span>
            </div>
          </div>

          {restante > 0 && (
            <p className="presupuesto-diario">
              Puedes gastar <strong>{formatearEuros(presupuestoDiario)}</strong> al día durante los{' '}
              {dias} días que quedan de mes.
            </p>
          )}

          {sobrepasado && (
            <p className="error" style={{ marginTop: 12 }}>
              Has superado tu presupuesto de gasto este mes.
            </p>
          )}

          {topCategorias.length > 0 && (
            <div className="presupuesto-categorias">
              <span className="balance-etiqueta-principal">En qué se te va el presupuesto</span>
              {topCategorias.map(([nombre, valor]) => (
                <div key={nombre} className="presupuesto-categoria-fila">
                  <span>{nombre}</span>
                  <div className="mini-barra">
                    <div
                      className="mini-barra-relleno"
                      style={{ width: `${presupuestoGasto > 0 ? Math.min((valor / presupuestoGasto) * 100, 100) : 0}%` }}
                    />
                  </div>
                  <span className="presupuesto-categoria-valor">{formatearEuros(valor)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
