import { createPortal } from 'react-dom'
import { EMAIL_CONTACTO } from '../lib/contacto'

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
          <p className="ayuda-mini">Última actualización: noviembre de 2026.</p>

          <h3>Responsable del tratamiento</h3>
          <p>
            Eric Punsola Carrión. Contacto para cualquier cuestión sobre tus datos o para ejercer
            tus derechos: <a href={`mailto:${EMAIL_CONTACTO}`}><strong>{EMAIL_CONTACTO}</strong></a>.
          </p>

          <h3>Qué datos recogemos</h3>
          <ul>
            <li>Tu <strong>email</strong> (para iniciar sesión y recuperar la cuenta).</li>
            <li>Tu <strong>año de nacimiento</strong> (para adaptar contenidos; guardamos el año, no la fecha).</li>
            <li>
              Los <strong>datos financieros que tú introduces</strong>: movimientos (ingresos, gastos,
              inversiones), categorías, presupuestos, objetivos y planificaciones.
            </li>
            <li>
              <strong>Datos de uso</strong>: qué acciones usas y cuándo (por ejemplo, "abrió la app" o
              "importó un extracto"). Nunca importes, conceptos ni textos. Puedes desactivarlo en{' '}
              <em>Tu cuenta → Ayudar a mejorar Palanca</em>.
            </li>
          </ul>

          <h3>Para qué los usamos</h3>
          <p>
            Únicamente para prestarte el servicio de organización de tus finanzas personales dentro de
            Palanca y, con los datos de uso, para saber qué funciona y mejorar la app (estadísticas
            internas, sin herramientas de terceros). No vendemos tus datos ni los cedemos a terceros
            con fines publicitarios.
          </p>

          <h3>Base legal</h3>
          <p>
            Tu consentimiento, que das al registrarte y que puedes retirar en cualquier momento borrando tu
            cuenta. Los datos de uso se basan en nuestro interés legítimo en mejorar el servicio; puedes
            oponerte desactivándolos en Tu cuenta.
          </p>

          <h3>Dónde se guardan (encargados del tratamiento)</h3>
          <p>
            Los datos se almacenan en <strong>Supabase</strong> (infraestructura en la Unión Europea,
            región de Irlanda) y la aplicación se sirve a través de <strong>Vercel</strong>. El asistente
            "Fulcro" solo recibe <strong>resúmenes agregados y anónimos</strong>, nunca tus movimientos en
            bruto. Si eliges <strong>importar con capturas de pantalla</strong>, esas imágenes se envían a{' '}
            <strong>Anthropic</strong> (proveedor de la IA, con sede en EE. UU. y garantías contractuales
            para transferencias internacionales) solo para leer los movimientos; no las guardamos.
          </p>

          <h3>Si conectas tu asistente de IA (por ejemplo, Claude)</h3>
          <p>
            Es opcional y lo decides tú. Si conectas tu asistente con Palanca y le das permiso, Palanca le
            entregará <strong>tus</strong> datos (movimientos, categorías y resúmenes) cuando tú se lo pidas en
            su chat, y hará los cambios que tú confirmes (por ejemplo, importar movimientos o cuadrar tu saldo).
            El asistente nunca recibe tu contraseña y solo accede a tu cuenta. Lo que compartas con él lo trata
            su proveedor (por ejemplo, Anthropic) según sus propias condiciones: es un servicio que eliges tú,
            no un encargado de Palanca. Puedes retirar el acceso cuando quieras desde la configuración de
            conectores de tu asistente.
          </p>

          <h3>Recordatorios por email</h3>
          <p>
            Como tienes cuenta en Palanca, podemos escribirte de vez en cuando sobre tu uso del servicio (por
            ejemplo, si llevas unos días sin apuntar nada): como mucho uno cada 3 días y sin datos financieros.
            Cada email incluye un enlace para darte de baja en un clic, y también puedes desactivarlos en{' '}
            <em>Tu cuenta → Recordatorios por email</em>. Los envía <strong>Resend</strong> (encargado del
            tratamiento, con garantías contractuales para transferencias internacionales).
          </p>

          <h3>Cuánto tiempo los conservamos</h3>
          <p>
            Mientras tu cuenta esté activa. Si borras tu cuenta, se eliminan tus datos de forma permanente.
          </p>

          <h3>Tus derechos</h3>
          <p>
            Puedes acceder, rectificar, <strong>descargar</strong> y <strong>suprimir</strong> tus datos. Desde
            Tu cuenta puedes descargarlos (CSV o JSON completo) y eliminar tu cuenta con todos tus datos
            en cualquier momento. También puedes reclamar ante la Agencia Española de Protección de
            Datos (aepd.es). Para cualquier otra solicitud,
            escríbenos al email de contacto.
          </p>
        </div>
      </section>
    </div>,
    document.body,
  )
}
