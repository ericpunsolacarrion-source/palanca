import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { useUsuarioId } from './lib/useUsuarioId'
import { obtenerPerfil, crearPerfil } from './lib/perfil'
import { filtrarMesActual, totalesDe } from './lib/movimientosUtils'
import PantallaId from './components/PantallaId'
import Onboarding from './components/Onboarding'
import MovimientosTab from './components/MovimientosTab'
import ListaMovimientos from './components/ListaMovimientos'
import MetricasPrincipales from './components/MetricasPrincipales'
import Simulador from './components/Simulador'
import Presupuesto from './components/Presupuesto'
import Inversiones from './components/Inversiones'
import RecordatorioBanner from './components/RecordatorioBanner'
import GraficoEvolucion from './components/GraficoEvolucion'
import GraficoCategorias from './components/GraficoCategorias'
import GraficoTasaAhorro from './components/GraficoTasaAhorro'
import BottomNav from './components/BottomNav'
import Toaster from './components/Toaster'
import './App.css'

const MS_POR_DIA = 1000 * 60 * 60 * 24

function App() {
  const { usuarioId, setUsuarioId, cerrarSesion } = useUsuarioId()
  const [perfil, setPerfil] = useState(null)
  const [comprobandoPerfil, setComprobandoPerfil] = useState(true)
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [pestana, setPestana] = useState('dashboard')

  useEffect(() => {
    if (!usuarioId) return
    setComprobandoPerfil(true)
    obtenerPerfil(usuarioId).then((p) => {
      setPerfil(p)
      setComprobandoPerfil(false)
    })
  }, [usuarioId])

  // Fuente única de datos: TODOS los movimientos del usuario, ordenados por
  // fecha. Cada pantalla deriva lo que necesita de aquí, así crear/editar/
  // borrar en cualquier sitio se refleja en toda la app.
  const cargarMovimientos = useCallback(async () => {
    if (!usuarioId) return
    setErrorCarga(false)

    const { data, error } = await supabase
      .from('movimientos')
      .select('*, categoria:categorias(id, nombre), fuente:fuentes(id, nombre)')
      .eq('usuario_id', usuarioId)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setErrorCarga(true)
    } else {
      setMovimientos(data)
    }
    setCargando(false)
  }, [usuarioId])

  useEffect(() => {
    if (perfil) {
      setCargando(true)
      cargarMovimientos()
    }
  }, [perfil, cargarMovimientos])

  const movimientosMes = useMemo(() => filtrarMesActual(movimientos), [movimientos])
  const totalesMes = useMemo(() => totalesDe(movimientosMes), [movimientosMes])

  const { diasDesdeUltimoMovimiento, diasConHistorial } = useMemo(() => {
    if (movimientos.length === 0) {
      return { diasDesdeUltimoMovimiento: null, diasConHistorial: 0 }
    }
    const ahora = Date.now()
    const ultimoRegistro = Math.max(...movimientos.map((m) => new Date(m.created_at).getTime()))
    const primeraFecha = Math.min(...movimientos.map((m) => new Date(m.fecha).getTime()))
    return {
      diasDesdeUltimoMovimiento: Math.floor((ahora - ultimoRegistro) / MS_POR_DIA),
      diasConHistorial: Math.floor((ahora - primeraFecha) / MS_POR_DIA),
    }
  }, [movimientos])

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
          if (nuevoPerfil) setPerfil(nuevoPerfil)
          return Boolean(nuevoPerfil)
        }}
      />
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Palanca</h1>
        <button className="link" onClick={cerrarSesion}>
          Cambiar usuario ({usuarioId})
        </button>
      </header>

      <main>
        {errorCarga && (
          <div className="aviso-error">
            <span>No se han podido cargar tus datos. Revisa tu conexión.</span>
            <button type="button" onClick={cargarMovimientos}>
              Reintentar
            </button>
          </div>
        )}

        {pestana === 'dashboard' && (
          <div key="dashboard" className="vista">
            <RecordatorioBanner
              dias={diasDesdeUltimoMovimiento}
              onIrAMovimientos={() => setPestana('movimientos')}
            />
            <MetricasPrincipales usuarioId={usuarioId} movimientos={movimientosMes} />
            <GraficoTasaAhorro movimientos={movimientos} />
            <GraficoCategorias movimientos={movimientosMes} />
            <GraficoEvolucion movimientos={movimientos} />
            {movimientos.length > 0 && <h2 className="subtitulo-seccion">Últimos movimientos</h2>}
            <ListaMovimientos
              movimientos={movimientos.slice(0, 5)}
              cargando={cargando}
              soloLectura
              onIrARegistro={() => setPestana('movimientos')}
            />
          </div>
        )}

        {pestana === 'movimientos' && (
          <MovimientosTab
            key="movimientos"
            usuarioId={usuarioId}
            movimientos={movimientos}
            movimientosMes={movimientosMes}
            cargando={cargando}
            onGuardado={cargarMovimientos}
          />
        )}

        {pestana === 'presupuesto' && (
          <div key="presupuesto" className="vista">
            <Presupuesto usuarioId={usuarioId} movimientos={movimientosMes} />
          </div>
        )}

        {pestana === 'inversiones' && (
          <Inversiones
            key="inversiones"
            usuarioId={usuarioId}
            movimientos={movimientos}
            cargando={cargando}
            onGuardado={cargarMovimientos}
          />
        )}

        {pestana === 'simulador' && (
          <Simulador
            key="simulador"
            usuarioId={usuarioId}
            ahorroMensual={totalesMes.ahorro}
            gastoMensual={totalesMes.gastos}
            diasConHistorial={diasConHistorial}
          />
        )}
      </main>

      <BottomNav activa={pestana} onCambiar={setPestana} />
      <Toaster />
    </div>
  )
}

export default App
