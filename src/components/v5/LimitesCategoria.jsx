import { useMemo, useState } from 'react'
import { etiquetaCategoria, formatearEuros } from '../../lib/categorias'
import { filasPorCategoria } from '../../lib/presupuesto'
import { usePresupuestoCompartido } from '../../lib/DatosCompartidos'
import { preguntarAFulcro } from '../../lib/fulcro'
import { toast } from '../../lib/toast'
import { aCentimos } from '../../lib/importe'
import InputImporte from '../InputImporte'
import Icono from '../Icono'

// PRESUPUESTO · POR CATEGORÍA (v5): de «cuánto suelo gastar» a algo accionable.
// Tres valores que nunca se mezclan, cada uno con su forma:
//   Gastado  → la barra (lo de este mes)
//   Tu límite → raya menta + columna «Límite» (lo fija el usuario)
//   Media    → raya blanca fina + columna «Media/mes» (lo que sueles gastar)
// Los límites no tocan el presupuesto general ni los movimientos.

const COLORES = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)']

export default function LimitesCategoria({ historico, clave, presupuestoGasto }) {
  const { limitesCategoria = {}, modoLimites, guardarLimitesCategoria } = usePresupuestoCompartido()
  const filas = useMemo(() => filasPorCategoria(historico, clave, limitesCategoria), [historico, clave, limitesCategoria])
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [todas, setTodas] = useState(false)

  const conLimite = filas.filter((f) => f.limite != null)
  const sumaLimites = conLimite.reduce((s, f) => s + aCentimos(f.limite), 0) / 100
  const pasadas = conLimite.filter((f) => f.estado === 'pasado')
  const lista = todas || editando ? filas : filas.slice(0, 8)

  function abrir() {
    setBorrador(Object.fromEntries(filas.map((f) => [f.nombre, f.limite])))
    setEditando(true)
  }

  async function guardar(e) {
    e.preventDefault()
    if (!guardarLimitesCategoria) return
    const cambios = filas.filter((f) => {
      const nuevo = borrador[f.nombre] == null || borrador[f.nombre] === '' ? null : Number(borrador[f.nombre])
      return (nuevo == null ? null : aCentimos(nuevo)) !== (f.limite == null ? null : aCentimos(f.limite))
    })
    if (cambios.some((f) => !f.categoriaId)) {
      toast('No se ha podido identificar alguna categoría', 'error')
      return
    }
    setGuardando(true)
    const ok = cambios.length === 0 || (await guardarLimitesCategoria(cambios.map((f) => ({ categoriaId: f.categoriaId, nombre: f.nombre, importe: borrador[f.nombre] == null || borrador[f.nombre] === '' ? null : Number(borrador[f.nombre]) })))) !== false
    setGuardando(false)
    if (ok) {
      setEditando(false)
      if (cambios.length) toast(cambios.length === 1 ? 'Límite guardado' : `${cambios.length} límites guardados`)
    } else if (cambios.length) {
      toast('No se han podido guardar todos los límites', 'error')
    }
  }

  return (
    <section className="v5-tarjeta v5-presu-cats v5-limites" aria-label="Por categoría">
      <header className="v5-tarjeta-cab">
        <h2>Por categoría</h2>
        <span className="v5-limites-acciones">
          {!editando && (
            <button type="button" className="v5-enlace" onClick={() => preguntarAFulcro('¿En qué puedo recortar este mes?')}>
              <Icono nombre="consultor" tam={14} /> ¿Dónde recorto?
            </button>
          )}
          {!editando && filas.length > 0 && (
            <button type="button" className="v5-boton" onClick={abrir}>
              <Icono nombre="nota" tam={15} /> {conLimite.length ? 'Editar límites' : 'Poner límites'}
            </button>
          )}
        </span>
      </header>

      {filas.length === 0 ? (
        <p className="v5-nota-vacia">Aún no hay gastos este mes ni meses anteriores con los que comparar.</p>
      ) : (
        <form onSubmit={guardar}>
          <p className="v5-limites-resumen">
            {conLimite.length === 0 ? (
              <span className="v5-tenue">Ponle un límite mensual a las categorías que quieras vigilar. Tu presupuesto general no cambia.</span>
            ) : (
              <>
                <span>
                  <b className="num">{conLimite.length}</b> {conLimite.length === 1 ? 'categoría con límite' : 'categorías con límite'} · suman <b className="num">{formatearEuros(sumaLimites)}</b>
                  {presupuestoGasto > 0 && <span className="v5-tenue"> de tu presupuesto de {formatearEuros(Math.round(presupuestoGasto * 100) / 100)}</span>}
                </span>
                {pasadas.length > 0 ? <span className="v5-insignia critico">Te pasas en {pasadas.length}</span> : <span className="v5-insignia bien">Dentro de tus límites</span>}
              </>
            )}
          </p>
          <div className="v5-limites-cab v5-tenue" aria-hidden="true">
            <span>Categoría</span>
            <span />
            <span>Gastado</span>
            <span>Tu límite</span>
            <span>Media/mes</span>
            <span>Queda</span>
          </div>
          <ul className="v5-limites-lista">
            {lista.map((f, i) => {
              const color = COLORES[i % COLORES.length]
              const escala = Math.max(1, f.gastado, f.limite ?? 0, f.media ?? 0) * 1.08
              const relleno = f.estado === 'pasado' ? 'var(--critico)' : f.estado === 'cerca' ? 'var(--aviso)' : color
              return (
                <li key={f.nombre} className={`v5-limite ${f.estado}`}>
                  <span className="v5-limite-nombre">
                    <i style={{ background: color }} aria-hidden="true" />
                    {etiquetaCategoria(f.nombre)}
                  </span>
                  <span className="v5-limite-barra" role="img" aria-label={`${f.nombre}: gastado ${formatearEuros(f.gastado)}${f.limite != null ? ` de un límite de ${formatearEuros(f.limite)}` : ''}${f.media != null ? `, media ${formatearEuros(Math.round(f.media))}` : ''}`}>
                    <span className="v5-limite-relleno" style={{ width: `${(Math.min(f.gastado, escala) / escala) * 100}%`, background: relleno }} />
                    {f.media > 0 && <span className="v5-limite-media" style={{ left: `${(f.media / escala) * 100}%` }} title="Tu media mensual" />}
                    {f.limite != null && <span className="v5-limite-tope" style={{ left: `${(f.limite / escala) * 100}%` }} title="Tu límite" />}
                  </span>
                  <b className="num v5-limite-gastado">{formatearEuros(f.gastado)}</b>
                  <span className="num v5-limite-limite">
                    {editando ? (
                      <InputImporte
                        value={borrador[f.nombre] ?? null}
                        onValueChange={(v) => setBorrador((b) => ({ ...b, [f.nombre]: v }))}
                        placeholder="Sin límite"
                        aria-label={`Límite mensual para ${f.nombre}`}
                      />
                    ) : f.limite != null ? (
                      formatearEuros(f.limite)
                    ) : (
                      <span className="v5-tenue">—</span>
                    )}
                  </span>
                  <span className="num v5-tenue v5-limite-media-cifra">{f.media == null ? '—' : formatearEuros(Math.round(f.media))}</span>
                  <span className={`num v5-limite-queda ${f.estado}`}>
                    {f.limite == null ? <span className="v5-tenue">Sin límite</span> : f.queda >= 0 ? formatearEuros(f.queda) : `Te pasas ${formatearEuros(Math.abs(f.queda))}`}
                  </span>
                </li>
              )
            })}
          </ul>

          {editando ? (
            <div className="v5-limites-pie">
              <span className="v5-tenue">Deja un campo vacío para quitar su límite.{modoLimites === 'local' && ' Se guardan en este navegador hasta que la base de datos tenga la tabla de límites.'}</span>
              <span className="v5-limites-botones">
                <button type="button" className="v5-boton fantasma" onClick={() => setEditando(false)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="v5-boton primario" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar límites'}
                </button>
              </span>
            </div>
          ) : (
            <div className="v5-limites-pie">
              <span className="v5-tenue v5-limites-leyenda">
                <i className="v5-ley-barra" aria-hidden="true" /> Gastado este mes
                <i className="v5-ley-tope" aria-hidden="true" /> Tu límite
                <i className="v5-ley-media" aria-hidden="true" /> Tu media de un mes entero
              </span>
              {filas.length > 8 && (
                <button type="button" className="v5-enlace" onClick={() => setTodas((v) => !v)}>
                  {todas ? 'Ver menos' : `Ver las ${filas.length}`}
                </button>
              )}
            </div>
          )}
        </form>
      )}
    </section>
  )
}
