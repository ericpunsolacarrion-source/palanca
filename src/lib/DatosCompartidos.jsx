import { createContext, useContext } from 'react'

// Comparte presupuesto y objetivos de ahorro desde una ÚNICA instancia de cada
// hook (la que crea App.jsx) con todos los componentes, en vez de que cada uno
// los pida por su cuenta (antes: ~3 fetches de presupuestos + ~3 de objetivos
// por carga del dashboard).
//
// FRESCURA: al haber una sola fuente, cualquier mutación (que sigue pasando por
// las mismas funciones del hook) actualiza ese estado y TODOS los consumidores
// se refrescan al instante. Antes, editar el presupuesto en un componente no
// refrescaba las copias de los otros hasta remontar: esto lo corrige.
//
// App instancia los hooks y los pasa por props (App también es consumidor y vive
// por encima del proveedor, así que no puede leer del contexto: es el dueño).

const PresupuestoCtx = createContext(null)
const ObjetivosCtx = createContext(null)
const ComerciosCtx = createContext(null)

export function DatosCompartidosProvider({ presupuesto, objetivos, comercios = null, children }) {
  return (
    <PresupuestoCtx.Provider value={presupuesto}>
      <ObjetivosCtx.Provider value={objetivos}>
        <ComerciosCtx.Provider value={comercios}>{children}</ComerciosCtx.Provider>
      </ObjetivosCtx.Provider>
    </PresupuestoCtx.Provider>
  )
}

// Memoria de comercios (useComercios). Fuera del proveedor (tests) devuelve una
// versión inerte: el directorio activo sigue funcionando sin memoria.
const COMERCIOS_INERTE = { alias: [], recordar: async () => {}, olvidar: async () => {} }
export function useComerciosCompartidos() {
  return useContext(ComerciosCtx) ?? COMERCIOS_INERTE
}

// Misma forma que devuelve usePresupuesto(), leyendo del contexto.
export function usePresupuestoCompartido() {
  const ctx = useContext(PresupuestoCtx)
  if (!ctx) throw new Error('usePresupuestoCompartido fuera de DatosCompartidosProvider')
  return ctx
}

// Misma forma que devuelve useObjetivosAhorro(), leyendo del contexto.
export function useObjetivosCompartidos() {
  const ctx = useContext(ObjetivosCtx)
  if (!ctx) throw new Error('useObjetivosCompartidos fuera de DatosCompartidosProvider')
  return ctx
}
