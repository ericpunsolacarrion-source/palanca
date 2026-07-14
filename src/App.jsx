import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { useUsuarioId } from './lib/useUsuarioId'
import { obtenerPerfil, crearPerfil } from './lib/perfil'
import { crearAjuste } from './lib/ajustes'
import { estimacionGastoMensual, filtrarMesActual, totalesDe } from './lib/movimientosUtils'
import PantallaId from './components/PantallaId'
import Onboarding from './components/Onboarding'
import CapturaEmail from './components/CapturaEmail'
import MovimientosTab from './components/MovimientosTab'
import ListaMovimientos from './components/ListaMovimientos'
import MetricasPrincipales from './components/MetricasPrincipales'
import Comparativas from './components/Comparativas'
import Pildora from './components/Pildora'
import ProyeccionFuturo from './components/ProyeccionFuturo'
import { pildorasDashboard, elegirPildora } from './lib/pildoras'
import { usePresupuesto } from './lib/usePresupuesto'
import Simulador from './components/Simulador'
import Presupuesto from './components/Presupuesto'
import PlanificacionFutura from './components/PlanificacionFutura'
import Inversiones from './components/Inversiones'
import RecordatorioBanner from './components/RecordatorioBanner'
import GraficoEvolucion from './components/GraficoEvolucion'
import GraficoCategorias from './components/GraficoCategorias'
import GraficoTasaAhorro from './components/GraficoTasaAhorro'
import BottomNav from './components/BottomNav'
import Toaster from './components/Toaster'
import Confirmador from './components/Confirmador'
import Hitos from './components/Hitos'
import Logros from './components/Logros'
import Patrimonio from './components/Patrimonio'
import Consultor from './components/Consultor'
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
  const [filtroMov, setFiltroMov] = useState(null) // tipo a filtrar en Movimientos

  // Navegación central: al cambiar de pestaña se limpia el filtro de movimientos,
  // salvo cuando se llega expresamente con uno (verMovimientos).
  const irAPestana = useCallback((destino) => {
    setFiltroMov(null)
    setPestana(destino)
  }, [])

  const verMovimientos = useCallback((tipo) => {
    setFiltroMov(tipo)
    setPestana('movimientos')
  }, [])

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
  const gastoEstimado = useMemo(() => estimacionGastoMensual(movimientos), [movimientos])

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

  const { objetivoInversionMensual } = usePresupuesto(usuarioId)
  const [descartesPildora, setDescartesPildora] = useState(0)

  const pildoraDash = useMemo(() => {
    const candidatas = pildorasDashboard({
      movimientos,
      movimientosMes,
      objetivoInversion: objetivoInversionMensual,
    })
    return elegirPildora(usuarioId, candidatas)
    // descartesPildora fuerza recálculo al cerrar una píldora, para revelar la siguiente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientos, movimientosMes, objetivoInversionMensual, usuarioId, descartesPildora])

  if (!usuarioId) {
    return <PantallaId onEntrar={setUsuarioId} />
  }

  if (comprobandoPerfil) {
    return null
  }

  if (!perfil) {
    return (
      <Onboarding
        onCompletar={async (objetivo, email, saldoInicial) => {
          const nuevoPerfil = await crearPerfil(usuarioId, objetivo, email)
          if (nuevoPerfil) {
            // Saldo líquido de partida como movimiento de ajuste (bolsa de liquidez).
            if (saldoInicial > 0) {
              await crearAjuste(usuarioId, {
                importe: saldoInicial,
                tipo: 'ingreso',
                nota: 'Saldo inicial',
              })
            }
            setPerfil(nuevoPerfil)
          }
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
            {'email' in perfil && !perfil.email && (
              /* Solo se ofrece cuando la columna email ya existe en la BD */
              <CapturaEmail
                usuarioId={usuarioId}
                onGuardado={(email) => setPerfil({ ...perfil, email })}
              />
            )}
            <RecordatorioBanner
              dias={diasDesdeUltimoMovimiento}
              onIrAMovimientos={() => irAPestana('movimientos')}
            />
            <MetricasPrincipales
              usuarioId={usuarioId}
              movimientos={movimientosMes}
              historico={movimientos}
              onVerMovimientos={verMovimientos}
            />
            <Patrimonio usuarioId={usuarioId} movimientos={movimientos} onGuardado={cargarMovimientos} />
            <Comparativas movimientos={movimientos} />
            <Logros usuarioId={usuarioId} movimientos={movimientos} movimientosMes={movimientosMes} />
            {pildoraDash && (
              <Pildora
                key={pildoraDash.id}
                usuarioId={usuarioId}
                pildora={pildoraDash}
                onCta={irAPestana}
                onDescartar={() => setDescartesPildora((n) => n + 1)}
              />
            )}
            <ProyeccionFuturo
              movimientos={movimientos}
              onIrARegistro={() => irAPestana('movimientos')}
            />
            <GraficoTasaAhorro movimientos={movimientos} />
            <GraficoCategorias movimientos={movimientosMes} />
            <GraficoEvolucion movimientos={movimientos} />
            {movimientos.length > 0 && <h2 className="subtitulo-seccion">Últimos movimientos</h2>}
            <ListaMovimientos
              movimientos={movimientos.slice(0, 5)}
              cargando={cargando}
              soloLectura
              onIrARegistro={() => irAPestana('movimientos')}
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
            filtro={filtroMov}
            onLimpiarFiltro={() => setFiltroMov(null)}
          />
        )}

        {pestana === 'presupuesto' && (
          <div key="presupuesto" className="vista">
            <Presupuesto usuarioId={usuarioId} movimientos={movimientosMes} gastoEstimado={gastoEstimado} />
            <PlanificacionFutura usuarioId={usuarioId} movimientos={movimientos} />
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
            gastoMensual={gastoEstimado.estimacion || totalesMes.gastos}
            diasConHistorial={diasConHistorial}
          />
        )}
      </main>

      <BottomNav activa={pestana} onCambiar={irAPestana} />
      <Toaster />
      <Confirmador />
      <Hitos usuarioId={usuarioId} movimientos={movimientos} movimientosMes={movimientosMes} />
      <Consultor movimientos={movimientos} objetivo={{ texto: perfil.objetivo, usuarioId }} />
    </div>
  )
}

export default App
