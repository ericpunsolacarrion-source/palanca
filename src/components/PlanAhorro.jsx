import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatearEuros } from '../lib/categorias'
import { biografiaRecurrente } from '../lib/biografiaRecurrente'
import { guionLlamada, leerAhorros, planDeAhorro, registrarAhorro, totalAhorrado } from '../lib/negociables'
import { preguntarAFulcro } from '../lib/fulcro'
import { esDemo, AVISO_DEMO } from '../lib/datosDemo'
import { toast } from '../lib/toast'
import InputImporte from './InputImporte'
import Icono from './Icono'

// PLAN DE AHORRO (pestaña Fijos): de tus recibos, cuáles se pueden negociar y
// cuánto podrías ahorrar, cuándo actuar y cómo (pasos + guion de llamada con
// tus datos). Al conseguir un precio mejor se registra y se ve "lo que
// Palanca te ha ahorrado". Lo de precio fijo (Netflix…) se trata aparte:
// no se negocia, se pausa o se rota.

function HojaNegociar({ item, usuarioId, onCerrar, onActualizar, onAhorro }) {
  const { rec, tipo, palanca, momento, ahorroMin, ahorroMax } = item
  const bio = useMemo(() => biografiaRecurrente(rec), [rec])
  const guion = guionLlamada(rec, tipo, { antiguedad: bio.meses >= 1 ? bio.antiguedad : null })
  const [nuevo, setNuevo] = useState(null)
  const [hechos, setHechos] = useState(() => new Set())

  async function copiar() {
    try {
      await navigator.clipboard.writeText(guion)
      toast('Guion copiado')
    } catch {
      toast('No se ha podido copiar: mantén pulsado el texto para seleccionarlo.', 'error')
    }
  }

  async function guardarNuevoPrecio() {
    const n = Number(nuevo)
    if (!(n > 0)) return
    if (esDemo(rec.id)) return toast(AVISO_DEMO)
    if (n >= Number(rec.importe)) return toast('El nuevo precio debe ser menor que el actual.', 'error')
    const lista = registrarAhorro(usuarioId, { recId: rec.id, nombre: rec.nombre, antes: rec.importe, despues: n, periodoMeses: rec.periodoMeses })
    await onActualizar(rec.id, { importe: n })
    const ahorro = lista.find((a) => a.recId === rec.id)?.ahorroAnual ?? 0
    toast(`¡Bien hecho! Ahorras ${formatearEuros(ahorro)} al año con ${rec.nombre}`)
    onAhorro(lista)
    onCerrar()
  }

  return createPortal(
    <div className="tb-sheet-back" onClick={onCerrar}>
      <div className="tb-sheet pa-hoja" role="dialog" aria-label={`Ahorrar en ${rec.nombre}`} onClick={(e) => e.stopPropagation()}>
        <div className="tb-sheet-tirador" aria-hidden="true" />
        <div className="tb-sheet-cab">
          <div>
            <span className="tb-sheet-nombre">{rec.nombre}</span>
            <span className="tb-sheet-cat">{palanca.titulo} · {formatearEuros(Math.round(item.costeAnual))} al año</span>
          </div>
        </div>

        {palanca.negociable ? (
          <p className="pa-estimacion">
            Podrías ahorrar{' '}
            <strong>
              {ahorroMin === ahorroMax ? formatearEuros(ahorroMax) : `${formatearEuros(ahorroMin)} – ${formatearEuros(ahorroMax)}`}
            </strong>{' '}
            al año <span>(orientativo)</span>
          </p>
        ) : (
          <p className="pa-estimacion">
            Precio fijo: no se negocia. Si la pausas, ahorras <strong>{formatearEuros(Math.round(item.costeAnual))}</strong> al año.
          </p>
        )}

        {momento && <p className={`pa-momento ${momento.urgente ? 'urgente' : ''}`}><Icono nombre="calendario" tam={16} /> {momento.texto}</p>}

        <ol className="pa-pasos">
          {palanca.pasos.map((p, i) => (
            <li key={i} className={hechos.has(i) ? 'hecho' : ''}>
              <button
                type="button"
                aria-pressed={hechos.has(i)}
                onClick={() =>
                  setHechos((s) => {
                    const n = new Set(s)
                    if (n.has(i)) n.delete(i)
                    else n.add(i)
                    return n
                  })
                }
              >
                <span className="pa-check" aria-hidden="true">{hechos.has(i) && <Icono nombre="check" tam={12} />}</span>
                {p}
              </button>
            </li>
          ))}
        </ol>

        {palanca.enlace && (
          <a className="pa-enlace" href={palanca.enlace.url} target="_blank" rel="noopener noreferrer">
            {palanca.enlace.texto} <Icono nombre="chevron" tam={14} />
          </a>
        )}

        {guion && (
          <div className="pa-guion">
            <div className="pa-guion-cab">
              <span>Qué decir al llamar</span>
              <button type="button" className="link" onClick={copiar}>Copiar</button>
            </div>
            <p>{guion}</p>
          </div>
        )}

        <div className="pa-acciones">
          <button
            type="button"
            className="pa-fulcro"
            onClick={() => {
              onCerrar()
              preguntarAFulcro(
                palanca.negociable
                  ? `Ayúdame a preparar la llamada para bajar el precio de ${rec.nombre} (pago ${formatearEuros(Number(rec.importe))}). ¿Qué argumentos uso y qué hago si me dicen que no?`
                  : `¿Me compensa seguir pagando ${rec.nombre}? ¿Cómo puedo gastar menos en suscripciones como esta?`,
              )
            }}
          >
            <Icono nombre="consultor" tam={16} /> Prepararlo con Fulcro
          </button>
        </div>

        {palanca.negociable && (
          <div className="pa-conseguido">
            <span>¿Lo has conseguido? Nuevo precio</span>
            <div className="pa-conseguido-fila">
              <InputImporte value={nuevo} onValueChange={setNuevo} placeholder={String(rec.importe).replace('.', ',')} aria-label="Nuevo precio" />
              <button type="button" className="tb-form-guardar" disabled={!(Number(nuevo) > 0)} onClick={guardarNuevoPrecio}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default function PlanAhorro({ usuarioId, recurrentes, onActualizar }) {
  const plan = useMemo(() => planDeAhorro(recurrentes), [recurrentes])
  const [ahorros, setAhorros] = useState(() => leerAhorros(usuarioId))
  const [abierto, setAbierto] = useState(null)
  const [verTodo, setVerTodo] = useState(false)
  const ahorrado = totalAhorrado(ahorros)

  if (plan.items.length === 0 && ahorrado === 0) return null

  const negociables = plan.items.filter((i) => i.palanca.negociable)
  const digitales = plan.items.filter((i) => i.tipo === 'digital')
  const visibles = verTodo ? negociables : negociables.slice(0, 3)

  return (
    <section className="pa fade-in-up" aria-label="Tu plan de ahorro">
      <header className="pa-cab">
        <span className="pa-etiqueta">Tu plan de ahorro</span>
        {plan.negociable.n > 0 ? (
          <h2 className="pa-titulo">
            Podrías ahorrar <strong>{formatearEuros(plan.negociable.min)} – {formatearEuros(plan.negociable.max)}</strong> al año
          </h2>
        ) : (
          <h2 className="pa-titulo">Tus recibos, revisados</h2>
        )}
        <p className="pa-sub">
          {plan.negociable.n > 0
            ? `Negociando ${plan.negociable.n === 1 ? '1 recibo' : `${plan.negociable.n} recibos`}. Te decimos cuándo y qué decir.`
            : 'No vemos recibos negociables ahora mismo.'}
        </p>
        {ahorrado > 0 && (
          <p className="pa-logrado">
            <Icono nombre="check" tam={14} /> Ya ahorras <strong>{formatearEuros(ahorrado)} al año</strong> gracias a lo que has negociado
          </p>
        )}
      </header>

      {visibles.length > 0 && (
        <ul className="pa-lista">
          {visibles.map((item) => {
            const logrado = ahorros.find((a) => a.recId === item.rec.id)
            return (
              <li key={item.rec.id}>
                <button type="button" className="pa-item" onClick={() => setAbierto(item)}>
                  <span className="pa-item-texto">
                    <span className="pa-item-nombre">{item.rec.nombre}</span>
                    <span className={`pa-item-momento ${item.momento?.urgente ? 'urgente' : ''}`}>
                      {logrado ? `Negociado: −${formatearEuros(logrado.ahorroAnual)} al año` : item.momento?.texto}
                    </span>
                  </span>
                  <span className="pa-item-ahorro">
                    {logrado ? <Icono nombre="check" tam={16} /> : `hasta ${formatearEuros(item.ahorroMax)}`}
                  </span>
                  <Icono nombre="chevron" tam={16} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {negociables.length > 3 && (
        <button type="button" className="link pa-ver" onClick={() => setVerTodo((v) => !v)}>
          {verTodo ? 'Ver menos' : `Ver los ${negociables.length}`}
        </button>
      )}

      {digitales.length > 0 && (
        <button type="button" className="pa-digital" onClick={() => setAbierto(digitales[0])}>
          <span>
            <strong>{digitales.length === 1 ? '1 suscripción digital' : `${digitales.length} suscripciones digitales`}</strong>:{' '}
            {formatearEuros(plan.digital.costeAnual)} al año. No se negocian, pero puedes pausarlas o rotarlas.
          </span>
          <Icono nombre="chevron" tam={16} />
        </button>
      )}

      {abierto && (
        <HojaNegociar
          item={abierto}
          usuarioId={usuarioId}
          onCerrar={() => setAbierto(null)}
          onActualizar={onActualizar}
          onAhorro={setAhorros}
        />
      )}
    </section>
  )
}
