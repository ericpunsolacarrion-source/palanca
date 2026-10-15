import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabaseClient'
import { formatearEuros } from '../lib/categorias'
import { formatearFecha } from '../lib/movimientosUtils'
import Icono from './Icono'

// PANEL DE MÉTRICAS (solo administradores; la BD lo comprueba en
// palanca_metricas()). Responde: cuánta gente usa Palanca, cada cuánto
// vuelve, quién apunta gastos, dónde se pierde la gente (embudo) y si vuelve
// las semanas siguientes (retención). Definiciones: docs/METRICAS.md.

const ESTADOS = {
  activo: { texto: 'Activo', ayuda: 'Ha entrado en los últimos 7 días' },
  en_riesgo: { texto: 'En riesgo', ayuda: 'Última vez hace 8–30 días' },
  dormido: { texto: 'Dormido', ayuda: 'Más de 30 días sin entrar' },
  sin_empezar: { texto: 'Sin empezar', ayuda: 'Se dio de alta y no apuntó nada' },
}

const EVENTOS = {
  visita: 'Visitas',
  movimiento: 'Movimientos a mano',
  movimiento_rapido: 'Movimientos rápidos',
  cobro_confirmado: 'Cobros confirmados',
  fijo_nuevo: 'Fijos creados',
  importacion: 'Importaciones (extracto)',
  importacion_capturas: 'Importaciones (capturas)',
  ahorro_negociado: 'Recibos negociados',
  tour: 'Demos vistas',
  datos_ejemplo: 'Vistas con datos de ejemplo',
  exportacion: 'Descargas de datos',
}

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)
const num = (v) => (v == null ? '—' : String(v).replace('.', ','))

function Kpi({ etiqueta, valor, nota }) {
  return (
    <div className="pm-kpi">
      <span className="pm-kpi-etq">{etiqueta}</span>
      <span className="pm-kpi-valor">{valor}</span>
      {nota && <span className="pm-kpi-nota">{nota}</span>}
    </div>
  )
}

function GraficoActivos({ serie }) {
  const [sel, setSel] = useState(null)
  const max = Math.max(1, ...serie.map((d) => d.activos))
  const actual = sel ?? serie.at(-1)
  return (
    <section className="pm-bloque">
      <header className="pm-bloque-cab">
        <h3>Usuarios activos por día</h3>
        <span className="pm-lectura">
          {formatearFecha(actual.dia)}: <strong>{actual.activos}</strong> activos · {actual.altas} altas
        </span>
      </header>
      <div className="pm-barras" role="img" aria-label="Usuarios activos cada día de los últimos 30 días" onMouseLeave={() => setSel(null)}>
        {serie.map((d) => (
          <button
            type="button"
            key={d.dia}
            className={`pm-barra ${sel?.dia === d.dia ? 'sel' : ''}`}
            onMouseEnter={() => setSel(d)}
            onFocus={() => setSel(d)}
            onClick={() => setSel(d)}
            aria-label={`${formatearFecha(d.dia)}: ${d.activos} activos, ${d.altas} altas`}
          >
            <span style={{ height: `${d.activos > 0 ? Math.max(4, (d.activos / max) * 100) : 0}%` }} />
          </button>
        ))}
      </div>
      <div className="pm-eje">
        <span>{formatearFecha(serie[0].dia).slice(0, 5)}</span>
        <span>hoy</span>
      </div>
    </section>
  )
}

function Embudo({ e }) {
  const pasos = [
    ['Se dan de alta', e.altas],
    ['Apuntan algo', e.primer_movimiento],
    ['Llegan a 10 movimientos', e.diez_movimientos],
    ['Añaden un fijo', e.fijos],
    ['Preguntan a Fulcro', e.fulcro],
    ['Vuelven 3 días o más', e.vuelve],
  ]
  return (
    <section className="pm-bloque">
      <header className="pm-bloque-cab">
        <h3>Embudo de activación</h3>
        <span className="pm-lectura">% sobre las altas</span>
      </header>
      <ul className="pm-embudo">
        {pasos.map(([t, n]) => (
          <li key={t}>
            <span className="pm-embudo-txt">{t}</span>
            <span className="pm-embudo-barra" aria-hidden="true">
              <span style={{ width: `${Math.max(n > 0 ? 2 : 0, pct(n, e.altas))}%` }} />
            </span>
            <span className="pm-embudo-num">
              {n} <small>{pct(n, e.altas)} %</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Retencion({ filas }) {
  const celda = (v, n) => (v == null ? <td className="pm-nd">—</td> : <td>{pct(v, n)} %</td>)
  return (
    <section className="pm-bloque">
      <header className="pm-bloque-cab">
        <h3>¿Vuelven? (por semana de alta)</h3>
        <span className="pm-lectura">% que entra en la semana 1, 2 y 4</span>
      </header>
      {filas.length === 0 ? (
        <p className="ayuda-mini">Aún no hay altas en las últimas 9 semanas.</p>
      ) : (
        <div className="pm-tabla-scroll">
          <table className="pm-tabla">
            <thead>
              <tr>
                <th>Semana</th>
                <th>Altas</th>
                <th>Sem. 1</th>
                <th>Sem. 2</th>
                <th>Sem. 4</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.semana}>
                  <td>{formatearFecha(f.semana).slice(0, 5)}</td>
                  <td>{f.n}</td>
                  {celda(f.s1, f.n)}
                  {celda(f.s2, f.n)}
                  {celda(f.s4, f.n)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ListaUsuarios({ lista }) {
  const [filtro, setFiltro] = useState('todos')
  const [q, setQ] = useState('')
  const visibles = lista.filter(
    (u) => (filtro === 'todos' || u.estado === filtro) && (!q || u.email.includes(q.trim().toLowerCase())),
  )
  return (
    <section className="pm-bloque">
      <header className="pm-bloque-cab">
        <h3>Usuarios</h3>
        <span className="pm-lectura">{visibles.length} de {lista.length}</span>
      </header>
      <div className="pm-filtros">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar email" aria-label="Buscar usuario por email" />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por estado">
          <option value="todos">Todos</option>
          {Object.entries(ESTADOS).map(([k, v]) => (
            <option key={k} value={k}>{v.texto}</option>
          ))}
        </select>
      </div>
      <div className="pm-tabla-scroll">
        <table className="pm-tabla pm-usuarios">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Estado</th>
              <th>Última vez</th>
              <th title="Días con actividad en los últimos 30">Días/30</th>
              <th title="Media de días entre una visita y la siguiente">Cada</th>
              <th title="Movimientos (sin ajustes) · últimos 30 días">Movs</th>
              <th>Fijos</th>
              <th>Fulcro</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((u) => (
              <tr key={u.email + u.alta}>
                <td className="pm-email">
                  {u.email || '(sin email)'}
                  <small>alta {formatearFecha(u.alta)}</small>
                </td>
                <td>
                  <span className={`pm-estado ${u.estado}`}>{ESTADOS[u.estado]?.texto ?? u.estado}</span>
                </td>
                <td>{u.ultima ? formatearFecha(u.ultima) : '—'}</td>
                <td>{u.dias30}</td>
                <td>{u.cada_cuanto == null ? '—' : `${num(u.cada_cuanto)} d`}</td>
                <td>
                  {u.movs} <small>· {u.movs30}</small>
                </td>
                <td>{u.fijos}</td>
                <td>{u.fulcro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function PanelMetricas({ onCerrar }) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [incluirme, setIncluirme] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data, error: e } = await supabase.rpc('palanca_metricas', { p_incluir_admin: incluirme })
    setCargando(false)
    if (e || !data) {
      setError(e?.message ?? 'Sin datos')
      return
    }
    setError(null)
    setDatos(data)
  }, [incluirme])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    const tecla = (ev) => ev.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onCerrar])

  const eventos = useMemo(
    () => Object.entries(datos?.eventos30 ?? {}).sort((a, b) => b[1] - a[1]),
    [datos],
  )

  const d = datos
  const stick = d ? pct(d.activos.dau_medio, d.activos.d30) : 0

  return createPortal(
    <div className="pm-fondo" onClick={(ev) => ev.stopPropagation()}>
      <section className="pm" role="dialog" aria-label="Métricas de Palanca">
        <header className="pm-cab">
          <div>
            <h2>Métricas de Palanca</h2>
            {d && <span className="pm-meta">Actualizado {new Date(d.generado).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
          <div className="pm-cab-acciones">
            <button type="button" className="link" onClick={cargar} disabled={cargando}>
              {cargando ? 'Cargando…' : 'Actualizar'}
            </button>
            <button type="button" className="pm-cerrar" onClick={onCerrar} aria-label="Cerrar">
              <Icono nombre="cerrar" tam={18} />
            </button>
          </div>
        </header>

        <label className="pm-incluirme">
          <input type="checkbox" checked={incluirme} onChange={(e) => setIncluirme(e.target.checked)} />
          Incluir mi propia cuenta (los usuarios test* nunca cuentan)
        </label>

        {error && (
          <div className="pm-error">
            <strong>No se pueden cargar las métricas.</strong>
            <p className="ayuda-mini">
              Si es la primera vez, falta ejecutar <code>supabase-schema-metricas.sql</code> en Supabase. Detalle: {error}
            </p>
          </div>
        )}

        {d && (
          <>
            <div className="pm-kpis">
              <Kpi etiqueta="Usuarios" valor={d.usuarios.total} nota={`+${d.usuarios.nuevos7} esta semana · +${d.usuarios.nuevos30} en 30 días`} />
              <Kpi etiqueta="Activos hoy" valor={d.activos.hoy} nota={`${num(d.activos.dau_medio)} de media al día`} />
              <Kpi etiqueta="Activos 7 días" valor={d.activos.d7} nota={`${pct(d.activos.d7, d.usuarios.total)} % del total`} />
              <Kpi etiqueta="Activos 30 días" valor={d.activos.d30} nota={`${pct(d.activos.d30, d.usuarios.total)} % del total`} />
              <Kpi
                etiqueta="Entran cada"
                valor={d.frecuencia.cada_cuanto_medio == null ? '—' : `${num(d.frecuencia.cada_cuanto_medio)} días`}
                nota={`${num(d.frecuencia.dias_activos_medio ?? 0)} días activos al mes de media`}
              />
              <Kpi etiqueta="Enganche" valor={`${stick} %`} nota="Activos de un día medio / activos del mes" />
              <Kpi etiqueta="Apuntan gastos" valor={d.frecuencia.registran30} nota={`${num(d.frecuencia.movs_por_activo ?? 0)} movimientos por activo (30 días)`} />
              <Kpi etiqueta="Ahorro negociado" valor={formatearEuros(Math.round(d.ahorrado_total))} nota="al año, entre todos" />
            </div>

            <div className="pm-estados">
              {Object.entries(ESTADOS).map(([k, v]) => (
                <div key={k} className="pm-estado-caja" title={v.ayuda}>
                  <span className={`pm-estado ${k}`}>{v.texto}</span>
                  <strong>{d.estados[k] ?? 0}</strong>
                  <small>{v.ayuda}</small>
                </div>
              ))}
            </div>

            {d.serie?.length > 0 && <GraficoActivos serie={d.serie} />}
            <Embudo e={d.embudo} />
            <Retencion filas={d.retencion} />

            <section className="pm-bloque">
              <header className="pm-bloque-cab">
                <h3>Qué hacen (últimos 30 días)</h3>
              </header>
              {eventos.length === 0 ? (
                <p className="ayuda-mini">Aún no hay eventos: empiezan a contar desde que se ejecuta el SQL.</p>
              ) : (
                <ul className="pm-eventos">
                  {eventos.map(([t, n]) => (
                    <li key={t}>
                      <span>{EVENTOS[t] ?? t}</span>
                      <strong>{n}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <ListaUsuarios lista={d.lista} />
          </>
        )}
      </section>
    </div>,
    document.body,
  )
}
