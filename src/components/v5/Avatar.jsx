import { useEffect, useState } from 'react'
import { alCargarLogos, cargarLogos, identidadVisual, logoDe, logosCargados } from '../../lib/marcas'
import { esAjuste, esInversion, esTraspaso } from '../../lib/categorias'
import Icono from '../Icono'

// Se pide el paquete de logos una sola vez, al primer avatar que se pinta.
function useLogos() {
  const [, setVersion] = useState(0)
  useEffect(() => {
    if (logosCargados()) return
    const quitar = alCargarLogos(() => setVersion((v) => v + 1))
    cargarLogos()
    return quitar
  }, [])
  return logosCargados()
}

// Logo de comercio/servicio (v5):
//  1. logo oficial de la marca (lib/logosMarcas.js), centrado en su color;
//  2. si la marca aún no tiene logo libre, su color y su monograma;
//  3. si no es una marca, un tono estable y la inicial.
// Los movimientos propios del motor (inversión, traspaso, ajuste) llevan su icono.
export default function Avatar({ nombre, movimiento, tam = 36 }) {
  const logos = useLogos()
  const estilo = { width: tam, height: tam, borderRadius: Math.round(tam * 0.28) }
  if (movimiento && (esInversion(movimiento) || esTraspaso(movimiento) || esAjuste(movimiento))) {
    const clase = esInversion(movimiento) ? 'inversion' : 'neutro'
    const icono = esInversion(movimiento) ? 'inversion' : esAjuste(movimiento) ? 'check' : 'repetir'
    return (
      <span className={`v5-avatar ${clase}`} style={estilo} aria-hidden="true">
        <Icono nombre={icono} tam={Math.round(tam * 0.5)} />
      </span>
    )
  }

  const logo = logos ? logoDe(nombre, logos) : null
  if (logo && !logo.pendiente) {
    const g = Math.round(tam * logo.e)
    return (
      <span className="v5-avatar marca" style={{ ...estilo, background: logo.bg, color: logo.fg }} aria-hidden="true" data-logo={logo.k}>
        {logo.d ? (
          <svg width={g} height={g} viewBox={logo.vb} fill="currentColor">
            <path d={logo.d} />
          </svg>
        ) : (
          <svg width={g} height={g} viewBox={logo.vb} dangerouslySetInnerHTML={{ __html: logo.body }} />
        )}
      </span>
    )
  }
  if (logo) {
    const largo = logo.mono.length
    return (
      <span
        className="v5-avatar marca"
        style={{ ...estilo, background: logo.bg, color: logo.fg, fontSize: Math.round(tam * (largo > 2 ? 0.27 : largo > 1 ? 0.34 : 0.44)) }}
        aria-hidden="true"
        data-logo={logo.k}
      >
        {logo.mono}
      </span>
    )
  }

  const id = identidadVisual(nombre)
  const largo = id.monograma.length
  return (
    <span
      className={`v5-avatar ${id.marca ? 'marca' : ''}`}
      style={{ ...estilo, background: id.fondo, color: id.texto, fontSize: Math.round(tam * (largo > 2 ? 0.28 : largo > 1 ? 0.34 : 0.42)) }}
      aria-hidden="true"
    >
      {id.monograma || '·'}
    </span>
  )
}
