import { useMemo } from 'react'
import { esInversion, formatearEuros } from '../lib/categorias'

const COLORES = ['#8b5cf6', '#22d3ee', '#34e89e', '#ff5d7e', '#f59e0b', '#64748b']

export default function GraficoCategorias({ movimientos }) {
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

  if (datos.total === 0) return null

  return (
    <div className="grafico fade-in-up">
      <h2>Gasto por categoría (este mes)</h2>

      <div className="barra-apilada">
        {datos.items.map((item) => (
          <div
            key={item.nombre}
            style={{ width: `${item.porcentaje}%`, background: item.color }}
            title={`${item.nombre}: ${formatearEuros(item.valor)}`}
          />
        ))}
      </div>

      <div className="leyenda-categorias">
        {datos.items.map((item) => (
          <div key={item.nombre} className="leyenda-item">
            <i className="punto" style={{ background: item.color }} />
            <span className="leyenda-nombre">{item.nombre}</span>
            <span className="leyenda-valor">
              {formatearEuros(item.valor)} · {item.porcentaje.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
