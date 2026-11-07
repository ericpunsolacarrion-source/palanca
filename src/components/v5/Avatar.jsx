import { useEffect, useState } from 'react'
import { alCargarLogos, cargarDibujos, cargarLogos, dibujoDe, iconoConcepto, identidadVisual, logoDe, logosCargados } from '../../lib/marcas'
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

// El dibujo del logo llega aparte (archivo de su inicial); hasta entonces, monograma.
function useDibujo(logo) {
  const [, setVersion] = useState(0)
  const g = logo?.g
  useEffect(() => {
    if (!g || dibujoDe(logo)) return
    let vivo = true
    cargarDibujos(g).then(() => vivo && setVersion((v) => v + 1))
    return () => {
      vivo = false
    }
  }, [g]) // eslint-disable-line react-hooks/exhaustive-deps
  return dibujoDe(logo)
}

// Logo de comercio/servicio (v5):
//  1. logo oficial de la marca (lib/logos/), centrado en su color;
//  2. si la marca aún no tiene logo libre, su color y su monograma;
//  3. si no es una marca, un tono estable y la inicial.
// Los movimientos propios del motor (inversión, traspaso, ajuste) llevan su icono.
// `siNoHayMarca`: lo que se pinta si el nombre no es una marca reconocida (p. ej.
// el icono de siempre en un campo de texto); sin él, monograma.
export default function Avatar({ nombre, movimiento, tam = 36, siNoHayMarca }) {
  const logos = useLogos()
  // Inversión: si la plataforma (cuenta del movimiento o el nombre) es una marca
  // reconocida, lleva su logo (Trade Republic, MyInvestor…); si no, el icono
  // dorado de inversión. Traspasos y ajustes, siempre su icono.
  const inversion = movimiento && esInversion(movimiento)
  const logoInversion = inversion && logos ? logoDe(movimiento.fuente?.nombre || nombre, logos) : null
  const propio = movimiento && ((inversion && !logoInversion) || esTraspaso(movimiento) || esAjuste(movimiento))
  const logo = logos && !propio ? logoInversion ?? logoDe(nombre, logos) : null
  const dibujo = useDibujo(logo)
  const estilo = { width: tam, height: tam, borderRadius: Math.round(tam * 0.28) }
  if (propio) {
    const clase = esInversion(movimiento) ? 'inversion' : 'neutro'
    const icono = esInversion(movimiento) ? 'inversion' : esAjuste(movimiento) ? 'check' : 'repetir'
    return (
      <span className={`v5-avatar ${clase}`} style={estilo} aria-hidden="true">
        <Icono nombre={icono} tam={Math.round(tam * 0.5)} />
      </span>
    )
  }

  // Icono real de la app (recortado de capturas, public/logos/apps/): el más fiel.
  if (logo?.img) {
    return (
      <img
        className="v5-avatar marca v5-avatar-img"
        src={`/logos/apps/${logo.k}.webp`}
        width={tam}
        height={tam}
        style={estilo}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        data-logo={logo.k}
      />
    )
  }
  if (logo && !logo.pendiente && dibujo) {
    const g = Math.round(tam * logo.e)
    return (
      <span className="v5-avatar marca" style={{ ...estilo, background: logo.bg, color: logo.fg }} aria-hidden="true" data-logo={logo.k}>
        {dibujo.d ? (
          <svg width={g} height={g} viewBox={dibujo.vb} fill="currentColor">
            <path d={dibujo.d} />
          </svg>
        ) : (
          <svg width={g} height={g} viewBox={dibujo.vb} dangerouslySetInnerHTML={{ __html: dibujo.body }} />
        )}
      </span>
    )
  }
  if (logo && logo.pendiente) {
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

  // Sin marca, pero con un concepto reconocible (alquiler, paga extra…): su icono.
  const concepto = !logo ? iconoConcepto(nombre) : null
  if (concepto) {
    return (
      <span className={`v5-avatar concepto ${concepto}`} style={estilo} aria-hidden="true">
        <Icono nombre={concepto} tam={Math.round(tam * 0.5)} />
      </span>
    )
  }
  if (siNoHayMarca !== undefined && !logo) return siNoHayMarca
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
