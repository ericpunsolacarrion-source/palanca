import { useMemo, useState } from 'react'
import { formatearEuros } from '../lib/categorias'
import { proyectarInteresCompuesto, resumenMensualMedio } from '../lib/movimientosUtils'
import { useCountUp } from '../lib/useCountUp'

const HORIZONTES = [5, 10, 20, 30]
const RENTABILIDAD = 7 // % anual estimado para el escenario invertido

function Cifra({ valor, className }) {
  const animado = useCountUp(valor)
  return <span className={className}>{formatearEuros(animado)}</span>
}

export default function ProyeccionFuturo({ movimientos, onIrARegistro }) {
  const [anios, setAnios] = useState(10)
  const { ahorroMedio, mesesConIngresos } = useMemo(
    () => resumenMensualMedio(movimientos),
    [movimientos],
  )

  // Aún no hay base fiable: invitamos a registrar para desbloquear.
  if (mesesConIngresos === 0 || ahorroMedio <= 0) {
    return (
      <div className="proyeccion proyeccion-vacia fade-in-up">
        <span className="proyeccion-titulo">Tu futuro con Palanca</span>
        <p className="ayuda">
          Registra tus ingresos y gastos de este mes y verás aquí a dónde te lleva tu ahorro
          dentro de 10, 20 o 30 años.
        </p>
        {onIrARegistro && (
          <button type="button" className="proyeccion-cta" onClick={onIrARegistro}>
            Registrar movimientos
          </button>
        )}
      </div>
    )
  }

  const parado = proyectarInteresCompuesto({ mensual: ahorroMedio, anios, rentabilidadAnual: 0 })
  const invertido = proyectarInteresCompuesto({ mensual: ahorroMedio, anios, rentabilidadAnual: RENTABILIDAD })
  const extraPorInvertir = invertido.valorFinal - parado.valorFinal
  const pctParado = (parado.valorFinal / invertido.valorFinal) * 100

  return (
    <div className="proyeccion fade-in-up">
      <div className="proyeccion-cabecera">
        <span className="proyeccion-titulo">Tu futuro con Palanca</span>
        <div className="proyeccion-horizontes">
          {HORIZONTES.map((h) => (
            <button
              key={h}
              type="button"
              className={h === anios ? 'activo' : ''}
              onClick={() => setAnios(h)}
            >
              {h}a
            </button>
          ))}
        </div>
      </div>

      <p className="proyeccion-frase">
        Si sigues ahorrando <strong>{formatearEuros(ahorroMedio)}</strong> al mes, en{' '}
        <strong>{anios} años</strong> tendrás:
      </p>

      <div className="proyeccion-escenarios">
        <div className="proyeccion-escenario parado">
          <span className="escenario-etiqueta">Dinero parado</span>
          <Cifra valor={parado.valorFinal} className="escenario-cifra" />
          <span className="escenario-nota">sin invertir, 0% de rentabilidad</span>
        </div>
        <div className="proyeccion-escenario invertido">
          <span className="escenario-etiqueta">Invertido al {RENTABILIDAD}%</span>
          <Cifra valor={invertido.valorFinal} className="escenario-cifra" />
          <span className="escenario-nota">interés compuesto estimado</span>
        </div>
      </div>

      <div className="proyeccion-barra">
        <div className="proyeccion-barra-parado" style={{ width: `${pctParado}%` }} />
        <div className="proyeccion-barra-extra" style={{ width: `${100 - pctParado}%` }} />
      </div>

      <p className="proyeccion-remate">
        Invertir te daría <strong className="destacado-inversion">{formatearEuros(extraPorInvertir)}</strong>{' '}
        extra solo por poner a trabajar el mismo dinero.
      </p>
      <p className="proyeccion-disclaimer">
        Estimación con rentabilidad media del {RENTABILIDAD}%. No es una recomendación de inversión;
        rentabilidades pasadas no garantizan futuras.
      </p>
    </div>
  )
}
