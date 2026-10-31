import { etiquetaCategoria } from '../lib/categorias'
import { useMemo } from 'react'
import { esInversion, esTraspaso, formatearEuros } from '../lib/categorias'
import { agregarPorMes, etiquetaMes, formatearFecha, formatearPorcentaje, limiteGastoPresupuesto } from '../lib/movimientosUtils'
import { conceptoDe, fechaRelativa, resumenDelMes } from '../lib/inicio'
import { usePresupuestoCompartido } from '../lib/DatosCompartidos'
import Patrimonio from './Patrimonio'
import AvisosCobros from './AvisosCobros'
import Icono from './Icono'
import { preguntarAFulcro } from '../lib/fulcro'
import { esV3 } from '../lib/diseno'

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
        <Vuelta dias={diasSinRegistrar} onApuntar={() => onRegistrar('gasto')} />
      )}
    </div>
  )
}

// Tras 3+ días sin apuntar: un empujón amable, sin culpa. (Las frases
// motivadoras quedan pendientes de rediseñar: docs/PENDIENTES.md.)
function Vuelta({ dias, onApuntar }) {
  return (
    <div className="ini-vuelta">
      <p className="ini-vuelta-texto">
        Llevas <strong>{dias} días</strong> sin apuntar nada. ¿Ha entrado o salido dinero?
      </p>
      <button type="button" className="ini-vuelta-boton" onClick={onApuntar}>
        Ponerme al día <Icono nombre="chevron" tam={14} />
      </button>
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
          // Inversión (aportar o retirar) en dorado; traspasos entre tus cuentas, neutros.
          const clase = esInversion(m) ? 'inversion' : esTraspaso(m) ? 'traspaso' : m.tipo === 'ingreso' ? 'ingreso' : 'gasto'
          const concepto = conceptoDe(m)
          return (
            <li key={m.id} className="ini-mov">
              <span className={`ini-mov-avatar ${clase}`} aria-hidden="true">
                {concepto.charAt(0).toUpperCase()}
              </span>
              <span className="ini-mov-texto">
                <span className="ini-mov-concepto">{concepto}</span>
                <span className="ini-mov-meta">
                  {etiquetaCategoria(m.categoria?.nombre, m.tipo)} · {fechaRelativa(m.fecha)}
                </span>
              </span>
              <span className={`ini-mov-importe ${clase}`}>
                {clase === 'gasto' ? '−' : clase === 'ingreso' || (clase === 'inversion' && m.tipo === 'ingreso') ? '+' : ''}
                {formatearEuros(Number(m.importe))}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// Diseño v3: el mes en cuatro tarjetas. La del ahorro es la sólida (la que
// manda); las cifras salen de las mismas utilidades que el resto de Inicio.
function Rejilla({ movimientos }) {
  const presupuesto = usePresupuestoCompartido()
  const r = useMemo(() => resumenDelMes(movimientos), [movimientos])
  const serie = useMemo(() => agregarPorMes(movimientos, 6).map((m) => m.ahorro), [movimientos])
  const t = r.totales
  const max = Math.max(1, ...serie.map((v) => Math.max(0, v)))
  const limite = presupuesto.configurado ? limiteGastoPresupuesto(presupuesto, t.ingresos) : null
  const restante = limite != null ? limite - t.gastos : null

  const ingresoMayor = useMemo(() => {
    const delMes = movimientos.filter((m) => m.tipo === 'ingreso' && m.fecha.slice(0, 7) === r.clave && !esInversion(m) && !esTraspaso(m))
    return delMes.sort((a, b) => Number(b.importe) - Number(a.importe))[0] ?? null
  }, [movimientos, r.clave])
  const plataformas = useMemo(
    () => new Set(movimientos.filter((m) => esInversion(m) && m.fuente_id).map((m) => m.fuente_id)).size,
    [movimientos],
  )

  const gastoNota =
    restante != null
      ? restante >= 0
        ? `${formatearEuros(Math.round(restante))} libres · ${formatearEuros(Math.floor(restante / Math.max(1, r.diasRestantes)))}/día`
        : `Te has pasado ${formatearEuros(Math.round(-restante))}`
      : r.ritmo
        ? Math.abs(r.ritmo.difPct) <= 5
          ? 'Como siempre'
          : `${r.ritmo.difPct > 0 ? '+' : '−'}${Math.round(Math.abs(r.ritmo.difPct))} % que de costumbre`
        : `Quedan ${r.diasRestantes} días`

  return (
    <section className="v3-rejilla fade-in-up" aria-label="Así va el mes">
      <div className="v3-tarjeta solida">
        <span className="v3-tarjeta-cab">
          {t.ahorro >= 0 ? `Ahorrado en ${etiquetaMes(r.clave, { month: 'short' }).toLowerCase().replace('.', '')}.` : 'Este mes vas en'}
          <Icono nombre="sube" tam={14} />
        </span>
        <span className="v3-tarjeta-cifra">
          {t.ahorro < 0 ? '−' : ''}
          {formatearEuros(redondoSiGrande(Math.abs(t.ahorro)))}
        </span>
        <span className="v3-barritas" aria-hidden="true">
          {serie.map((v, i) => (
            <i key={i} style={{ height: `${Math.max(8, (Math.max(0, v) / max) * 100)}%` }} />
          ))}
        </span>
      </div>
      <div className="v3-tarjeta">
        <span className="v3-tarjeta-cab">Gastado<Icono nombre="menos" tam={14} /></span>
        <span className="v3-tarjeta-cifra">{formatearEuros(redondoSiGrande(t.gastos))}</span>
        <span className={`v3-pastilla ${restante != null && restante < 0 ? 'mal' : 'neutra'}`}>{gastoNota}</span>
      </div>
      <div className="v3-tarjeta">
        <span className="v3-tarjeta-cab">Ingresos<Icono nombre="mas" tam={14} /></span>
        <span className="v3-tarjeta-cifra">{formatearEuros(redondoSiGrande(t.ingresos))}</span>
        <span className="v3-pastilla">
          {ingresoMayor ? `${conceptoDe(ingresoMayor)} · ${formatearFecha(ingresoMayor.fecha).slice(0, 5)}` : 'Aún sin ingresos'}
        </span>
      </div>
      <div className="v3-tarjeta">
        <span className="v3-tarjeta-cab">Invertido este mes<Icono nombre="inversion" tam={14} /></span>
        <span className="v3-tarjeta-cifra">{formatearEuros(redondoSiGrande(t.invertido))}</span>
        <span className="v3-pastilla laton">
          {plataformas === 1 ? '1 plataforma' : plataformas > 1 ? `${plataformas} plataformas` : 'Sin plataformas'}
        </span>
      </div>
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
  avisosRenovacion = null,
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
      {esV3() && <Rejilla movimientos={movimientos} />}
      <AccionesRapidas usuarioId={soloLectura ? null : usuarioId} onRegistrar={onRegistrar} diasSinRegistrar={soloLectura ? 0 : diasSinRegistrar} />
      <AvisosCobros
        cargando={cargandoRecurrentes}
        usuarioId={usuarioId}
        recurrentes={recurrentes}
        movimientos={movimientos}
        onVerSuscripciones={() => onIrA('suscripciones')}
        onConfirmar={onConfirmarCobro}
        avisosRenovacion={avisosRenovacion}
      />
      <MesEnCurso movimientos={movimientos} onVerAnalisis={onVerAnalisis} onVerPresupuesto={() => onIrA('presupuesto')} />
      <UltimosMovimientos movimientos={movimientos} onVerTodos={() => onRegistrar('historial')} />
    </div>
  )
}
