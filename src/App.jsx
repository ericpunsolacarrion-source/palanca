import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { useUsuarioId } from './lib/useUsuarioId'
import { obtenerPerfil, crearPerfil } from './lib/perfil'
import { useEstadisticasGlobales } from './lib/useEstadisticasGlobales'
import { esInversion } from './lib/categorias'
import PantallaId from './components/PantallaId'
import Onboarding from './components/Onboarding'
import RegistroMovimiento from './components/RegistroMovimiento'
import ListaMovimientos from './components/ListaMovimientos'
import Balance from './components/Balance'
import Simulador from './components/Simulador'
import Presupuesto from './components/Presupuesto'
import Inversiones from './components/Inversiones'
import RecordatorioBanner from './components/RecordatorioBanner'
import GraficoEvolucion from './components/GraficoEvolucion'
import GraficoCategorias from './components/GraficoCategorias'
import BottomNav from './components/BottomNav'
import './App.css'

function inicioYFinDelMes() {
  const ahora = new Date()
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
  return {
    desde: inicio.toISOString().slice(0, 10),
    hasta: fin.toISOString().slice(0, 10),
  }
}

function App() {
  const { usuarioId, setUsuarioId, cerrarSesion } = useUsuarioId()
  const [perfil, setPerfil] = useState(null)
  const [comprobandoPerfil, setComprobandoPerfil] = useState(true)
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [pestana, setPestana] = useState('dashboard')

  const { diasDesdeUltimoMovimiento, diasConHistorial } = useEstadisticasGlobales(usuarioId)

  useEffect(() => {
    if (!usuarioId) return
    setComprobandoPerfil(true)
    obtenerPerfil(usuarioId).then((p) => {
      setPerfil(p)
      setComprobandoPerfil(false)
    })
  }, [usuarioId])

  const cargarMovimientos = useCallback(async () => {
    if (!usuarioId) return
    setCargando(true)
    const { desde, hasta } = inicioYFinDelMes()

    const { data, error } = await supabase
      .from('movimientos')
      .select('*, categoria:categorias(id, nombre), fuente:fuentes(id, nombre)')
      .eq('usuario_id', usuarioId)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })

    if (!error) setMovimientos(data)
    setCargando(false)
  }, [usuarioId])

  useEffect(() => {
    if (perfil) cargarMovimientos()
  }, [perfil, cargarMovimientos])

  if (!usuarioId) {
    return <PantallaId onEntrar={setUsuarioId} />
  }

  if (comprobandoPerfil) {
    return null
  }

  if (!perfil) {
    return (
      <Onboarding
        onCompletar={async (objetivo) => {
          const nuevoPerfil = await crearPerfil(usuarioId, objetivo)
          setPerfil(nuevoPerfil)
        }}
      />
    )
  }

  const totalIngresos = movimientos
    .filter((m) => m.tipo === 'ingreso')
    .reduce((s, m) => s + Number(m.importe), 0)
  const totalGastosConsumo = movimientos
    .filter((m) => m.tipo === 'gasto' && !esInversion(m))
    .reduce((s, m) => s + Number(m.importe), 0)
  const ahorroMensual = totalIngresos - totalGastosConsumo

  return (
    <div className="app">
      <header className="app-header">
        <h1>Palanca</h1>
        <button className="link" onClick={cerrarSesion}>
          Cambiar usuario ({usuarioId})
        </button>
      </header>

      <main>
        {pestana === 'dashboard' && (
          <div key="dashboard" className="vista">
            <RecordatorioBanner
              dias={diasDesdeUltimoMovimiento}
              onIrAMovimientos={() => setPestana('movimientos')}
            />
            <Balance movimientos={movimientos} />
            <GraficoCategorias movimientos={movimientos} />
            <GraficoEvolucion usuarioId={usuarioId} />
            <ListaMovimientos movimientos={movimientos.slice(0, 5)} cargando={cargando} />
          </div>
        )}

        {pestana === 'movimientos' && (
          <div key="movimientos" className="vista">
            <RegistroMovimiento usuarioId={usuarioId} onGuardado={cargarMovimientos} />
            <ListaMovimientos movimientos={movimientos} cargando={cargando} />
          </div>
        )}

        {pestana === 'presupuesto' && (
          <div key="presupuesto" className="vista">
            <Presupuesto usuarioId={usuarioId} movimientos={movimientos} />
          </div>
        )}

        {pestana === 'inversiones' && (
          <Inversiones key="inversiones" usuarioId={usuarioId} onGuardado={cargarMovimientos} />
        )}

        {pestana === 'simulador' && (
          <Simulador
            key="simulador"
            ahorroMensual={ahorroMensual}
            gastoMensual={totalGastosConsumo}
            diasConHistorial={diasConHistorial}
          />
        )}
      </main>

      <BottomNav activa={pestana} onCambiar={setPestana} />
    </div>
  )
}

export default App
