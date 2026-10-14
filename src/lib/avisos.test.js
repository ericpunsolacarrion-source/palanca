import { describe, expect, it } from 'vitest'
import { avisosNotificables, calcularAvisos } from './avisos'

const HOY = new Date(2026, 9, 14) // 14 oct 2026
const rec = (id, nombre, importe, extra = {}) => ({ id, nombre, importe, tipo: 'gasto', activo: true, mesesAplicados: [], ...extra })

describe('calcularAvisos', () => {
  it('avisa de cobros mensuales inminentes y renovaciones no mensuales', () => {
    const recs = [
      rec('1', 'Netflix', 13.99, { diaMes: 15 }), // mañana
      rec('2', 'Gym', 40, { diaMes: 25 }), // en 11 días → aún no
      rec('3', 'Seguro coche', 320, { diaMes: 24, periodoMeses: 12, mesInicio: 10 }), // renueva en 10 días
      rec('5', 'Agua', 38, { diaMes: 20, periodoMeses: 2, mesInicio: 10 }), // bimestral en 6 días: aún no es aviso
      rec('4', 'Nómina', 2000, { tipo: 'ingreso', diaMes: 15 }), // ingresos: nunca
    ]
    const avisos = calcularAvisos(recs, [], HOY)
    expect(avisos.map((a) => [a.tipo, a.titulo])).toEqual([
      ['cobro', 'Netflix · mañana'],
      ['renovacion', 'Seguro coche se renueva en 10 días'],
    ])
    expect(avisos[0].urgente).toBe(true)
    expect(avisosNotificables(avisos).map((a) => a.tipo)).toEqual(['cobro'])
  })

  it('no avisa de lo ya confirmado este mes', () => {
    const recs = [rec('1', 'Netflix', 13.99, { diaMes: 15, mesesAplicados: ['2026-10'] })]
    expect(calcularAvisos(recs, [], HOY)).toEqual([])
  })

  it('detecta subidas de precio recientes en los movimientos', () => {
    const g = (fecha, importe) => ({ tipo: 'gasto', importe, fecha, nota: 'SPOTIFY', categoria: { nombre: 'Ocio' } })
    const movs = [g('2026-07-05', 10.99), g('2026-08-05', 10.99), g('2026-09-05', 11.99), g('2026-10-05', 11.99)]
    const [a] = calcularAvisos([], movs, HOY)
    expect(a).toMatchObject({ tipo: 'subida', titulo: 'Spotify ha subido de precio' })
    expect(a.detalle).toMatch(/\+12\s€ al año/) // 1 €/mes × 12 (Intl usa espacio duro)
  })
})

describe('subidas de precio (revisión de código)', () => {
  const g = (fecha, importe) => ({ tipo: 'gasto', importe, fecha, nota: 'SPOTIFY', categoria: { nombre: 'Ocio' } })
  it('una subida antigua no vuelve a avisar en los meses siguientes', () => {
    // Subió en junio; en octubre (4 meses después) ya no es noticia.
    const movs = [g('2026-04-05', 10.99), g('2026-05-05', 10.99), g('2026-06-05', 11.99), g('2026-07-05', 11.99), g('2026-08-05', 11.99), g('2026-09-05', 11.99), g('2026-10-05', 11.99)]
    expect(calcularAvisos([], movs, HOY)).toEqual([])
  })
  it('el id es el mismo cada mes mientras sea la misma subida', () => {
    const base = [g('2026-07-05', 10.99), g('2026-08-05', 10.99), g('2026-09-05', 11.99)]
    const a = calcularAvisos([], base, new Date(2026, 8, 20))[0]
    const b = calcularAvisos([], [...base, g('2026-10-05', 11.99)], HOY)[0]
    expect(a.id).toBe(b.id)
  })
  it('no avisa de comercios descartados por el usuario', () => {
    const movs = [g('2026-07-05', 10.99), g('2026-08-05', 10.99), g('2026-09-05', 11.99), g('2026-10-05', 11.99)]
    expect(calcularAvisos([], movs, HOY, { descartadas: new Set(['spotify']) })).toEqual([])
  })
})
