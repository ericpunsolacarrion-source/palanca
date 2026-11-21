import { useEffect, useState } from 'react'
import { detallesAutorizacion, olvidarAutorizacion, responderAutorizacion } from '../lib/oauthClaude'
import { Marca } from './Icono'

// «¿Permitir que Claude use tu Palanca?» — pantalla de consentimiento del
// conector (OAuth). Solo con sesión iniciada. Al aceptar, Supabase emite un
// token para ESTE usuario y Claude vuelve a su chat; nunca ve la contraseña.
export default function ConsentimientoClaude({ authorizationId, email, onSalir }) {
  const [detalles, setDetalles] = useState(null)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let activo = true
    detallesAutorizacion(authorizationId)
      .then((d) => {
        if (!activo) return
        // Ya había dado permiso antes: vuelve directo a Claude.
        if (d?.redirect_url && !d.authorization_id) {
          olvidarAutorizacion()
          window.location.assign(d.redirect_url)
          return
        }
        setDetalles(d)
      })
      .catch(() => activo && setError('Esta solicitud ha caducado o no es válida. Vuelve a Claude y conecta Palanca otra vez.'))
    return () => {
      activo = false
    }
  }, [authorizationId])

  async function responder(permitir) {
    setEnviando(true)
    setError(null)
    try {
      const destino = await responderAutorizacion(authorizationId, permitir)
      olvidarAutorizacion()
      if (destino) window.location.assign(destino)
      else onSalir?.()
    } catch {
      setEnviando(false)
      setError('No se ha podido completar. Vuelve a Claude y conecta Palanca otra vez.')
    }
  }

  const app = detalles?.client?.name || detalles?.client?.client_name || 'Claude'
  return (
    <div className="acceso">
      <div className="acceso-caja fade-in-up consentimiento" data-testid="consentimiento-claude">
        <span className="acceso-marca"><Marca /></span>
        <h2 className="acceso-titulo">¿Conectar {app} con tu Palanca?</h2>
        {!detalles && !error && <p className="consentimiento-texto">Cargando la solicitud…</p>}
        {detalles && (
          <>
            <p className="consentimiento-texto">
              <strong>{app}</strong> podrá usar tu cuenta de Palanca{email ? <> (<strong>{email}</strong>)</> : null} para:
            </p>
            <ul className="consentimiento-lista">
              <li>Ver tus movimientos, categorías y tu resumen (patrimonio, gastos, inversión).</li>
              <li>Importar movimientos, cuadrar tu saldo y borrar o deshacer importaciones, <strong>siempre enseñándote antes lo que va a hacer</strong>.</li>
            </ul>
            <p className="consentimiento-nota">
              Solo tus datos: nunca los de otra persona, y {app} no ve tu contraseña. Lo que compartas con {app} se rige también por sus
              condiciones. Puedes quitar el acceso cuando quieras desde los conectores de {app}.
            </p>
            <div className="consentimiento-acc">
              <button type="button" className="acceso-boton" disabled={enviando} onClick={() => responder(true)}>
                {enviando ? 'Un momento…' : 'Permitir'}
              </button>
              <button type="button" className="link" disabled={enviando} onClick={() => responder(false)}>No permitir</button>
            </div>
          </>
        )}
        {error && (
          <>
            <p className="error">{error}</p>
            <button type="button" className="link" onClick={() => { olvidarAutorizacion(); onSalir?.() }}>Ir a Palanca</button>
          </>
        )}
      </div>
    </div>
  )
}
