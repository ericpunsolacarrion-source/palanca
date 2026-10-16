import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { nombrePropio } from './lib/nombrePropio'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/useAuth'
import { cerrarSesionAuth } from './lib/auth'
import { iniciarAnalitica, registrarEvento } from './lib/analitica'
import { EVENTO_IR } from './lib/fulcro'
import Auth from './components/Auth'
import PantallaCarga from './components/PantallaCarga'
import CuentaPanel from './components/CuentaPanel'
import PrimerosPasos from './components/PrimerosPasos'
import { obtenerPerfil, crearPerfil } from './lib/perfil'
import { crearAjuste } from './lib/ajustes'
import {
  SELECT_MOVIMIENTO,
  claveMesActual,
  estimacionGastoMensual,
  etiquetaMes,
  filtrarMesActual,
  filtrarPorMes,
  fusionarMovimientos,
  rangoMeses,
  totalesDe,
} from './lib/movimientosUtils'
import Onboarding from './components/Onboarding'
import CapturaEmail from './components/CapturaEmail'
import MetricasPrincipales from './components/MetricasPrincipales'
import Comparativas from './components/Comparativas'
import Pildora from './components/Pildora'
import ProyeccionFuturo from './components/ProyeccionFuturo'
import { pildorasDashboard, elegirPildora, firmaDatos, limpiarPildoras } from './lib/pildoras'
import { usePresupuesto } from './lib/usePresupuesto'
import { useRecurrentes } from './lib/useRecurrentes'
import { conciliarFijos } from './lib/conciliarFijos'
import { useObjetivosAhorro } from './lib/useObjetivosAhorro'
import { DatosCompartidosProvider } from './lib/DatosCompartidos'
import { useComercios } from './lib/useComercios'
import GraficoEvolucion from './components/GraficoEvolucion'
import GraficoCategorias from './components/GraficoCategorias'
import GraficoTasaAhorro from './components/GraficoTasaAhorro'
import PeriodoSelector from './components/PeriodoSelector'
import BottomNav from './components/BottomNav'
import Toaster from './components/Toaster'
import Confirmador from './components/Confirmador'
import Hitos from './components/Hitos'
import Logros from './components/Logros'
import Inicio from './components/Inicio'
import Icono, { Marca } from './components/Icono'
import { fijarImportesOcultos, importesOcultos } from './lib/privacidad'
import { toast } from './lib/toast'
import { generarDemo } from './lib/datosDemo'
import { esAjuste } from './lib/categorias'
import { estadoCobro } from './lib/periodicidad'
import TourRapido from './components/TourRapido'
import './App.css'

// Pestañas no iniciales cargadas bajo demanda (code-splitting): aligeran el
// arranque del dashboard. Cada una se descarga al entrar en su pestaña.
const MovimientosTab = lazy(() => import('./components/MovimientosTab'))
const Presupuesto = lazy(() => import('./components/Presupuesto'))
const PlanificacionFutura = lazy(() => import('./components/PlanificacionFutura'))
const Inversiones = lazy(() => import('./components/Inversiones'))
const Simulador = lazy(() => import('./components/Simulador'))
const Recurrentes = lazy(() => import('./components/Recurrentes'))
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
const FMT_HOY = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function leerMarca(clave) {
  try {
    return localStorage.getItem(clave) === '1'
  } catch {
    return false
  }
}
function guardarMarca(clave) {
  try {
    localStorage.setItem(clave, '1')
  } catch {
    // sin persistencia: se volverá a ofrecer
  }
}

function App() {
  // Acceso SOLO con Supabase Auth (el ID antiguo en localStorage se retiró tras
  // la migración; los datos quedan aislados por usuario con RLS).
  const { session, cargandoAuth, usuarioAuthId } = useAuth()
  const usuarioId = usuarioAuthId
  // Memoria de comercios ("ALIPAM23" es Mercadona). Va lo primero: fija el
  // directorio activo (lib/comercios.js) antes de cualquier cálculo de la app.
  const comerciosData = useComercios(usuarioId)
  const [verCuenta, setVerCuenta] = useState(false)
  const [perfil, setPerfil] = useState(null)
  const [comprobandoPerfil, setComprobandoPerfil] = useState(true)
  const [movimientosReales, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [pestana, setPestana] = useState('dashboard')
  const [filtroMov, setFiltroMov] = useState(null) // tipo a filtrar en Movimientos
  const [modoRegistro, setModoRegistro] = useState(null) // modo inicial del alta (primeros pasos)
  // Selector de periodo GLOBAL del dashboard (clave 'YYYY-MM'). Gobierna a la vez
  // métricas, tasa de ahorro, categorías y evolución. Por defecto, el mes actual.
  const [mesDashboard, setMesDashboard] = useState(claveMesActual())
  // Inicio: "Resumen" (lo esencial) o "Análisis" (gráficos por periodo).
  const [vistaInicio, setVistaInicio] = useState('resumen')
  // Modo discreto: oculta todos los importes (alguien al lado). Al cambiar se
  // vuelve a montar el contenido para que TODO se repinte con o sin cifras.
  const [ocultos, setOcultos] = useState(importesOcultos)
  const alternarOcultos = useCallback(() => {
    fijarImportesOcultos(!importesOcultos())
    setOcultos(importesOcultos())
  }, [])

  // Navegación central: al cambiar de pestaña se limpia el filtro de movimientos,
  // salvo cuando se llega expresamente con uno (verMovimientos).
  const irAPestana = useCallback((destino) => {
    setFiltroMov(null)
    setModoRegistro(null)
    setPestana(destino)
  }, [])
  // Desde Fulcro: "Ver en Análisis", "Ir a Fijos"…
  useEffect(() => {
    const ir = (e) => {
      if (!e.detail?.pestana) return
      irAPestana(e.detail.pestana)
      if (e.detail.vista) setVistaInicio(e.detail.vista)
      window.scrollTo?.({ top: 0 })
      // Subpestaña ("Simuladores" dentro de Plan): se pulsa cuando ya está pintada.
      if (e.detail.clic) {
        let intentos = 0
        const pulsar = () => {
          const boton = [...document.querySelectorAll('[role="tab"], .sub-tabs button')].find((b) => b.textContent.trim().startsWith(e.detail.clic))
          if (boton) boton.click()
          else if (++intentos < 30) setTimeout(pulsar, 100) // la pantalla se carga bajo demanda
        }
        setTimeout(pulsar, 50)
      }
    }
    window.addEventListener(EVENTO_IR, ir)
    return () => window.removeEventListener(EVENTO_IR, ir)
  }, [irAPestana])

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

  // Este dispositivo ya ha entrado alguna vez: la pantalla de acceso abrirá
  // en "Entrar" en vez de "Crear cuenta".
  useEffect(() => {
    if (usuarioId) guardarMarca('palanca_ya_entro')
  }, [usuarioId])

  useEffect(() => {
    if (!usuarioId) return
    setComprobandoPerfil(true)
    obtenerPerfil(usuarioId).then((p) => {
      setPerfil(p)
      setComprobandoPerfil(false)
    })
  }, [usuarioId])

  // Analítica de uso propia (solo tipo de acción y cuándo; ver lib/analitica.js).
  const analiticaPermitida = perfil ? perfil.analitica !== false : null
  useEffect(() => {
    if (analiticaPermitida === null) return
    iniciarAnalitica({ usuarioId, permitida: analiticaPermitida })
  }, [usuarioId, analiticaPermitida])

  // Fuente única de datos: TODOS los movimientos del usuario, ordenados por
  // fecha. Cada pantalla deriva lo que necesita de aquí, así crear/editar/
  // borrar en cualquier sitio se refleja en toda la app.
  const cargarMovimientos = useCallback(async () => {
    if (!usuarioId) return
    setErrorCarga(false)

    // Supabase devuelve como MÁXIMO 1000 filas por consulta: sin paginar, a
    // partir de 1000 movimientos se perderían los más antiguos (saldo inicial
    // incluido) y el patrimonio saldría mal. Se pide por páginas hasta agotar.
    const POR_PAGINA = 1000
    const todos = []
    let error = null
    for (let desde = 0; ; desde += POR_PAGINA) {
      const { data, error: err } = await supabase
        .from('movimientos')
        // SELECT_MOVIMIENTO: columnas explícitas (sin usuario_id, que no se usa).
        .select(SELECT_MOVIMIENTO)
        .eq('usuario_id', usuarioId)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }) // desempate estable entre páginas
        .range(desde, desde + POR_PAGINA - 1)
      if (err) {
        error = err
        break
      }
      todos.push(...data)
      if (data.length < POR_PAGINA) break
    }

    if (error) {
      setErrorCarga(true)
    } else {
      setMovimientos(todos)
    }
    setCargando(false)
  }, [usuarioId])

  // Refresco tras una mutación. Si el sitio pasa un `cambio` puntual (crear/
  // editar/borrar con la fila que devuelve el servidor), se fusiona en memoria
  // SIN recargar todo el histórico (rápido a escala). Si no se pasa nada, se
  // recarga todo (fallback siempre correcto). La fila del cambio viene del
  // servidor con SELECT_MOVIMIENTO, así que no hay divergencia con la BD.
  const onGuardado = useCallback(
    (cambio) => {
      if (cambio) setMovimientos((prev) => fusionarMovimientos(prev, cambio))
      else cargarMovimientos()
    },
    [cargarMovimientos],
  )

  useEffect(() => {
    if (perfil) {
      setCargando(true)
      cargarMovimientos()
    }
  }, [perfil, cargarMovimientos])

  // Compromisos de Fijos (suscripciones, recibos): globo de pendientes en la
  // navegación y avisos de cobros en el inicio.
  const {
    items: recurrentesReales,
    cargando: cargandoRecurrentes,
    confirmarCobro,
    desmarcar: desmarcarCobro,
  } = useRecurrentes(usuarioId)
  // Fijos cuyo cobro de este mes YA está en los movimientos (extracto, captura
  // o a mano) cuentan como pagados: nada se cuenta dos veces (lib/conciliarFijos).
  const recurrentesConciliados = useMemo(
    () => conciliarFijos(recurrentesReales, movimientosReales),
    [recurrentesReales, movimientosReales, comerciosData.alias], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ── Datos de EJEMPLO para quien acaba de llegar ──────────────────────────
  // Sin nada propio todavía (el saldo inicial no cuenta), la app se enseña
  // llena con datos de ejemplo en memoria (lib/datosDemo.js) hasta que el
  // usuario apunta lo primero o pulsa "Empezar con mis datos".
  const [demoDescartada, setDemoDescartada] = useState(() =>
    usuarioId ? leerMarca(`palanca_demo_fuera_${usuarioId}`) : false,
  )
  useEffect(() => {
    setDemoDescartada(leerMarca(`palanca_demo_fuera_${usuarioId}`))
  }, [usuarioId])
  const demo = useMemo(() => generarDemo(), [])
  const tieneDatosPropios = useMemo(
    () => movimientosReales.some((m) => !esAjuste(m)) || recurrentesReales.length > 0,
    [movimientosReales, recurrentesReales],
  )
  // "Ver con datos de ejemplo" (Tu cuenta): enseñar la app sin mostrar tu
  // dinero. Solo en esta sesión; no toca nada de lo guardado.
  const [forzarEjemplo, setForzarEjemplo] = useState(false)
  const enDemo =
    forzarEjemplo ||
    (Boolean(perfil) && !cargando && !cargandoRecurrentes && !errorCarga && !tieneDatosPropios && !demoDescartada)
  const movimientos = enDemo ? demo.movimientos : movimientosReales
  const recurrentes = enDemo ? demo.recurrentes : recurrentesConciliados
  const nPendientesFijos = enDemo
    ? demo.recurrentes.filter((r) => ['confirmar', 'sin-dia'].includes(estadoCobro(r))).length
    : recurrentesConciliados.filter((r) => ['confirmar', 'sin-dia'].includes(estadoCobro(r))).length

  // Demo rápida (recorrido guiado): se ofrece sola la primera vez que se ven
  // los datos de ejemplo, y siempre desde "Tu cuenta".
  // false | 'rapido' | 'avanzado'. La avanzada corre siempre con los datos de
  // ejemplo (todo lleno, sin enseñar tu dinero) y al salir vuelve a los tuyos.
  const [tourAbierto, setTourAbierto] = useState(false)
  const [ejemploPorTour, setEjemploPorTour] = useState(false)
  useEffect(() => {
    if (!enDemo || !usuarioId) return
    const clave = `palanca_tour_visto_${usuarioId}`
    if (leerMarca(clave)) return
    guardarMarca(clave)
    setTourAbierto('rapido')
  }, [enDemo, usuarioId])
  useEffect(() => {
    if (tourAbierto) registrarEvento(tourAbierto === 'avanzado' ? 'tour_avanzado' : 'tour')
  }, [tourAbierto])
  useEffect(() => {
    if (enDemo) registrarEvento('datos_ejemplo')
  }, [enDemo])

  const empezarConMisDatos = useCallback(() => {
    if (forzarEjemplo) {
      setForzarEjemplo(false)
      setEjemploPorTour(false)
      setTourAbierto(false)
      setPestana('dashboard')
      toast('De vuelta a tus datos')
      return
    }
    guardarMarca(`palanca_demo_fuera_${usuarioId}`)
    setDemoDescartada(true)
    setTourAbierto(false)
    setFiltroMov(null)
    setPestana('dashboard')
    toast('¡Vamos! Empieza apuntando tu primer ingreso y tu primer gasto.')
  }, [usuarioId, forzarEjemplo])

  const abrirDemoAvanzada = useCallback(() => {
    if (!enDemo) {
      setForzarEjemplo(true)
      setEjemploPorTour(true)
    }
    setTourAbierto('avanzado')
  }, [enDemo])

  const cerrarTour = useCallback(() => {
    setTourAbierto(false)
    setPestana('dashboard')
    if (ejemploPorTour) {
      setEjemploPorTour(false)
      setForzarEjemplo(false)
      toast('De vuelta a tus datos')
    }
  }, [ejemploPorTour])

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
    // Bucle en vez de Math.max(...array): con decenas de miles de movimientos
    // el spread desborda la pila.
    let ultimoRegistro = -Infinity
    let primeraFecha = Infinity
    for (const m of movimientos) {
      const r = new Date(m.created_at).getTime()
      const f = new Date(m.fecha).getTime()
      if (r > ultimoRegistro) ultimoRegistro = r
      if (f < primeraFecha) primeraFecha = f
    }
    return {
      diasDesdeUltimoMovimiento: Math.floor((ahora - ultimoRegistro) / MS_POR_DIA),
      diasConHistorial: Math.floor((ahora - primeraFecha) / MS_POR_DIA),
    }
  }, [movimientos])

  // App es el dueño ÚNICO de presupuesto y objetivos: los instancia una vez y
  // los reparte por contexto (DatosCompartidosProvider). Evita que 3+3
  // componentes los pidan por su cuenta y mantiene una sola fuente fresca.
  const presupuestoData = usePresupuesto(usuarioId)
  // Compromiso a abrir al llegar a Fijos (confirmar uno de importe variable).
  const [abrirFijoId, setAbrirFijoId] = useState(null)

  // Confirmar un cobro desde los avisos del inicio, en su día y a un toque.
  // Los de importe variable se abren en Fijos para poner el importe real.
  const confirmarDesdeInicio = useCallback(
    async (recId) => {
      const rec = recurrentes.find((r) => r.id === recId)
      if (!rec) return
      if (rec.confirmar) {
        setFiltroMov(null)
        setAbrirFijoId(recId)
        setPestana('suscripciones')
        return
      }
      const fila = await confirmarCobro(rec)
      if (!fila) return
      onGuardado({ accion: 'crear', filas: [fila] })
      toast(`${rec.nombre} confirmado`, 'ok', {
        texto: 'Deshacer',
        onAccion: async () => {
          const movId = await desmarcarCobro(rec.id)
          if (movId) onGuardado({ accion: 'borrar', ids: [movId] })
        },
      })
    },
    [recurrentes, confirmarCobro, desmarcarCobro, onGuardado],
  )
  const objetivosData = useObjetivosAhorro(usuarioId)
  const { objetivoInversionMensual } = presupuestoData
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
    <DatosCompartidosProvider presupuesto={presupuestoData} objetivos={objetivosData} comercios={comerciosData}>
    <div className="app">
      <header className="app-header">
        <h1 className="app-logo">
          <Marca tam={24} />
          Palanca
        </h1>
        <button
          type="button"
          className="app-cuenta app-ojo"
          onClick={alternarOcultos}
          aria-pressed={ocultos}
          aria-label={ocultos ? 'Mostrar importes' : 'Ocultar importes'}
          title={ocultos ? 'Mostrar importes' : 'Ocultar importes'}
        >
          <Icono nombre={ocultos ? 'ojoOculto' : 'ojo'} tam={18} />
        </button>
        <button
          className="app-cuenta"
          onClick={() => setVerCuenta(true)}
          aria-label={`Tu cuenta${session?.user?.email ? ` (${session.user.email})` : ''}`}
          title={session?.user?.email ?? 'Tu cuenta'}
        >
          <Icono nombre="cuenta" tam={18} />
        </button>
      </header>

      <main key={ocultos ? 'ocultos' : 'visibles'}>
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
            <div className="saludo">
              <p className="saludo-usuario">{perfil.nombre?.trim() ? `Hola, ${nombrePropio(perfil.nombre).split(' ')[0]}` : 'Hola'}</p>
              <p className="saludo-fecha">{capitalizar(FMT_HOY.format(new Date()))}</p>
            </div>
            {/* Primera carga (sin datos aún): skeleton en vez de dashboard vacío.
                En refetch (ya hay movimientos) NO se muestra, para no parpadear. */}
            {cargando && movimientos.length === 0 && <DashboardSkeleton />}
            {enDemo && (
              <div className="demo-banner fade-in-up">
                <div className="demo-banner-texto">
                  <strong>Estás viendo datos de ejemplo</strong>
                  <span>
                    {forzarEjemplo
                      ? 'Tus datos siguen guardados; aquí no se ve nada tuyo.'
                      : 'Así se ve Palanca tras unos meses de uso. Nada de esto es tuyo.'}
                  </span>
                </div>
                <div className="demo-banner-acc">
                  <button type="button" className="demo-banner-tour" onClick={() => setTourAbierto('rapido')}>
                    Ver demo
                  </button>
                  <button type="button" className="demo-banner-empezar" onClick={empezarConMisDatos}>
                    {forzarEjemplo ? 'Volver a mis datos' : 'Empezar con mis datos'}
                  </button>
                </div>
              </div>
            )}
            {!cargando && !enDemo && (
              <PrimerosPasos
                nombre={nombrePropio(perfil.nombre)}
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
            {/* Sin ningún movimiento, el inicio solo muestra el arranque guiado
                (nada de muros de ceros). Con datos: Resumen (lo esencial) o
                Análisis (gráficos y detalle por periodo). */}
            {movimientos.length > 0 && (
              <>
                <div className="sub-tabs ini-vistas" role="tablist" aria-label="Vista del inicio">
                  <button type="button" role="tab" aria-selected={vistaInicio === 'resumen'} className={vistaInicio === 'resumen' ? 'activo' : ''} onClick={() => setVistaInicio('resumen')}>
                    Resumen
                  </button>
                  <button type="button" role="tab" aria-selected={vistaInicio === 'analisis'} className={vistaInicio === 'analisis' ? 'activo' : ''} onClick={() => setVistaInicio('analisis')}>
                    Análisis
                  </button>
                </div>

                {vistaInicio === 'resumen' && (
                  <Inicio
                    usuarioId={usuarioId}
                    movimientos={movimientos}
                    recurrentes={recurrentes}
                    cargandoRecurrentes={cargandoRecurrentes}
                    diasSinRegistrar={diasDesdeUltimoMovimiento}
                    soloLectura={enDemo}
                    onGuardado={onGuardado}
                    onRegistrar={irARegistrar}
                    onConfirmarCobro={confirmarDesdeInicio}
                    onIrA={irAPestana}
                    onVerAnalisis={() => {
                      setVistaInicio('analisis')
                      document.querySelector('main')?.scrollTo?.({ top: 0 })
                      window.scrollTo?.({ top: 0 })
                    }}
                  />
                )}

                {vistaInicio === 'analisis' && (
                  <>
                    <PeriodoSelector meses={mesesRango} valor={mesActivoDash} onCambiar={setMesDashboard} />
                    <MetricasPrincipales
                      usuarioId={usuarioId}
                      movimientos={movimientosPeriodo}
                      historico={movimientos}
                      etiquetaPeriodo={esMesActual ? 'este mes' : etiquetaMes(mesActivoDash, { month: 'long' })}
                      esMesActual={esMesActual}
                      onVerMovimientos={verMovimientos}
                    />
                    <GraficoCategorias
                      movimientos={movimientosPeriodo}
                      etiqueta={esMesActual ? 'este mes' : etiquetaMes(mesActivoDash, { month: 'long' })}
                    />
                    <GraficoTasaAhorro movimientos={movimientos} mesFin={mesActivoDash} />
                    <GraficoEvolucion movimientos={movimientos} mesFin={mesActivoDash} />
                    <Comparativas movimientos={movimientos} />
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
                    {!enDemo && <Logros usuarioId={usuarioId} movimientos={movimientos} movimientosMes={movimientosMes} />}
                  </>
                )}
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
            onGuardado={onGuardado}
            filtro={filtroMov}
            onLimpiarFiltro={() => setFiltroMov(null)}
            modoInicialRegistro={modoRegistro}
            movimientosReales={movimientosReales}
            recurrentes={recurrentesConciliados}
            onIrA={irAPestana}
          />
        )}

        {pestana === 'suscripciones' && (
          <Recurrentes
            key="suscripciones"
            usuarioId={usuarioId}
            movimientos={movimientosReales}
            itemsDemo={enDemo ? demo.recurrentes : null}
            onRegistrado={onGuardado}
            abrirId={abrirFijoId}
            onAbierto={() => setAbrirFijoId(null)}
          />
        )}

        {(pestana === 'presupuesto' || pestana === 'simulador') && (
          <div className="sub-tabs ini-vistas plan-vistas" role="tablist" aria-label="Plan">
            <button type="button" role="tab" aria-selected={pestana === 'presupuesto'} className={pestana === 'presupuesto' ? 'activo' : ''} onClick={() => setPestana('presupuesto')}>
              Presupuesto
            </button>
            <button type="button" role="tab" aria-selected={pestana === 'simulador'} className={pestana === 'simulador' ? 'activo' : ''} onClick={() => setPestana('simulador')}>
              Simuladores
            </button>
          </div>
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
            onGuardado={onGuardado}
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

      <BottomNav activa={pestana} onCambiar={irAPestana} avisos={{ suscripciones: nPendientesFijos }} />
      <Toaster />
      <Confirmador />
      {verCuenta && (
        <CuentaPanel
          email={session?.user?.email ?? ''}
          perfil={perfil}
          usuarioId={usuarioId}
          onPerfilActualizado={(p) => setPerfil(p)}
          onVerDemo={() => {
            setVerCuenta(false)
            setTourAbierto('rapido')
          }}
          onVerDemoAvanzada={() => {
            setVerCuenta(false)
            abrirDemoAvanzada()
          }}
          verEjemplo={enDemo}
          onVerEjemplo={() => {
            setVerCuenta(false)
            if (forzarEjemplo) return empezarConMisDatos()
            setForzarEjemplo(true)
            setPestana('dashboard')
          }}
          onCerrar={() => setVerCuenta(false)}
          onCerrarSesion={() => {
            setVerCuenta(false)
            cerrarSesionConLimpieza()
          }}
        />
      )}
      {/* Solo con los datos ya cargados: la primera pasada fija la base (no
          celebra lo que ya había, como el saldo inicial). */}
      {!enDemo && !cargando && <Hitos usuarioId={usuarioId} movimientos={movimientos} movimientosMes={movimientosMes} />}
      {tourAbierto && (
        <TourRapido
          key={tourAbierto}
          nivel={tourAbierto}
          enDemo={enDemo}
          volverAMisDatos={ejemploPorTour || forzarEjemplo}
          onIrA={irAPestana}
          onTerminar={cerrarTour}
          onEmpezarConMisDatos={empezarConMisDatos}
          onAvanzada={abrirDemoAvanzada}
        />
      )}
      <Suspense fallback={null}>
        <Consultor movimientos={movimientos} recurrentes={recurrentes} ejemplo={enDemo} objetivo={{ texto: perfil.objetivo, usuarioId }} />
      </Suspense>
    </div>
    </DatosCompartidosProvider>
  )
}

export default App
