import { identidadVisual } from '../../lib/marcas'
import { esAjuste, esInversion, esTraspaso } from '../../lib/categorias'
import Icono from '../Icono'

// Logo de comercio/servicio (v5): color y monograma de la marca, o un tono
// estable para los que no son marca. Los movimientos propios del motor
// (inversión, traspaso, ajuste) llevan su icono en vez de un comercio.
export default function Avatar({ nombre, movimiento, tam = 36 }) {
  const estilo = { width: tam, height: tam, fontSize: Math.round(tam * 0.4), borderRadius: Math.round(tam * 0.3) }
  if (movimiento && (esInversion(movimiento) || esTraspaso(movimiento) || esAjuste(movimiento))) {
    const clase = esInversion(movimiento) ? 'inversion' : 'neutro'
    const icono = esInversion(movimiento) ? 'inversion' : esAjuste(movimiento) ? 'check' : 'repetir'
    return (
      <span className={`v5-avatar ${clase}`} style={estilo} aria-hidden="true">
        <Icono nombre={icono} tam={Math.round(tam * 0.5)} />
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
      {id.monograma || <AppleLike tam={tam} />}
    </span>
  )
}

// Marca sin monograma (p. ej. Apple): un punto sobrio en lugar del logo.
function AppleLike({ tam }) {
  return <span style={{ width: tam * 0.3, height: tam * 0.3, borderRadius: '50%', background: 'currentColor', display: 'block' }} />
}
