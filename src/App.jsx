import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/useAuth'
import { cerrarSesionAuth } from './lib/auth'
import Auth from './components/Auth'
import PantallaCarga from './components/PantallaCarga'
import CuentaPanel from './components/CuentaPanel'
import PrimerosPasos from './components/PrimerosPasos'
import { obtenerPerfil, crearPerfil } from './lib/perfil'
import { crearAjuste } from './lib/ajustes'
import {
  claveMesActual,
  estimacionGastoMensual,
  etiquetaMes,
  filtrarMesActual,
  filtrarPorMes,
  rangoMeses,
  totalesDe,
} from './lib/movimientosUtils'
import Onboarding from './components/Onboarding'
import CapturaEmail from './components/CapturaEmail'
import ListaMovimientos from './components/ListaMovimientos'
import MetricasPrincipales from './components/MetricasPrincipales'
import Comparativas from './components/Comparativas'
import Pildora from './components/Pildora'
import ProyeccionFuturo from './components/ProyeccionFuturo'
import { pildorasDashboard, elegirPildora, firmaDatos, limpiarPildoras } from './lib/pildoras'
import { usePresupuesto } from './lib/usePresupuesto'
import RecordatorioBanner from './components/RecordatorioBanner'
import GraficoEvolucion from './components/GraficoEvolucion'
import GraficoCategorias from './components/GraficoCategorias'
import GraficoTasaAhorro from './components/GraficoTasaAhorro'
import PeriodoSelector from './components/PeriodoSelector'
import BottomNav from './components/BottomNav'
import Toaster from './components/Toaster'
import Confirmador from './components/Confirmador'
import Hitos from './components/Hitos'
import Logros from './components/Logros'
import Patrimonio from './components/Patrimonio'
import './App.css'

// Pestañas no iniciales cargadas bajo demanda (code-splitting): aligeran el
// arranque del dashboard. Cada una se descarga al entrar en su pestaña.
const MovimientosTab = lazy(() => import('./components/MovimientosTab'))
const Presupuesto = lazy(() => import('./components/Presupuesto'))
const PlanificacionFutura = lazy(() => import('./components/PlanificacionFutura'))
const Inversiones = lazy(() => import('./components/Inversiones'))
const Simulador = lazy(() => import('./components/Simulador'))
const Consultor = lazy(() => import('./components/Consultor'))

const CargandoVista = () => (
  <div className="vista" aria-busy="true">
    <div className="skeleton skeleton-linea" style={{ height: 120 }} />
  </div>
)

// Skeleton del dashboard mientras cargan los datos por primera vez: imita la
// línea de ingresos, el ahorro, las tarjetas y un gráfico, para que al aparecer
// los datos no salte el layout. Reutiliza .skeleton (shimmer + reduced-motion).
const DashboardSkeleton = () => (
  <div className="dashboard-skeleton" aria-busy="true" aria-label="Cargando tus datos">
    <div className="skeleton" style={{ height: 20, width: '55%' }} />
    <div className="skeleton" style={{ height: 120 }} />
    <div className="skeleton" style={{ height: 88 }} />
    <div className="skeleton" style={{ height: 160 }} />
  </div>
)

const MS_POR_DIA = 1000 * 60 * 60 * 24

function App() {
  // Acceso SOLO con Supabase Auth (el ID antiguo en localStorage se retiró tras
  // la migración; los datos quedan aislados por usuario con RLS).
  const { session, cargandoAuth, usuarioAuthId } = useAuth()
  const usuarioId = usuarioAuthId
  const [verCuenta, setVerCuenta] = useState(false)
  const [perfil, setPerfil] = useState(null)
  const [comprobandoPerfil, setComprobandoPerfil] = useState(true)
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [pestana, setPestana] = useState('dashboard')
  const [filtroMov, setFiltroMov] = useState(null) // tipo a filtrar en Movimientos
  const [modoRegistro, setModoRegistro] = useState(null) // modo inicial del alta (primeros pasos)
  // Selector de periodo GLOBAL del dashboard (clave 'YYYY-MM'). Gobierna a la vez
  // métricas, tasa de ahorro, categorías y evolución. Por defecto, el mes actual.
  const [mesDashboard, setMesDashboard] = useState(claveMesActual())

  // Navegación central: al cambiar de pestaña se limpia el filtro de movimientos,
  // salvo cuando se llega expresamente con uno (verMovimientos).
  const irAPestana = useCallback((destino) => {
    setFiltroMov(null)
    setModoRegistro(null)
    setPestana(destino)
  }, [])

  const verMovimientos = useCallback((tipo) => {
    setFiltroMov(tipo)
    setPestana('movimientos')
  }, [])

  // Ir a registrar un movimiento con un modo ya seleccionado (primeros pasos).
  const irARegistrar = useCallback((modo) => {
    setFiltroMov(null)
    setModoRegistro(modo)
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
      // Columnas explícitas (todas las que usa la app) EXCEPTO usuario_id, que
      // no lee ningún componente (RLS ya garantiza que son del usuario) y viajaba
      // repetido en cada fila. Recorta ~9% del payload sin cambiar nada visible.
      .select('id, tipo, importe, fecha, nota, created_at, fuente_id, categoria_id, es_fijo, categoria:categorias(id, nombre), fuente:fuentes(id, nombre)')
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

  // Rango de meses navegables y movimientos del periodo elegido (solo dashboard).
  const mesesRango = useMemo(() => rangoMeses(movimientos), [movimientos])
  const mesActivoDash = mesesRango.includes(mesDashboard) ? mesDashboard : mesesRango[0]
  const esMesActual = mesActivoDash === claveMesActual()
  const movimientosPeriodo = useMemo(
    () => filtrarPorMes(movimientos, mesActivoDash),
    [movimientos, mesActivoDash],
  )

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

  // Firma de datos: cambia al crear/borrar un movimiento, lo que re-permite
  // que reaparezcan las píldoras descartadas (ver lib/pildoras.js).
  const firmaPildoras = useMemo(() => firmaDatos(movimientos), [movimientos])

  const pildoraDash = useMemo(() => {
    const candidatas = pildorasDashboard({
      movimientos,
      movimientosMes,
      objetivoInversion: objetivoInversionMensual,
    })
    return elegirPildora(usuarioId, candidatas, firmaPildoras)
    // descartesPildora fuerza recálculo al cerrar una píldora, para revelar la siguiente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientos, movimientosMes, objetivoInversionMensual, usuarioId, firmaPildoras, descartesPildora])

  // Al cerrar sesión, olvida los descartes de píldoras y cierra la sesión de Auth.
  const cerrarSesionConLimpieza = useCallback(async () => {
    if (usuarioId) limpiarPildoras(usuarioId)
    await cerrarSesionAuth()
  }, [usuarioId])

  // Esperando a saber si hay sesión de Auth (evita parpadeo a la pantalla de
  // acceso cuando en realidad ya hay sesión guardada). Splash en vez de negro.
  if (cargandoAuth) {
    return <PantallaCarga />
  }

  if (!usuarioId) {
    return <Auth />
  }

  if (comprobandoPerfil) {
    return <PantallaCarga />
  }

  if (!perfil) {
    return (
      <Onboarding
        emailInicial={session?.user?.email}
        onCompletar={async (objetivo, email, saldoInicial, anioNacimiento, nombre) => {
          const nuevoPerfil = await crearPerfil(usuarioId, objetivo, email, anioNacimiento, nombre)
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
        <button
          className="app-cuenta"
          onClick={() => setVerCuenta(true)}
          aria-label={`Tu cuenta${session?.user?.email ? ` (${session.user.email})` : ''}`}
          title={session?.user?.email ?? 'Tu cuenta'}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </svg>
          Cuenta
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
            {perfil.nombre && <p className="saludo-usuario">Hola, {perfil.nombre} 👋</p>}
            {/* Primera carga (sin datos aún): skeleton en vez de dashboard vacío.
                En refetch (ya hay movimientos) NO se muestra, para no parpadear. */}
            {cargando && movimientos.length === 0 && <DashboardSkeleton />}
            {!cargando && (
              <PrimerosPasos
                nombre={perfil.nombre}
                movimientos={movimientos}
                onRegistrar={irARegistrar}
              />
            )}
            {'email' in perfil && !perfil.email && (
              /* Solo se ofrece cuando la columna email ya existe en la BD */
              <CapturaEmail
                usuarioId={usuarioId}
                onGuardado={(email) => setPerfil({ ...perfil, email })}
              />
            )}
            {/* Sin ningún movimiento, el dashboard solo muestra el arranque
                guiado (nada de muros de ceros). Con datos, el dashboard completo. */}
            {movimientos.length > 0 && (
              <>
                <RecordatorioBanner
                  dias={diasDesdeUltimoMovimiento}
                  onIrAMovimientos={() => irAPestana('movimientos')}
                />
                {/* Orden por importancia: primero el periodo y lo del mes elegido
                    (métricas + tasa de ahorro), luego lo conseguido (bolsas y
                    patrimonio) y el resto de gráficos del periodo. La proyección de
                    futuro baja: es valiosa pero no prioritaria. */}
                <PeriodoSelector meses={mesesRango} valor={mesActivoDash} onCambiar={setMesDashboard} />
                <MetricasPrincipales
                  usuarioId={usuarioId}
                  movimientos={movimientosPeriodo}
                  historico={movimientos}
                  etiquetaPeriodo={esMesActual ? 'este mes' : etiquetaMes(mesActivoDash, { month: 'long' })}
                  esMesActual={esMesActual}
                  onVerMovimientos={verMovimientos}
                />
                <Patrimonio
                  usuarioId={usuarioId}
                  movimientos={movimientos}
                  onGuardado={cargarMovimientos}
                  onVerInversion={() => irAPestana('inversiones')}
                />
                <GraficoTasaAhorro movimientos={movimientos} mesFin={mesActivoDash} />
                <GraficoCategorias
                  movimientos={movimientosPeriodo}
                  etiqueta={esMesActual ? 'este mes' : etiquetaMes(mesActivoDash, { month: 'long' })}
                />
                <GraficoEvolucion movimientos={movimientos} mesFin={mesActivoDash} />
                <Comparativas movimientos={movimientos} />
                <Logros usuarioId={usuarioId} movimientos={movimientos} movimientosMes={movimientosMes} />
                {pildoraDash && (
                  <Pildora
                    key={pildoraDash.id}
                    usuarioId={usuarioId}
                    pildora={pildoraDash}
                    firma={firmaPildoras}
                    onCta={irAPestana}
                    onDescartar={() => setDescartesPildora((n) => n + 1)}
                  />
                )}
                <ProyeccionFuturo
                  movimientos={movimientos}
                  onIrARegistro={() => irAPestana('movimientos')}
                />
                <h2 className="subtitulo-seccion">Últimos movimientos</h2>
                <ListaMovimientos
                  movimientos={movimientos.slice(0, 5)}
                  cargando={cargando}
                  soloLectura
                  onIrARegistro={() => irAPestana('movimientos')}
                />
              </>
            )}
          </div>
        )}

        <Suspense fallback={<CargandoVista />}>
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
            modoInicialRegistro={modoRegistro}
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
            movimientos={movimientos}
            ahorroMensual={totalesMes.ahorro}
            gastoMensual={gastoEstimado.estimacion || totalesMes.gastos}
            diasConHistorial={diasConHistorial}
          />
        )}
        </Suspense>
      </main>

      <BottomNav activa={pestana} onCambiar={irAPestana} />
      <Toaster />
      <Confirmador />
      {verCuenta && (
        <CuentaPanel
          email={session?.user?.email ?? ''}
          perfil={perfil}
          usuarioId={usuarioId}
          onPerfilActualizado={(p) => setPerfil(p)}
          onCerrar={() => setVerCuenta(false)}
          onCerrarSesion={() => {
            setVerCuenta(false)
            cerrarSesionConLimpieza()
          }}
        />
      )}
      <Hitos usuarioId={usuarioId} movimientos={movimientos} movimientosMes={movimientosMes} />
      <Suspense fallback={null}>
        <Consultor movimientos={movimientos} objetivo={{ texto: perfil.objetivo, usuarioId }} />
      </Suspense>
    </div>
  )
}

export default App
