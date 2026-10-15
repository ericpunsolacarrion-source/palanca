import { etiquetaCategoria } from '../lib/categorias'
import { useMemo } from 'react'
import { esInversion, formatearEuros } from '../lib/categorias'
import { etiquetaMes, formatearPorcentaje, limiteGastoPresupuesto } from '../lib/movimientosUtils'
import { conceptoDe, fechaRelativa, resumenDelMes } from '../lib/inicio'
import { usePresupuestoCompartido } from '../lib/DatosCompartidos'
import Patrimonio from './Patrimonio'
import AvisosCobros from './AvisosCobros'
import Icono from './Icono'
import { preguntarAFulcro } from '../lib/fulcro'

// INICIO: lo esencial de un vistazo, en orden de importancia.
//   1. Lo que tienes (patrimonio, cómo ha cambiado, evolución).
//   2. Apuntar algo (acción más frecuente, a un toque).
//   3. Lo que pide atención (cobros de hoy por confirmar, avisos).
//   4. Cómo va el mes (ahorro, presupuesto o ritmo, en qué se va).
//   5. Lo último que ha pasado (últimos movimientos).
// El detalle (gráficos, comparativas, proyección) vive en "Análisis".

// Si ya trajo su historial alguna vez y hace ≥ 25 días de la última vez, se
// le propone traer lo nuevo del extracto (no se duplica nada): mantener la
// app al día sin apuntar a mano.
function diasDesdeUltimaImportacion(usuarioId) {
  try {
    const lotes = JSON.parse(localStorage.getItem(`palanca_importaciones_${usuarioId}`) || '[]')
    if (!Array.isArray(lotes) || lotes.length === 0) return null
    const ultima = Math.max(...lotes.map((l) => new Date(l.fecha).getTime()).filter(Number.isFinite))
    return Number.isFinite(ultima) ? Math.floor((Date.now() - ultima) / 86400000) : null
  } catch {
    return null
  }
}

function AccionesRapidas({ usuarioId, onRegistrar, diasSinRegistrar }) {
  const diasImport = useMemo(() => diasDesdeUltimaImportacion(usuarioId), [usuarioId])
  const toca = diasImport !== null && diasImport >= 25
  return (
    <div className="ini-acciones">
      <button type="button" className="ini-accion principal" onClick={() => onRegistrar('gasto')}>
        <Icono nombre="menos" tam={18} /> Gasto
      </button>
      <button type="button" className="ini-accion" onClick={() => onRegistrar('ingreso')}>
        <Icono nombre="mas" tam={18} /> Ingreso
      </button>
      <button type="button" className="ini-accion" onClick={() => onRegistrar('importar')} aria-label="Importar extracto del banco">
        <Icono nombre="importar" tam={18} /> Importar
      </button>
      {toca ? (
        <button type="button" className="ini-recordatorio ini-recordatorio-boton" onClick={() => onRegistrar('importar')}>
          Hace {diasImport} días que no traes tu extracto. Súbelo y añadimos solo lo nuevo
          <Icono nombre="chevron" tam={14} />
        </button>
      ) : diasSinRegistrar >= 3 && (
        <p className="ini-recordatorio">
          Llevas {diasSinRegistrar} días sin apuntar nada. ¿Ha entrado o salido dinero?
        </p>
      )}
    </div>
  )
}

// A partir de 10.000 € los céntimos no aportan y no caben en tres columnas.
const redondoSiGrande = (v) => (Math.abs(v) >= 10000 ? Math.round(v) : v)

function MesEnCurso({ movimientos, onVerAnalisis, onVerPresupuesto }) {
  const presupuesto = usePresupuestoCompartido()
  const r = useMemo(() => resumenDelMes(movimientos), [movimientos])
  const t = r.totales
  const limite = presupuesto.configurado
    ? limiteGastoPresupuesto(presupuesto, t.ingresos)
    : null
  const pctGastado = limite > 0 ? (t.gastos / limite) * 100 : 0
  const pctMes = ((r.dia - 0.5) / r.diasMes) * 100
  const restante = limite != null ? limite - t.gastos : null
  const porDia = restante != null && restante > 0 ? restante / r.diasRestantes : 0

  const mes = etiquetaMes(r.clave, { month: 'long' })
  const ahorroPositivo = t.ahorro >= 0

  return (
    <section className="ini-card ini-mes fade-in-up" aria-label={`Así va ${mes}`}>
      <header className="ini-card-cab">
        <h2 className="ini-titulo">Así va {mes.toLowerCase()}</h2>
        <span className="ini-meta">
          {r.diasRestantes === 1 ? 'último día' : `quedan ${r.diasRestantes} días`}
        </span>
      </header>

      {r.ingresoPendiente ? (
        // Cobra más adelante en el mes: no es "ir en negativo", solo va por delante.
        <div className="ini-mes-ahorro">
          <span className="ini-mes-etq">Llevas gastado</span>
          <span className="ini-mes-cifra">{formatearEuros(t.gastos)}</span>
          <span className="ini-mes-sub">Tu ingreso suele llegar hacia el día {r.diaIngresoHabitual}</span>
        </div>
      ) : (
        <div className="ini-mes-ahorro">
          <span className="ini-mes-etq">{ahorroPositivo ? 'Has ahorrado' : 'Has gastado más de lo que ha entrado'}</span>
          <span className={`ini-mes-cifra ${ahorroPositivo ? 'positivo' : 'negativo'}`}>
            {ahorroPositivo ? '' : '−'}
            {formatearEuros(Math.abs(t.ahorro))}
          </span>
          {t.ingresos > 0 && (
            <span className="ini-mes-sub">
              {ahorroPositivo
                ? `El ${formatearPorcentaje(t.ratioAhorro, 0)} de lo que has ingresado`
                : 'Revisa en qué se te ha ido'}
            </span>
          )}
        </div>
      )}

      <dl className="ini-trio">
        <div>
          <dt><i className="ini-punto ingreso" />Ingresos</dt>
          <dd>{formatearEuros(redondoSiGrande(t.ingresos))}</dd>
        </div>
        <div>
          <dt><i className="ini-punto gasto" />Gastos</dt>
          <dd>{formatearEuros(redondoSiGrande(t.gastos))}</dd>
        </div>
        <div>
          <dt><i className="ini-punto inversion" />Invertido</dt>
          <dd>{formatearEuros(redondoSiGrande(t.invertido))}</dd>
        </div>
      </dl>

      {limite != null ? (
        <button type="button" className="ini-presu" onClick={onVerPresupuesto}>
          <span className="ini-presu-fila">
            <span>Presupuesto</span>
            <span className={restante < 0 ? 'negativo' : ''}>
              {restante >= 0
                ? `Te quedan ${formatearEuros(Math.round(restante))}`
                : `Te has pasado ${formatearEuros(Math.round(-restante))}`}
            </span>
          </span>
          <span className="ini-barra" role="presentation">
            <span
              className={`ini-barra-relleno ${pctGastado > 100 ? 'pasado' : pctGastado > pctMes + 5 ? 'rapido' : ''}`}
              style={{ width: `${Math.min(100, pctGastado)}%` }}
            />
            <span className="ini-barra-hoy" style={{ left: `${pctMes}%` }} title="Hoy" />
          </span>
          <span className="ini-presu-nota">
            {restante > 0
              ? `Unos ${formatearEuros(Math.floor(porDia))} al día hasta fin de mes`
              : 'Has llegado al límite que te pusiste'}
          </span>
        </button>
      ) : (
        r.ritmo && (
          <p className={`ini-ritmo ${r.ritmo.difPct > 5 ? 'alto' : r.ritmo.difPct < -5 ? 'bajo' : ''}`}>
            {Math.abs(r.ritmo.difPct) <= 5
              ? 'Gastas como siempre a estas alturas del mes.'
              : r.ritmo.difPct < 0
                ? `Gastas un ${Math.round(-r.ritmo.difPct)} % menos que de costumbre a estas alturas.`
                : `Gastas un ${Math.round(r.ritmo.difPct)} % más que de costumbre a estas alturas.`}
          </p>
        )
      )}

      {r.categorias.length > 0 && (
        <div className="ini-cats">
          <span className="ini-subtitulo">En qué se va</span>
          {r.categorias.map((c, i) => (
            <div key={c.nombre} className="ini-cat">
              <span className="ini-cat-nombre">{etiquetaCategoria(c.nombre)}</span>
              <span className="ini-cat-barra" aria-hidden="true">
                <span style={{ width: `${Math.max(2, c.pct)}%`, background: c.resto ? 'var(--cat-6)' : `var(--cat-${i + 1})` }} />
              </span>
              <span className="ini-cat-valor">{formatearEuros(Math.round(c.total))}</span>
            </div>
          ))}
        </div>
      )}

      <div className="ini-mes-pie">
        <button type="button" className="ini-ver-mas" onClick={onVerAnalisis}>
          Ver análisis <Icono nombre="chevron" tam={16} />
        </button>
        <button type="button" className="ini-ver-mas ini-fulcro" onClick={() => preguntarAFulcro('¿Cómo voy este mes?')}>
          <Icono nombre="consultor" tam={16} /> ¿Cómo voy? Pregunta a Fulcro
        </button>
      </div>
    </section>
  )
}

function UltimosMovimientos({ movimientos, onVerTodos }) {
  const ultimos = movimientos.slice(0, 5)
  return (
    <section className="ini-card fade-in-up" aria-label="Últimos movimientos">
      <header className="ini-card-cab">
        <h2 className="ini-titulo">Últimos movimientos</h2>
        <button type="button" className="link" onClick={onVerTodos}>
          Ver todos
        </button>
      </header>
      <ul className="ini-movs">
        {ultimos.map((m) => {
          const clase = m.tipo === 'ingreso' ? 'ingreso' : esInversion(m) ? 'inversion' : 'gasto'
          const concepto = conceptoDe(m)
          return (
            <li key={m.id} className="ini-mov">
              <span className={`ini-mov-avatar ${clase}`} aria-hidden="true">
                {concepto.charAt(0).toUpperCase()}
              </span>
              <span className="ini-mov-texto">
                <span className="ini-mov-concepto">{concepto}</span>
                <span className="ini-mov-meta">
                  {etiquetaCategoria(m.categoria?.nombre)} · {fechaRelativa(m.fecha)}
                </span>
              </span>
              <span className={`ini-mov-importe ${clase}`}>
                {m.tipo === 'ingreso' ? '+' : clase === 'inversion' ? '' : '−'}
                {formatearEuros(Number(m.importe))}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function Inicio({
  usuarioId,
  movimientos,
  recurrentes,
  cargandoRecurrentes,
  diasSinRegistrar,
  soloLectura = false,
  onGuardado,
  onRegistrar,
  onConfirmarCobro,
  onIrA,
  onVerAnalisis,
}) {
  return (
    <div className="ini">
      <Patrimonio
        usuarioId={usuarioId}
        movimientos={movimientos}
        onGuardado={onGuardado}
        onVerInversion={() => onIrA('inversiones')}
        soloLectura={soloLectura}
      />
      <AccionesRapidas usuarioId={soloLectura ? null : usuarioId} onRegistrar={onRegistrar} diasSinRegistrar={soloLectura ? 0 : diasSinRegistrar} />
      <AvisosCobros
        cargando={cargandoRecurrentes}
        usuarioId={usuarioId}
        recurrentes={recurrentes}
        movimientos={movimientos}
        onVerSuscripciones={() => onIrA('suscripciones')}
        onConfirmar={onConfirmarCobro}
      />
      <MesEnCurso movimientos={movimientos} onVerAnalisis={onVerAnalisis} onVerPresupuesto={() => onIrA('presupuesto')} />
      <UltimosMovimientos movimientos={movimientos} onVerTodos={() => onRegistrar('historial')} />
    </div>
  )
}
