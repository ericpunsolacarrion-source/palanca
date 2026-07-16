import { useMemo, useState } from 'react'
import { esInversion, formatearEuros } from '../lib/categorias'
import { formatearFecha } from '../lib/movimientosUtils'

const COLORES = ['#8b5cf6', '#22d3ee', '#34e89e', '#ff5d7e', '#f59e0b', '#64748b']

export default function GraficoCategorias({ movimientos, etiqueta = 'este mes' }) {
  const [abierta, setAbierta] = useState(null)

  const datos = useMemo(() => {
    const mapa = new Map()
    for (const m of movimientos) {
      if (m.tipo !== 'gasto' || esInversion(m)) continue
      const nombre = m.categoria?.nombre ?? 'Sin categoría'
      mapa.set(nombre, (mapa.get(nombre) ?? 0) + Number(m.importe))
    }
    const total = [...mapa.values()].reduce((s, v) => s + v, 0)
    return {
      total,
      items: [...mapa.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([nombre, valor], i) => ({
          nombre,
          valor,
          porcentaje: total > 0 ? (valor / total) * 100 : 0,
          color: COLORES[i % COLORES.length],
        })),
    }
  }, [movimientos])

  // Movimientos de la categoría abierta, en el periodo (mes actual), por fecha desc.
  const detalle = useMemo(() => {
    if (!abierta) return []
    return movimientos
      .filter(
        (m) =>
          m.tipo === 'gasto' &&
          !esInversion(m) &&
          (m.categoria?.nombre ?? 'Sin categoría') === abierta,
      )
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
  }, [movimientos, abierta])

  if (datos.total === 0) return null

  if (abierta) {
    const item = datos.items.find((x) => x.nombre === abierta)
    return (
      <div className="grafico fade-in-up">
        <div className="detalle-cat-cabecera">
          <button type="button" className="btn-volver" onClick={() => setAbierta(null)}>
            ← Categorías
          </button>
          <span className="detalle-cat-total">
            {item && <i className="punto" style={{ background: item.color }} />}
            {abierta}: <strong className="gasto">{formatearEuros(item?.valor ?? 0)}</strong>
          </span>
        </div>
        <ul className="detalle-cat-lista">
          {detalle.map((m) => (
            <li key={m.id}>
              <span className="dc-izq">
                <span className="dc-fecha">{formatearFecha(m.fecha)}</span>
                {m.fuente?.nombre && <span className="dc-concepto">{m.fuente.nombre}</span>}
                {m.nota && <span className="dc-nota">{m.nota}</span>}
              </span>
              <span className="dc-importe gasto">-{formatearEuros(Number(m.importe))}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="grafico fade-in-up">
      <h2>Gasto por categoría ({etiqueta})</h2>

      <div className="barra-apilada">
        {datos.items.map((item) => (
          <button
            key={item.nombre}
            type="button"
            aria-label={`Ver ${item.nombre}`}
            style={{ width: `${item.porcentaje}%`, background: item.color }}
            title={`${item.nombre}: ${formatearEuros(item.valor)}`}
            onClick={() => setAbierta(item.nombre)}
          />
        ))}
      </div>

      <div className="leyenda-categorias">
        {datos.items.map((item) => (
          <button
            key={item.nombre}
            type="button"
            className="leyenda-item leyenda-item-btn"
            onClick={() => setAbierta(item.nombre)}
          >
            <i className="punto" style={{ background: item.color }} />
            <span className="leyenda-nombre">{item.nombre}</span>
            <span className="leyenda-valor">
              {formatearEuros(item.valor)} · {item.porcentaje.toFixed(0)}%
            </span>
            <span className="leyenda-flecha">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
