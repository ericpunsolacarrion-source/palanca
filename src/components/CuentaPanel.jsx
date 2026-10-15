import { lazy, Suspense, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { borrarCuenta } from '../lib/auth'
import { actualizarPerfil } from '../lib/perfil'
import { toast } from '../lib/toast'
import { confirmar } from '../lib/confirmar'
import { supabase } from '../lib/supabaseClient'
import { exportarMovimientosCsv, exportarTodo } from '../lib/exportarDatos'
import { iniciarAnalitica, registrarEvento } from '../lib/analitica'

const PanelMetricas = lazy(() => import('./PanelMetricas'))

// Panel de cuenta (usuarios de Auth): editar nombre y año de nacimiento, ver
// email, descargar tus datos, estadísticas de uso, cerrar sesión y borrar la
// cuenta con todos sus datos (supresión). Al administrador, sus métricas.
export default function CuentaPanel({ email, perfil, usuarioId, onPerfilActualizado, onCerrar, onCerrarSesion, onVerDemo, verEjemplo = false, onVerEjemplo }) {
  const [nombre, setNombre] = useState(perfil?.nombre ?? '')
  const [anio, setAnio] = useState(perfil?.anio_nacimiento ? String(perfil.anio_nacimiento) : '')
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [exportando, setExportando] = useState(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [verMetricas, setVerMetricas] = useState(false)
  const [analitica, setAnalitica] = useState(perfil?.analitica !== false)
  const [recordatorios, setRecordatorios] = useState(perfil?.recordatorios !== false)

  useEffect(() => {
    let vivo = true
    supabase.rpc('soy_admin').then(
      ({ data }) => vivo && setEsAdmin(data === true),
      () => {},
    )
    return () => {
      vivo = false
    }
  }, [])

  async function handleExportar(tipo) {
    setExportando(tipo)
    try {
      const n = tipo === 'csv' ? await exportarMovimientosCsv(usuarioId) : await exportarTodo(usuarioId, email)
      registrarEvento('exportacion')
      toast(tipo === 'csv' ? `Descargados ${n} movimientos` : 'Descargados todos tus datos')
    } catch {
      toast('No se ha podido descargar. Inténtalo de nuevo.', 'error')
    } finally {
      setExportando(null)
    }
  }

  async function handleRecordatorios(valor) {
    setRecordatorios(valor)
    const actualizado = await actualizarPerfil(usuarioId, { recordatorios: valor })
    if (actualizado && 'recordatorios' in actualizado) {
      onPerfilActualizado?.(actualizado)
      toast(valor ? 'Recordatorios activados' : 'No te enviaremos más recordatorios')
    } else {
      setRecordatorios(!valor)
      toast('No se ha podido guardar. Inténtalo de nuevo.', 'error')
    }
  }

  async function handleAnalitica(valor) {
    setAnalitica(valor)
    const actualizado = await actualizarPerfil(usuarioId, { analitica: valor })
    if (actualizado && 'analitica' in actualizado) {
      onPerfilActualizado?.(actualizado)
      iniciarAnalitica({ usuarioId, permitida: valor })
    } else {
      setAnalitica(!valor)
      toast('No se ha podido guardar. Inténtalo de nuevo.', 'error')
    }
  }

  const cambiado =
    (nombre.trim() || null) !== (perfil?.nombre ?? null) ||
    (/^\d{4}$/.test(anio) ? Number(anio) : null) !== (perfil?.anio_nacimiento ?? null)

  async function handleGuardar() {
    setGuardando(true)
    const campos = {
      nombre: nombre.trim() || null,
      anio_nacimiento: /^\d{4}$/.test(anio) ? Number(anio) : null,
    }
    const actualizado = await actualizarPerfil(usuarioId, campos)
    setGuardando(false)
    if (actualizado) {
      onPerfilActualizado?.(actualizado)
      toast('Perfil actualizado')
    } else {
      toast('No se ha podido guardar. Inténtalo de nuevo.', 'error')
    }
  }

  async function handleBorrar() {
    const seguro = await confirmar(
      'Esto borrará tu cuenta y TODOS tus datos (movimientos, inversiones, objetivos…) de forma permanente e irreversible. ¿Continuar?',
    )
    if (!seguro) return
    setBorrando(true)
    const { ok } = await borrarCuenta()
    setBorrando(false)
    if (ok) {
      toast('Cuenta y datos eliminados')
      onCerrar()
    } else {
      toast('No se ha podido borrar la cuenta. Inténtalo de nuevo.', 'error')
    }
  }

  return createPortal(
    <div className="cuenta-overlay" onClick={onCerrar}>
      <section
        className="cuenta-caja"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Tu cuenta"
      >
        <header className="cuenta-cab">
          <h2>Tu cuenta</h2>
          <button type="button" className="consultor-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </header>

        <p className="cuenta-email">
          Sesión iniciada como <strong>{email}</strong>
        </p>

        <div className="cuenta-form">
          <label htmlFor="cuenta-nombre">Nombre</label>
          <input
            id="cuenta-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="ej. Eric"
          />

          <label htmlFor="cuenta-anio">Año de nacimiento</label>
          <input
            id="cuenta-anio"
            type="number"
            inputMode="numeric"
            min="1900"
            max="2025"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            placeholder="ej. 1998"
          />

          <button
            type="button"
            className="cuenta-boton cuenta-guardar"
            onClick={handleGuardar}
            disabled={guardando || !cambiado}
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>

        {onVerDemo && (
          <button type="button" className="cuenta-boton" onClick={onVerDemo}>
            Ver la demo rápida
          </button>
        )}
        {onVerEjemplo && (
          <button type="button" className="cuenta-boton" onClick={onVerEjemplo}>
            {verEjemplo ? 'Volver a mis datos' : 'Ver la app con datos de ejemplo'}
          </button>
        )}
        <div className="cuenta-datos">
          <span className="cuenta-seccion">Tus datos</span>
          <p className="ayuda-mini">Son tuyos: descárgalos cuando quieras. El CSV se abre en Excel y Palanca lo vuelve a importar.</p>
          <div className="cuenta-datos-botones">
            <button type="button" className="cuenta-boton" onClick={() => handleExportar('csv')} disabled={exportando !== null}>
              {exportando === 'csv' ? 'Preparando…' : 'Movimientos (CSV)'}
            </button>
            <button type="button" className="cuenta-boton" onClick={() => handleExportar('json')} disabled={exportando !== null}>
              {exportando === 'json' ? 'Preparando…' : 'Todo (JSON)'}
            </button>
          </div>
          {perfil && 'recordatorios' in perfil && (
            <label className="cuenta-interruptor">
              <input type="checkbox" checked={recordatorios} onChange={(e) => handleRecordatorios(e.target.checked)} />
              <span>
                <strong>Recordatorios por email</strong>
                <span className="ayuda-mini">Un aviso si llevas unos días sin apuntar nada, con una frase para animarte. Pocos: como mucho uno cada 3 días.</span>
              </span>
            </label>
          )}
          {perfil && 'analitica' in perfil && (
            <label className="cuenta-interruptor">
              <input type="checkbox" checked={analitica} onChange={(e) => handleAnalitica(e.target.checked)} />
              <span>
                <strong>Ayudar a mejorar Palanca</strong>
                <span className="ayuda-mini">Guardamos qué acciones usas y cuándo (por ejemplo, "importó un extracto"). Nunca importes ni conceptos.</span>
              </span>
            </label>
          )}
        </div>

        {esAdmin && (
          <button type="button" className="cuenta-boton cuenta-admin" onClick={() => setVerMetricas(true)}>
            Métricas de Palanca (admin)
          </button>
        )}

        <button type="button" className="cuenta-boton" onClick={onCerrarSesion}>
          Cerrar sesión
        </button>

        <div className="cuenta-peligro">
          <span className="cuenta-peligro-titulo">Zona peligrosa</span>
          <p className="ayuda-mini">
            Borrar tu cuenta elimina de forma permanente todos tus datos. No se puede deshacer.
          </p>
          <button type="button" className="cuenta-borrar" onClick={handleBorrar} disabled={borrando}>
            {borrando ? 'Borrando…' : 'Borrar mi cuenta y todos mis datos'}
          </button>
        </div>
      </section>
      {verMetricas && (
        <Suspense fallback={null}>
          <PanelMetricas onCerrar={() => setVerMetricas(false)} />
        </Suspense>
      )}
    </div>,
    document.body,
  )
}
