import { useMemo, useState } from 'react'
import { formatearEuros } from '../../lib/categorias'

function construirSerie(objetivo, aportacionMensual, meses) {
  const puntos = []
  const pasos = Math.min(meses, 60) // hasta 5 años en detalle mensual, luego se agrupa
  const agruparPorAnio = meses > 24

  if (agruparPorAnio) {
    const anios = Math.ceil(meses / 12)
    for (let a = 1; a <= anios; a += 1) {
      const acumulado = Math.min(aportacionMensual * Math.min(a * 12, meses), objetivo)
      puntos.push({ etiqueta: `Año ${a}`, valor: acumulado })
    }
  } else {
    for (let m = 1; m <= pasos; m += 1) {
      const acumulado = Math.min(aportacionMensual * m, objetivo)
      puntos.push({ etiqueta: `M${m}`, valor: acumulado })
    }
  }

  return puntos
}

function GraficoProgreso({ serie, objetivo }) {
  if (serie.length === 0) return null
  const maximo = Math.max(objetivo, ...serie.map((p) => p.valor))

  return (
    <div className="grafico-barras-simple">
      {serie.map((p, i) => (
        <div key={i} className="grafico-barras-simple-col">
          <div
            className="grafico-barras-simple-barra"
            style={{ height: `${(p.valor / maximo) * 100}%` }}
            title={`${p.etiqueta}: ${formatearEuros(p.valor)}`}
          />
          {(i === 0 || i === serie.length - 1 || i % Math.ceil(serie.length / 6) === 0) && (
            <span className="grafico-barras-simple-etiqueta">{p.etiqueta}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function AhorroObjetivo() {
  const [modo, setModo] = useState('tiempo')
  const [objetivo, setObjetivo] = useState('')
  const [aportacion, setAportacion] = useState('')
  const [anios, setAnios] = useState('')
  const [meses, setMeses] = useState('')

  const numObjetivo = Number(objetivo) || 0
  const numAportacion = Number(aportacion) || 0
  const mesesDeseados = (Number(anios) || 0) * 12 + (Number(meses) || 0)

  const resultado = useMemo(() => {
    if (numObjetivo <= 0) return null

    if (modo === 'tiempo') {
      if (numAportacion <= 0) return null
      const mesesNecesarios = Math.ceil(numObjetivo / numAportacion)
      return {
        tipo: 'meses',
        mesesNecesarios,
        aportacionMensual: numAportacion,
        serie: construirSerie(numObjetivo, numAportacion, mesesNecesarios),
      }
    }

    if (mesesDeseados <= 0) return null
    const aportacionNecesaria = numObjetivo / mesesDeseados
    return {
      tipo: 'aportacion',
      aportacionNecesaria,
      serie: construirSerie(numObjetivo, aportacionNecesaria, mesesDeseados),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, numObjetivo, numAportacion, mesesDeseados])

  return (
    <div className="simulador fade-in-up">
      <h2>Ahorro objetivo</h2>

      <div className="tipo-toggle">
        <button type="button" className={modo === 'tiempo' ? 'activo' : ''} onClick={() => setModo('tiempo')}>
          ¿En cuánto tiempo?
        </button>
        <button
          type="button"
          className={modo === 'aportacion' ? 'activo' : ''}
          onClick={() => setModo('aportacion')}
        >
          ¿Cuánto aportar?
        </button>
      </div>

      <label htmlFor="ao-objetivo">Objetivo de ahorro (€)</label>
      <input
        id="ao-objetivo"
        type="number"
        inputMode="decimal"
        min="0"
        value={objetivo}
        onChange={(e) => setObjetivo(e.target.value)}
        placeholder="ej. 3000"
      />

      {modo === 'tiempo' ? (
        <>
          <label htmlFor="ao-aportacion">¿Cuánto puedes aportar cada mes? (€)</label>
          <input
            id="ao-aportacion"
            type="number"
            inputMode="decimal"
            min="0"
            value={aportacion}
            onChange={(e) => setAportacion(e.target.value)}
            placeholder="ej. 150"
          />
        </>
      ) : (
        <>
          <label>¿En cuánto tiempo quieres conseguirlo?</label>
          <div className="fila-doble">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={anios}
              onChange={(e) => setAnios(e.target.value)}
              placeholder="Años"
            />
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="11"
              value={meses}
              onChange={(e) => setMeses(e.target.value)}
              placeholder="Meses"
            />
          </div>
        </>
      )}

      {resultado?.tipo === 'meses' && (
        <p className="resultado">
          Aportando {formatearEuros(resultado.aportacionMensual)} al mes, llegarás a tu objetivo en{' '}
          <strong>{resultado.mesesNecesarios}</strong>{' '}
          {resultado.mesesNecesarios === 1 ? 'mes' : 'meses'}.
        </p>
      )}

      {resultado?.tipo === 'aportacion' && (
        <p className="resultado">
          Necesitas aportar <strong>{formatearEuros(resultado.aportacionNecesaria)}</strong> al mes
          para llegar a tu objetivo en el tiempo que has indicado.
        </p>
      )}

      {resultado && <GraficoProgreso serie={resultado.serie} objetivo={numObjetivo} />}
    </div>
  )
}
