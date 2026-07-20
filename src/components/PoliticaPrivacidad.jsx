import { createPortal } from 'react-dom'

// Política de privacidad básica. Versión inicial pensada para una beta cerrada;
// conviene que un profesional la revise antes de abrir al público.
export default function PoliticaPrivacidad({ onCerrar }) {
  return createPortal(
    <div className="privacidad-overlay" onClick={onCerrar}>
      <section
        className="privacidad-caja"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Política de privacidad"
      >
        <header className="privacidad-cab">
          <h2>Política de privacidad</h2>
          <button type="button" className="consultor-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className="privacidad-cuerpo">
          <p className="ayuda-mini">Última actualización: julio de 2026.</p>

          <h3>Responsable del tratamiento</h3>
          <p>
            Eric Punsola Carrión. Contacto para cualquier cuestión sobre tus datos o para ejercer
            tus derechos: <strong>ericpunsolacarrion@gmail.com</strong>.
          </p>

          <h3>Qué datos recogemos</h3>
          <ul>
            <li>Tu <strong>email</strong> (para iniciar sesión y recuperar la cuenta).</li>
            <li>Tu <strong>año de nacimiento</strong> (para adaptar contenidos; guardamos el año, no la fecha).</li>
            <li>
              Los <strong>datos financieros que tú introduces</strong>: movimientos (ingresos, gastos,
              inversiones), categorías, presupuestos, objetivos y planificaciones.
            </li>
          </ul>

          <h3>Para qué los usamos</h3>
          <p>
            Únicamente para prestarte el servicio de organización de tus finanzas personales dentro de
            Palanca. No vendemos tus datos ni los cedemos a terceros con fines publicitarios.
          </p>

          <h3>Base legal</h3>
          <p>Tu consentimiento, que das al registrarte y que puedes retirar en cualquier momento borrando tu cuenta.</p>

          <h3>Dónde se guardan (encargados del tratamiento)</h3>
          <p>
            Los datos se almacenan en <strong>Supabase</strong> (infraestructura en la Unión Europea,
            región de Irlanda) y la aplicación se sirve a través de <strong>Vercel</strong>. El asistente
            "Fulcro" solo recibe <strong>resúmenes agregados y anónimos</strong>, nunca tus movimientos en
            bruto.
          </p>

          <h3>Cuánto tiempo los conservamos</h3>
          <p>
            Mientras tu cuenta esté activa. Si borras tu cuenta, se eliminan tus datos de forma permanente.
          </p>

          <h3>Tus derechos</h3>
          <p>
            Puedes acceder, rectificar y <strong>suprimir</strong> tus datos. Desde la propia app puedes
            eliminar tu cuenta y todos tus datos en cualquier momento. Para cualquier otra solicitud,
            escríbenos al email de contacto.
          </p>
        </div>
      </section>
    </div>,
    document.body,
  )
}
