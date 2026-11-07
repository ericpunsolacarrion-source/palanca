import { useMemo, useState } from 'react'
import { formatearEuros } from '../../lib/categorias'
import { bolsas, etiquetaMes, formatearPorcentaje, hoyIso, ultimaReconciliacion } from '../../lib/movimientosUtils'
import { cambioPatrimonioMes, evolucionPatrimonio } from '../../lib/inicio'
import { aportadoPorPlataforma, cambioDesde, recortarInicio } from '../../lib/patrimonio'
import { useSaldo } from '../../lib/useSaldo'
import { AjusteSaldo } from '../Patrimonio'
import Inversiones from '../Inversiones'
import Icono from '../Icono'
import Avatar from './Avatar'
import { GraficoArea } from './Graficos'

// PATRIMONIO v5: dónde estás y cómo has llegado.
//  - Cifras: patrimonio neto, disponible, invertido (aportado) y el mes.
//  - Evolución mes a mes (cierres; el último, a hoy).
//  - Composición: liquidez y cada plataforma, sobre el total.
//  - Comparado con hace 1, 6 y 12 meses.
//  - Aportar / retirar y su historial (pantalla Inversión de siempre).
// Datos reales y estimaciones se distinguen siempre: la liquidez es una
// estimación hasta que la cuadras con el banco; lo invertido es lo aportado,
// no su valor de mercado (Palanca no conoce cotizaciones).

const COLORES_PLATAFORMA = ['#e2b85c', '#c99a3a', '#ecc97c', '#a77c2c', '#f1d79c']

export default function PatrimonioV5({ usuarioId, movimientos, cargando, onGuardado, soloLectura = false }) {
  const [meses, setMeses] = useState(12)
  const [ajustando, setAjustando] = useState(false)
  // En el ordenador la evolución ocupa el alto de las dos tarjetas de al lado.
  const grande = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches
  const { ultimaReconciliacion: ultimaMeta } = useSaldo(usuarioId)
  const b = useMemo(() => bolsas(movimientos, hoyIso()), [movimientos])
  const cambioMes = useMemo(() => cambioPatrimonioMes(movimientos), [movimientos])
  const serie24 = useMemo(() => evolucionPatrimonio(movimientos, 25), [movimientos])
  const serie = recortarInicio(serie24.slice(-meses)).map((p) => ({
    etiqueta: etiquetaMes(p.mes, { month: 'short' }).replace('.', ''),
    etiquetaLarga: etiquetaMes(p.mes),
    valor: p.valor,
  }))
  const plataformas = useMemo(() => aportadoPorPlataforma(movimientos), [movimientos])
  const ultima = [ultimaMeta, ultimaReconciliacion(movimientos)].filter(Boolean).sort().pop() ?? null
  const dias = ultima ? Math.floor((Date.now() - new Date(ultima).getTime()) / 86400000) : null
  const comparativas = [
    { k: 1, etiqueta: 'Hace 1 mes' },
    { k: 6, etiqueta: 'Hace 6 meses' },
    { k: 12, etiqueta: 'Hace 12 meses' },
    { k: 24, etiqueta: 'Hace 2 años' },
  ].map((c) => ({ ...c, cambio: cambioDesde(serie24, c.k) }))

  // Composición sobre el patrimonio (solo partes positivas: un descubierto no
  // es «una parte» del total; se avisa aparte).
  const partes = [
    { nombre: 'Disponible', valor: Math.max(0, b.bolsaLiquidez), color: 'var(--accent)', liquidez: true },
    ...plataformas.map(([nombre, valor], i) => ({ nombre, valor, color: COLORES_PLATAFORMA[i % COLORES_PLATAFORMA.length] })),
  ].filter((p) => p.valor > 0)
  const base = partes.reduce((s, p) => s + p.valor, 0)
  const conDatos = serie.filter((p) => p.valor !== 0).length >= 2

  return (
    <div className="vista v5-patrimonio">
      <div className="v5-kpi-fila">
        <div className="v5-kpi destacado">
          <span className="v5-etq">Patrimonio neto</span>
          <b className={`num ${b.patrimonio < 0 ? 'v5-negativo' : ''}`}>{formatearEuros(b.patrimonio)}</b>
          <small className="v5-tenue">Disponible + invertido, a hoy</small>
        </div>
        <div className="v5-kpi">
          <span className="v5-etq"><i className="v5-punto" style={{ background: 'var(--accent)' }} />Disponible</span>
          <b className={`num ${b.bolsaLiquidez < 0 ? 'v5-negativo' : ''}`}>{formatearEuros(b.bolsaLiquidez)}</b>
          <small className={!ultima || dias > 45 ? 'v5-aviso-texto' : 'v5-tenue'}>
            {!ultima ? 'Estimación: sin cuadrar con tu banco' : dias > 45 ? `Estimación: cuadrado hace ${dias} días` : `Cuadrado ${dias === 0 ? 'hoy' : `hace ${dias} día${dias === 1 ? '' : 's'}`}`}
            {!soloLectura && (
              <button type="button" className="v5-enlace" onClick={() => setAjustando(true)}>
                Ajustar
              </button>
            )}
          </small>
        </div>
        <div className="v5-kpi">
          <span className="v5-etq"><i className="v5-punto" style={{ background: 'var(--inversion)' }} />Invertido</span>
          <b className="num v5-oro">{formatearEuros(b.bolsaInversion)}</b>
          <small className="v5-tenue">Lo aportado, no su valor de mercado</small>
        </div>
        <div className="v5-kpi">
          <span className="v5-etq">Este mes</span>
          <b className={`num ${cambioMes > 0 ? 'v5-positivo' : cambioMes < 0 ? 'v5-negativo' : ''}`}>
            {cambioMes > 0 ? '+' : cambioMes < 0 ? '−' : ''}
            {formatearEuros(Math.abs(cambioMes))}
          </b>
          <small className="v5-tenue">Sin contar ajustes de saldo</small>
        </div>
      </div>

      <div className="v5-pat-rejilla">
        <section className="v5-tarjeta v5-pat-evolucion" aria-label="Evolución del patrimonio">
          <header className="v5-tarjeta-cab">
            <h2>Evolución</h2>
            <div className="v5-seg" role="group" aria-label="Periodo">
              {[6, 12, 24].map((n) => (
                <button key={n} type="button" className={meses === n ? 'activo' : ''} aria-pressed={meses === n} onClick={() => setMeses(n)}>
                  {n === 24 ? '2 años' : `${n} meses`}
                </button>
              ))}
            </div>
          </header>
          {conDatos ? (
            <GraficoArea serie={serie} alto={grande ? 'auto' : 240} titulo={`Patrimonio al cierre de cada mes, últimos ${meses} meses`} />
          ) : (
            <p className="v5-nota-vacia">La evolución aparece en cuanto tengas dos meses con datos.</p>
          )}
          <p className="v5-tenue v5-pie-nota">Cada punto es tu patrimonio al cierre del mes; el último, a hoy.</p>
        </section>

        <section className="v5-tarjeta v5-pat-composicion" aria-label="Composición">
          <header className="v5-tarjeta-cab">
            <h2>Composición</h2>
          </header>
          {base > 0 ? (
            <>
              <div className="v5-reparto grande" aria-hidden="true">
                {partes.map((p) => (
                  <span key={p.nombre} style={{ flexGrow: p.valor, background: p.color }} />
                ))}
              </div>
              <ul className="v5-lista">
                {partes.map((p) => (
                  <li key={p.nombre} className="v5-fila">
                    {p.liquidez ? (
                      <span className="v5-avatar" style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-suave)', color: 'var(--accent)' }} aria-hidden="true">
                        <Icono nombre="monedas" tam={16} />
                      </span>
                    ) : (
                      <Avatar nombre={p.nombre} tam={32} />
                    )}
                    <span className="v5-fila-texto">
                      <b>{p.nombre}</b>
                      <small>{p.liquidez ? 'Cuentas y efectivo' : 'Aportado'}</small>
                    </span>
                    <span className="v5-fila-dcha">
                      <b className="num">{formatearEuros(p.valor)}</b>
                      <small className="v5-tenue num">{formatearPorcentaje((p.valor / base) * 100, 0)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="v5-nota-vacia">Aún no hay patrimonio que repartir.</p>
          )}
          {b.bolsaLiquidez < 0 && <p className="v5-aviso-texto v5-pie-nota">Tu disponible está en negativo: revisa el saldo con tu banco.</p>}
        </section>

        <section className="v5-tarjeta v5-pat-comparativa" aria-label="Comparado con antes">
          <header className="v5-tarjeta-cab">
            <h2>Comparado con antes</h2>
          </header>
          <ul className="v5-comparativas">
            {comparativas.map((c) => (
              <li key={c.k}>
                <span className="v5-etq">{c.etiqueta}</span>
                {c.cambio ? (
                  <span className="v5-comp-valor">
                    <b className={`num ${c.cambio.valor > 0 ? 'v5-positivo' : c.cambio.valor < 0 ? 'v5-negativo' : ''}`}>
                      {c.cambio.valor > 0 ? '+' : c.cambio.valor < 0 ? '−' : ''}
                      {formatearEuros(Math.abs(c.cambio.valor))}
                    </b>
                    {c.cambio.pct != null && <small className="v5-tenue num">{c.cambio.pct >= 0 ? '+' : '−'}{formatearPorcentaje(Math.abs(c.cambio.pct), 1)}</small>}
                  </span>
                ) : (
                  <span className="v5-tenue">Sin datos</span>
                )}
              </li>
            ))}
          </ul>
          <p className="v5-tenue v5-pie-nota">Incluye los ajustes de saldo que hayas hecho en ese tiempo.</p>
        </section>
      </div>

      <h2 className="v5-seccion-titulo">Inversión</h2>
      <Inversiones usuarioId={usuarioId} movimientos={movimientos} cargando={cargando} onGuardado={onGuardado} />

      {ajustando && <AjusteSaldo usuarioId={usuarioId} bolsaLiquidez={b.bolsaLiquidez} onCerrar={() => setAjustando(false)} onGuardado={onGuardado} />}
    </div>
  )
}
