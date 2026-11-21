import { useEffect, useState } from 'react'
import { toast } from '../lib/toast'

export const URL_CONECTOR = 'https://palanca-zeta.vercel.app/api/mcp'

// «Conecta tu asistente de IA» (Tu cuenta): cómo añadir el conector de Palanca
// en Claude. Se enseña como «muy pronto» hasta que el servidor de inicio de
// sesión (OAuth de Supabase) está activado (/api/conector-estado).
export default function ConectaAsistente() {
  const [disponible, setDisponible] = useState(null)
  useEffect(() => {
    let activo = true
    fetch('/api/conector-estado')
      .then((r) => (r.ok ? r.json() : { disponible: false }))
      .then((d) => activo && setDisponible(Boolean(d?.disponible)))
      .catch(() => activo && setDisponible(false))
    return () => {
      activo = false
    }
  }, [])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(URL_CONECTOR)
      toast('Dirección copiada')
    } catch {
      toast('No se ha podido copiar: selecciónala a mano', 'error')
    }
  }

  return (
    <div className="cuenta-datos conecta-ia" data-testid="conecta-asistente">
      <span className="cuenta-seccion">Conecta tu asistente de IA</span>
      {disponible === false ? (
        <p className="ayuda-mini">
          <strong>Muy pronto:</strong> podrás conectar Claude con tu Palanca y pedirle desde su chat que importe tu Excel, cuadre tu saldo o te
          explique en qué se te va el dinero.
        </p>
      ) : (
        <>
          <p className="ayuda-mini">
            Conecta <strong>Claude</strong> con tu Palanca y pídele desde su chat que importe tu Excel, cuadre tu saldo o te explique en qué se te
            va el dinero. Solo verá tus datos y te enseñará antes cualquier cambio.
          </p>
          <ol className="conecta-ia-pasos">
            <li>En Claude: <em>Configuración → Conectores → Añadir conector personalizado</em>.</li>
            <li>Nombre: <strong>Palanca</strong>. Dirección:</li>
          </ol>
          <div className="conecta-ia-url">
            <code>{URL_CONECTOR}</code>
            <button type="button" className="cuenta-boton" onClick={copiar}>Copiar</button>
          </div>
          <ol className="conecta-ia-pasos" start={3}>
            <li>Pulsa <em>Conectar</em>, entra con tu cuenta de Palanca y pulsa <em>Permitir</em>.</li>
            <li>Prueba: «¿Cuál es mi patrimonio y cuánto he invertido este mes?»</li>
          </ol>
          <p className="ayuda-mini">Puedes quitar el acceso cuando quieras desde los conectores de Claude.</p>
        </>
      )}
    </div>
  )
}
