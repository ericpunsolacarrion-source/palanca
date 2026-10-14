import { useEffect, useState } from 'react'
import { usePresupuestoCompartido, useObjetivosCompartidos } from '../lib/DatosCompartidos'
import { ICONO_FAMILIA, detectarNuevoHito, marcarHitoVisto } from '../lib/hitos'
import Icono from './Icono'

// Detecta hitos recién alcanzados y muestra una celebración elegante.
// El hito se marca como visto al cerrar (no al detectar), para que sea estable.
export default function Hitos({ usuarioId, movimientos, movimientosMes }) {
  const { objetivoInversionMensual, cargando } = usePresupuestoCompartido()
  const { objetivos, cargando: cargandoObj } = useObjetivosCompartidos()
  const [hito, setHito] = useState(null)

  useEffect(() => {
    if (cargando || cargandoObj || hito) return
    const nuevo = detectarNuevoHito(usuarioId, {
      movimientos,
      movimientosMes,
      objetivoInversion: objetivoInversionMensual ?? 0,
      objetivos,
    })
    if (nuevo) setHito(nuevo)
  }, [usuarioId, movimientos, movimientosMes, objetivoInversionMensual, objetivos, cargando, cargandoObj, hito])

  if (!hito) return null

  function cerrar() {
    marcarHitoVisto(usuarioId, hito.id)
    setHito(null)
  }

  return (
    <div className="celebracion-fondo" role="dialog" aria-modal="true" onClick={cerrar}>
      <div className="celebracion-caja" onClick={(e) => e.stopPropagation()}>
        <span className="celebracion-halo" aria-hidden="true" />
        <span className="celebracion-icono">
          <Icono nombre={ICONO_FAMILIA[hito.categoria] ?? 'check'} tam={30} />
        </span>
        <span className="celebracion-badge">Logro desbloqueado</span>
        <h3 className="celebracion-titulo">{hito.titulo}</h3>
        <p className="celebracion-mensaje">{hito.mensaje}</p>
        <button type="button" className="celebracion-cerrar" onClick={cerrar}>
          Seguir
        </button>
      </div>
    </div>
  )
}
