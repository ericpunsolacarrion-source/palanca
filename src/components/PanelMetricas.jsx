import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabaseClient'
import { formatearEuros } from '../lib/categorias'
import { formatearFecha } from '../lib/movimientosUtils'
import Icono from './Icono'
import InputImporte from './InputImporte'
import InputFecha from './InputFecha'
import { toast } from '../lib/toast'

// PANEL DE MÉTRICAS (solo administradores; la BD lo comprueba en
// palanca_metricas()). Responde: cuánta gente usa Palanca, cada cuánto
// vuelve, quién apunta gastos, dónde se pierde la gente (embudo) y si vuelve
// las semanas siguientes (retención). Definiciones: docs/METRICAS.md.

const ESTADOS = {
  activo: { texto: 'Activo', ayuda: 'Ha entrado en los últimos 7 días' },
  en_riesgo: { texto: 'En riesgo', ayuda: 'Última vez hace 8–30 días' },
  dormido: { texto: 'Dormido', ayuda: 'Más de 30 días sin entrar' },
  sin_empezar: {
    texto: 'Sin empezar',
    ayuda: 'Se dio de alta y no apuntó nada',
  },
}

const PLANES = {
  premium: { texto: 'Premium', ayuda: 'Premium vigente' },
  prueba: { texto: 'En prueba', ayuda: 'Premium de prueba, aún vigente' },
  gratis: { texto: 'Gratis', ayuda: 'Plan gratuito' },
  caducado: { texto: 'Caducado', ayuda: 'Tuvo Premium y se le acabó' },
}
const ORIGENES = {
  pago: 'Paga',
  prueba: 'Prueba',
  invitacion: 'Invitación',
  manual: 'Manual',
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
  clic_email: 'Volvieron desde un email',
  fulcro_local: 'Respuestas de Fulcro sin IA (gratis)',
}

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)
// "hoy", "ayer", "hace 12 días" (respecto a la fecha del informe).
function haceDias(fechaIso, hoyIso) {
  if (!fechaIso) return '—'
  const dias = Math.round((Date.parse(hoyIso) - Date.parse(fechaIso)) / 86400000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}
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
            <span
              style={{
                height: `${d.activos > 0 ? Math.max(4, (d.activos / max) * 100) : 0}%`,
              }}
            />
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
              <span
                style={{
                  width: `${Math.max(n > 0 ? 2 : 0, pct(n, e.altas))}%`,
                }}
              />
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

function PildoraPlan({ plan }) {
  return <span className={`pm-plan ${plan}`}>{PLANES[plan]?.texto ?? plan}</span>
}

const TIPOS_EMAIL = {
  inactivo: 'A los 3-6 días sin entrar',
  te_echamos: 'A los 14-21 días sin entrar',
  sin_empezar: 'Alta sin apuntar nada',
  prueba_termina: 'Fin de la prueba Premium',
  invitacion_premium: 'Invitación a Premium',
}

function SeccionRecordatorios({ r }) {
  const tipos = Object.entries(r.por_tipo ?? {}).sort((a, b) => b[1] - a[1])
  return (
    <section className="pm-bloque" aria-label="Recordatorios por email">
      <header className="pm-bloque-cab">
        <h3>Recordatorios por email</h3>
        <span className="pm-lectura">últimos 30 días</span>
      </header>
      <div className="pm-kpis">
        <Kpi etiqueta="Enviados" valor={r.enviados30} nota="Como mucho 1 cada 3 días por persona" />
        <Kpi etiqueta="Volvieron" valor={`${pct(r.volvieron30, r.enviados30)} %`} nota={`${r.volvieron30} entraron en las 48 h siguientes`} />
        <Kpi etiqueta="Clics" valor={r.clics30} nota="Abrieron la app desde el botón del email" />
        <Kpi etiqueta="Bajas" valor={r.bajas} nota="No quieren recordatorios" />
      </div>
      {tipos.length === 0 ? (
        <p className="ayuda-mini pm-nota">Aún no se ha enviado ninguno. Los emails están apagados hasta configurar el envío (docs/RECORDATORIOS.md).</p>
      ) : (
        <ul className="pm-eventos pm-nota">
          {tipos.map(([t, n]) => (
            <li key={t}>
              <span>{TIPOS_EMAIL[t] ?? t}</span>
              <strong>{n}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SeccionPlanes({ p, porPlan, cambios, total }) {
  const orden = ['premium', 'prueba', 'gratis', 'caducado']
  const filas = orden.map((k) => porPlan.find((x) => x.plan === k)).filter(Boolean)
  return (
    <section className="pm-bloque pm-planes" aria-label="Planes">
      <header className="pm-bloque-cab">
        <h3>Premium y Gratis</h3>
        <span className="pm-lectura">
          Últimos 30 días: <strong>+{p.altas30}</strong> pasos a Premium · <strong>{p.bajas30}</strong> bajas
        </span>
      </header>
      <div className="pm-kpis">
        <Kpi etiqueta="Premium" valor={p.premium} nota={`${pct(p.premium, total)} % de los usuarios`} />
        <Kpi
          etiqueta="En prueba"
          valor={p.prueba}
          nota={p.caducan7 > 0 ? `${p.caducan7} terminan en 7 días` : 'Ninguna termina esta semana'}
        />
        <Kpi
          etiqueta="Gratis"
          valor={p.gratis}
          nota={p.caducado > 0 ? `+${p.caducado} con Premium caducado` : 'Nadie con Premium caducado'}
        />
        <Kpi
          etiqueta="Ingresos al mes"
          valor={formatearEuros(p.ingresos_mes)}
          nota={`≈ ${formatearEuros(Math.round(p.ingresos_mes * 12))} al año`}
        />
      </div>
      <h4 className="pm-sub">¿Usan más la app los Premium?</h4>
      {filas.length === 0 ? (
        <p className="ayuda-mini">Aparecerá en cuanto haya usuarios.</p>
      ) : (
        <div className="pm-tabla-scroll">
          <table className="pm-tabla">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Usuarios</th>
                <th title="Han entrado en los últimos 7 días">Activos 7 d</th>
                <th title="Media de días entre visitas">Entran cada</th>
                <th title="Días con actividad al mes, entre los que entraron">Días/mes</th>
                <th title="Movimientos en 30 días, entre los que entraron">Movs/mes</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.plan}>
                  <td>
                    <PildoraPlan plan={f.plan} />
                  </td>
                  <td>{f.n}</td>
                  <td>
                    {f.activos7} <small>{pct(f.activos7, f.n)} %</small>
                  </td>
                  <td>{f.cada_cuanto == null ? '—' : `${num(f.cada_cuanto)} d`}</td>
                  <td>{num(f.dias_activos)}</td>
                  <td>{num(f.movs30)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h4 className="pm-sub">Cambios de plan recientes</h4>
      {cambios.length === 0 ? (
        <p className="ayuda-mini">Aún no hay cambios. Para dar Premium a alguien, toca su plan en la lista de usuarios.</p>
      ) : (
        <ul className="pm-cambios">
          {cambios.map((c, i) => (
            <li key={i}>
              <span className="pm-cambio-fecha">{formatearFecha(c.fecha.slice(0, 10))}</span>
              <span className="pm-cambio-txt">
                <strong>{c.email}</strong> → <PildoraPlan plan={c.plan === 'premium' && c.origen === 'prueba' ? 'prueba' : c.plan} />
                {c.plan === 'premium' && (
                  <small>
                    {ORIGENES[c.origen] ?? c.origen}
                    {c.importe_mensual > 0 && ` · ${formatearEuros(Number(c.importe_mensual))}/mes`}
                    {c.hasta && ` · hasta ${formatearFecha(c.hasta)}`}
                  </small>
                )}
                {c.nota && <small className="pm-cambio-nota">{c.nota}</small>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const sumarDias = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function GestionarPlan({ usuario, onCerrar, onGuardado }) {
  const vigente = usuario.plan === 'premium' || usuario.plan === 'prueba'
  const [plan, setPlan] = useState(vigente ? 'premium' : 'gratis')
  const [origen, setOrigen] = useState(usuario.plan_origen ?? 'pago')
  const [importe, setImporte] = useState(usuario.importe_mensual > 0 ? Number(usuario.importe_mensual) : null)
  const [hasta, setHasta] = useState(vigente ? usuario.plan_hasta : null)
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const tecla = (ev) => {
      if (ev.key === 'Escape') {
        ev.stopImmediatePropagation()
        onCerrar()
      }
    }
    window.addEventListener('keydown', tecla, true)
    return () => window.removeEventListener('keydown', tecla, true)
  }, [onCerrar])

  async function guardar() {
    setGuardando(true)
    const { error } = await supabase.rpc('admin_cambiar_plan', {
      p_usuario_id: usuario.uid,
      p_plan: plan,
      p_origen: plan === 'premium' ? origen : 'manual',
      p_importe: plan === 'premium' && origen === 'pago' ? Number(importe) || 0 : 0,
      p_hasta: plan === 'premium' ? hasta : null,
      p_nota: nota.trim() || null,
    })
    setGuardando(false)
    if (error) {
      toast(`No se ha podido cambiar el plan: ${error.message}`, 'error')
      return
    }
    toast(plan === 'premium' ? `${usuario.email} ya es Premium` : `${usuario.email} pasa a Gratis`)
    onGuardado()
  }

  const faltaImporte = plan === 'premium' && origen === 'pago' && !(Number(importe) > 0)
  const faltaFecha = plan === 'premium' && origen === 'prueba' && !hasta

  return (
    <div className="pm-hoja-fondo" onClick={onCerrar}>
      <div className="pm-hoja" role="dialog" aria-label={`Plan de ${usuario.email}`} onClick={(e) => e.stopPropagation()}>
        <header className="pm-hoja-cab">
          <div>
            <h3>Plan de {usuario.email}</h3>
            <span className="pm-meta">
              Ahora: <PildoraPlan plan={usuario.plan} />
              {usuario.plan_hasta && ` hasta ${formatearFecha(usuario.plan_hasta)}`}
            </span>
          </div>
          <button type="button" className="pm-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" tam={18} />
          </button>
        </header>

        <div className="pm-segmento" role="radiogroup" aria-label="Plan">
          {['gratis', 'premium'].map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={plan === k}
              className={plan === k ? 'activo' : ''}
              onClick={() => setPlan(k)}
            >
              {k === 'gratis' ? 'Gratis' : 'Premium'}
            </button>
          ))}
        </div>

        {plan === 'premium' && (
          <>
            <label className="pm-campo">
              <span>Cómo lo tiene</span>
              <select id="pm-origen" value={origen} onChange={(e) => setOrigen(e.target.value)}>
                <option value="pago">Paga</option>
                <option value="prueba">Prueba gratis</option>
                <option value="invitacion">Invitación (beta, amigos)</option>
                <option value="manual">Manual (otro motivo)</option>
              </select>
            </label>
            {origen === 'pago' && (
              <label className="pm-campo">
                <span>Paga al mes (si es anual, divide entre 12)</span>
                <InputImporte value={importe} onValueChange={setImporte} placeholder="3,99" aria-label="Importe al mes" />
              </label>
            )}
            <div className="pm-campo">
              <span>Hasta {origen === 'prueba' ? '(obligatorio en una prueba)' : '(opcional)'}</span>
              <div className="pm-rapidos">
                <button type="button" className={!hasta ? 'activo' : ''} onClick={() => setHasta(null)}>
                  Sin fecha
                </button>
                <button type="button" onClick={() => setHasta(sumarDias(14))}>
                  +14 días
                </button>
                <button type="button" onClick={() => setHasta(sumarDias(30))}>
                  +1 mes
                </button>
                <button type="button" onClick={() => setHasta(sumarDias(365))}>
                  +1 año
                </button>
              </div>
              <InputFecha id="pm-hasta" value={hasta} onChange={setHasta} />
            </div>
          </>
        )}

        <label className="pm-campo">
          <span>Nota (opcional, solo la ves tú)</span>
          <input
            id="pm-nota"
            type="text"
            maxLength={300}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej.: amigo de la beta, pago por Bizum"
          />
        </label>

        <button type="button" className="tb-form-guardar pm-guardar" onClick={guardar} disabled={guardando || faltaImporte || faltaFecha}>
          {guardando ? 'Guardando…' : plan === 'premium' ? 'Guardar como Premium' : 'Pasar a Gratis'}
        </button>
        {(faltaImporte || faltaFecha) && (
          <p className="ayuda-mini">{faltaImporte ? 'Pon cuánto paga al mes.' : 'Pon hasta cuándo dura la prueba.'}</p>
        )}
      </div>
    </div>
  )
}

function ListaUsuarios({ lista, hoy, onGestionar }) {
  const [filtro, setFiltro] = useState('todos')
  const [filtroPlan, setFiltroPlan] = useState('todos')
  const [q, setQ] = useState('')
  const visibles = lista.filter(
    (u) =>
      (filtro === 'todos' || u.estado === filtro) &&
      (filtroPlan === 'todos' || u.plan === filtroPlan) &&
      (!q || u.email.includes(q.trim().toLowerCase())),
  )
  return (
    <section className="pm-bloque">
      <header className="pm-bloque-cab">
        <h3>Usuarios</h3>
        <span className="pm-lectura">
          {visibles.length} de {lista.length}
        </span>
      </header>
      <div className="pm-filtros">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar email"
          aria-label="Buscar usuario por email"
        />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por estado">
          <option value="todos">Todos</option>
          {Object.entries(ESTADOS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.texto}
            </option>
          ))}
        </select>
        <select value={filtroPlan} onChange={(e) => setFiltroPlan(e.target.value)} aria-label="Filtrar por plan">
          <option value="todos">Todos los planes</option>
          {Object.entries(PLANES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.texto}
            </option>
          ))}
        </select>
      </div>
      {lista.length === 0 ? (
        <p className="ayuda-mini">Aún no hay usuarios. Aparecerán aquí en cuanto se dé de alta el primero (los emails test* no cuentan).</p>
      ) : (
        <div className="pm-tabla-scroll">
          <table className="pm-tabla pm-usuarios">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Plan</th>
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
                  <td>
                    <span className="pm-email">
                      {u.email || '(sin email)'}
                      <small>alta {formatearFecha(u.alta)}</small>
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="pm-plan-boton"
                      onClick={() => onGestionar(u)}
                      aria-label={`Cambiar plan de ${u.email}`}
                    >
                      <PildoraPlan plan={u.plan} />
                      {u.importe_mensual > 0 && <small>{formatearEuros(Number(u.importe_mensual))}/mes</small>}
                      {u.plan_hasta && (u.plan === 'premium' || u.plan === 'prueba') && <small>hasta {formatearFecha(u.plan_hasta)}</small>}
                    </button>
                  </td>
                  <td>
                    <span className={`pm-estado ${u.estado}`}>{ESTADOS[u.estado]?.texto ?? u.estado}</span>
                  </td>
                  <td title={u.ultima ? formatearFecha(u.ultima) : ''}>{haceDias(u.ultima, hoy)}</td>
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
      )}
    </section>
  )
}

export default function PanelMetricas({ onCerrar }) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [incluirme, setIncluirme] = useState(false)
  const [gestionando, setGestionando] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data, error: e } = await supabase.rpc('palanca_metricas', {
      p_incluir_admin: incluirme,
    })
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

  const eventos = useMemo(() => Object.entries(datos?.eventos30 ?? {}).sort((a, b) => b[1] - a[1]), [datos])

  const d = datos
  const stick = d ? pct(d.activos.dau_medio, d.activos.d30) : 0

  return createPortal(
    <div className="pm-fondo" onClick={(ev) => ev.stopPropagation()}>
      <section className="pm" role="dialog" aria-label="Métricas de Palanca">
        <header className="pm-cab">
          <div>
            <h2>Métricas de Palanca</h2>
            {d && (
              <span className="pm-meta">
                Actualizado{' '}
                {new Date(d.generado).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
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
              <Kpi
                etiqueta="Usuarios"
                valor={d.usuarios.total}
                nota={`+${d.usuarios.nuevos7} esta semana · +${d.usuarios.nuevos30} en 30 días`}
              />
              <Kpi etiqueta="Activos hoy" valor={d.activos.hoy} nota={`${num(d.activos.dau_medio)} de media al día`} />
              <Kpi etiqueta="Activos 7 días" valor={d.activos.d7} nota={`${pct(d.activos.d7, d.usuarios.total)} % del total`} />
              <Kpi etiqueta="Activos 30 días" valor={d.activos.d30} nota={`${pct(d.activos.d30, d.usuarios.total)} % del total`} />
              <Kpi
                etiqueta="Entran cada"
                valor={d.frecuencia.cada_cuanto_medio == null ? '—' : `${num(d.frecuencia.cada_cuanto_medio)} días`}
                nota={`${num(d.frecuencia.dias_activos_medio ?? 0)} días activos al mes de media`}
              />
              <Kpi etiqueta="Enganche" valor={`${stick} %`} nota="Activos de un día medio / activos del mes" />
              <Kpi
                etiqueta="Apuntan gastos"
                valor={d.frecuencia.registran30}
                nota={`${num(d.frecuencia.movs_por_activo ?? 0)} movimientos por activo (30 días)`}
              />
              <Kpi etiqueta="Ahorro negociado" valor={formatearEuros(Math.round(d.ahorrado_total))} nota="al año, entre todos" />
            </div>

            {d.recordatorios && <SeccionRecordatorios r={d.recordatorios} />}
            {d.planes && <SeccionPlanes p={d.planes} porPlan={d.por_plan ?? []} cambios={d.cambios_plan ?? []} total={d.usuarios.total} />}

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

            <ListaUsuarios lista={d.lista} hoy={d.hoy} onGestionar={setGestionando} />
          </>
        )}
      </section>
      {gestionando && (
        <GestionarPlan
          usuario={gestionando}
          onCerrar={() => setGestionando(null)}
          onGuardado={() => {
            setGestionando(null)
            cargar()
          }}
        />
      )}
    </div>,
    document.body,
  )
}
