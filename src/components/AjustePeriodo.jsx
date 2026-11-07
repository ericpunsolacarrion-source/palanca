import { useEffect, useMemo, useState } from 'react'
import { formatearEuros } from '../lib/categorias'
import { etiquetaMes } from '../lib/movimientosUtils'
import { rangoPeriodo, sumarMeses, periodoActual } from '../lib/periodo'
import { vistaPreviaPeriodos } from '../lib/periodoVista'
import { toast } from '../lib/toast'
import { diaInicioDesdeCobro } from '../lib/diaCobro'

const DIAS = Array.from({ length: 28 }, (_, i) => i + 1)
const corto = (iso) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00`))

// «Mi mes empieza el día…»: ajuste del periodo financiero con vista previa de
// los últimos periodos ANTES de guardar. Solo cambia cómo se agrupan los
// movimientos; ninguna fecha, importe ni movimiento se modifica.
export default function AjustePeriodo({ movimientos = [], diaActual = 1, auto = false, cobroDeclarado = null, deteccion = null, onGuardar }) {
  const [dia, setDia] = useState(diaActual)
  const [guardando, setGuardando] = useState(false)
  useEffect(() => setDia(diaActual), [diaActual])
  // Día que propone el motor: el detectado con la nómina real o, sin datos
  // suficientes, el que sale del día de cobro declarado en el alta.
  const sugerido = deteccion?.diaInicio ?? (cobroDeclarado ? diaInicioDesdeCobro(cobroDeclarado) : null)
  const cambiado = dia !== diaActual
  const antes = useMemo(() => vistaPreviaPeriodos(movimientos, diaActual), [movimientos, diaActual])
  const despues = useMemo(() => vistaPreviaPeriodos(movimientos, dia), [movimientos, dia])
  const ejemplo = useMemo(() => {
    const c = periodoActual(new Date(), dia)
    const { desde, hasta } = rangoPeriodo(c, dia)
    return { nombre: etiquetaMes(c, { month: 'long' }).toLowerCase(), desde: corto(desde), hasta: corto(hasta), sig: etiquetaMes(sumarMeses(c, 1), { month: 'long' }).toLowerCase() }
  }, [dia])

  async function guardar() {
    setGuardando(true)
    // Elegirlo a mano apaga el ajuste automático (se respeta la elección).
    const bien = await onGuardar({ dia, auto: false })
    setGuardando(false)
    toast(bien ? 'Listo: tu calendario financiero se ha actualizado.' : 'No se ha podido guardar. Inténtalo de nuevo.')
  }

  async function cambiarAuto(valor) {
    setGuardando(true)
    const bien = await onGuardar(valor && sugerido ? { auto: true, dia: sugerido } : { auto: valor })
    setGuardando(false)
    if (!bien) toast('No se ha podido guardar. Inténtalo de nuevo.')
    else if (valor) toast(sugerido ? `Automático: tu mes empieza el día ${sugerido}, y se ajustará solo si tu nómina cambia de día.` : 'Automático: cuando Palanca vea tu nómina en tus movimientos, ajustará tu mes sola.')
  }

  const textoNomina = deteccion
    ? `Según tus movimientos, tu nómina llega el día ${deteccion.diaHabitual}${deteccion.diaMasTemprano !== deteccion.diaHabitual ? ` y a veces se adelanta al ${deteccion.diaMasTemprano}` : ''} (${deteccion.meses} meses).`
    : cobroDeclarado
      ? `Nos dijiste que cobras el día ${cobroDeclarado}. Cuando apuntes o importes tus extractos, Palanca detectará el día exacto y si a veces se adelanta.`
      : 'Cuando Palanca vea tu nómina en tus movimientos o extractos, te dirá qué día llega.'

  return (
    <div className="cuenta-datos ajuste-periodo">
      <span className="cuenta-seccion">Tu mes financiero</span>
      <p className="ayuda-mini">Si cobras a final de mes, haz que tu mes empiece el día que cobras: la nómina y lo que pagas con ella cuentan juntos.</p>
      <p className="ajuste-periodo-nomina" data-testid="periodo-nomina">{textoNomina}</p>
      <label className="cuenta-interruptor">
        <input type="checkbox" checked={auto} onChange={(e) => cambiarAuto(e.target.checked)} disabled={guardando} aria-label="Ajustar mi mes según mi nómina" />
        <span>
          <strong>Ajustar mi mes según mi nómina</strong>
          <span className="ayuda-mini">Palanca mira cuándo llega tu nómina y hace que tu mes empiece el día más temprano en que ha llegado (si cobras el 28 y a veces llega el 27, empieza el 27). Así no tienes que pensar en ello.</span>
        </span>
      </label>
      {!auto && sugerido && sugerido !== diaActual && dia !== sugerido && (
        <button type="button" className="cuenta-boton ajuste-periodo-sugerencia" onClick={() => setDia(sugerido)}>
          Ver cómo quedaría empezando el día {sugerido}
        </button>
      )}
      <label className="ajuste-periodo-fila" htmlFor="ajuste-periodo-dia">
        <span>Mi mes empieza el día</span>
        <select id="ajuste-periodo-dia" value={dia} onChange={(e) => setDia(Number(e.target.value))}>
          {DIAS.map((d) => (
            <option key={d} value={d}>
              {d}
              {d === 1 ? ' (mes natural)' : ''}
            </option>
          ))}
        </select>
      </label>
      <p className="ayuda-mini" data-testid="periodo-ejemplo">
        {dia === 1
          ? 'Cada mes va del día 1 al último día del mes (como hasta ahora).'
          : `Ejemplo: del ${ejemplo.desde} al ${ejemplo.hasta} cuenta como ${ejemplo.nombre}. Desde el ${dia}, empieza ${ejemplo.sig}.`}
      </p>

      {cambiado && (
        <div className="ajuste-periodo-vista" aria-live="polite">
          <span className="ajuste-periodo-titulo">Así quedarían tus últimos periodos</span>
          <table className="ajuste-periodo-tabla">
            <thead>
              <tr>
                <th scope="col">Periodo</th>
                <th scope="col">Entra</th>
                <th scope="col">Sale</th>
                <th scope="col">Ahorro</th>
              </tr>
            </thead>
            <tbody>
              {despues.map((p, i) => (
                <tr key={p.clave}>
                  <th scope="row">
                    {etiquetaMes(p.clave, { month: 'long' })}
                    <span className="ayuda-mini">{p.rango}</span>
                    <span className="ayuda-mini">{p.n} mov.</span>
                  </th>
                  <td className="num">{formatearEuros(p.ingresos)}</td>
                  <td className="num">{formatearEuros(p.gastos)}</td>
                  <td className="num">
                    {formatearEuros(p.ahorro)}
                    {antes[i] && antes[i].clave === p.clave && Math.round(antes[i].ahorro * 100) !== Math.round(p.ahorro * 100) && (
                      <span className="ayuda-mini" title="Ahorro de ese mes con tu ajuste actual">antes {formatearEuros(antes[i].ahorro)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ayuda-mini">
            Al guardar, todas las pantallas (también los meses pasados) usarán este calendario. Solo cambia en qué mes se cuenta cada movimiento: las fechas reales, los importes, el número de movimientos y tu patrimonio no cambian. Puedes volver al día 1 cuando quieras.
          </p>
        </div>
      )}
      <button type="button" className="cuenta-boton cuenta-guardar" onClick={guardar} disabled={!cambiado || guardando}>
        {guardando ? 'Guardando…' : 'Guardar mi mes'}
      </button>
    </div>
  )
}
