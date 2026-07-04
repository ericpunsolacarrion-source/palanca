import { formatearEuros } from '../lib/categorias'

export default function ListaMovimientos({ movimientos, cargando }) {
  if (cargando) return <p>Cargando movimientos…</p>
  if (movimientos.length === 0) return <p>Todavía no hay movimientos este mes.</p>

  return (
    <ul className="lista-movimientos">
      {movimientos.map((m) => (
        <li key={m.id} className={m.tipo}>
          <div className="linea-principal">
            <span className="categoria">
              {m.categoria?.nombre ?? 'Sin categoría'}
              {m.fuente && <span className="fuente"> · {m.fuente.nombre}</span>}
            </span>
            <span className="importe">
              {m.tipo === 'gasto' ? '-' : '+'}
              {formatearEuros(m.importe)}
            </span>
          </div>
          <div className="linea-secundaria">
            <span>
              {m.fecha} <span className="badge-fijo">{m.es_fijo ? 'Fijo' : 'Variable'}</span>
            </span>
            {m.nota && <span className="nota">{m.nota}</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}
