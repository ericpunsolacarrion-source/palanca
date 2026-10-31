import { describe, expect, it } from 'vitest'
import { disenoActivo } from './diseno'

const almacen = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) } }

describe('diseño v3 solo fuera de la app pública', () => {
  it('la app pública sigue con v2 por defecto', () => {
    expect(disenoActivo({ hostname: 'palanca-zeta.vercel.app', search: '' }, almacen())).toBe('v2')
  })
  it('la versión de pruebas y local ven v3', () => {
    expect(disenoActivo({ hostname: 'palanca-git-develop-palanca-mac.vercel.app', search: '' }, almacen())).toBe('v3')
    expect(disenoActivo({ hostname: 'localhost', search: '' }, almacen())).toBe('v3')
  })
  it('?diseno= lo fuerza y se recuerda', () => {
    const a = almacen()
    expect(disenoActivo({ hostname: 'palanca-zeta.vercel.app', search: '?diseno=v3' }, a)).toBe('v3')
    expect(disenoActivo({ hostname: 'palanca-zeta.vercel.app', search: '' }, a)).toBe('v3')
    expect(disenoActivo({ hostname: 'localhost', search: '?diseno=v2' }, a)).toBe('v2')
  })
})
