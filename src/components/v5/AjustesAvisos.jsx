import Panel from './Panel'
import Icono from '../Icono'
import { estadoNotificaciones } from '../../lib/notificaciones'

// «Recibir avisos» (v5): qué avisos hay, por dónde llegan y su estado REAL en
// este dispositivo. El permiso del navegador solo se pide al confirmar aquí.
// Nada simulado: si algo no está disponible, se dice.
const TIPOS = [
  { icono: 'fijos', titulo: 'Cobros de tus fijos', texto: 'El día que toca y el anterior, con el importe. Si ese día no aparece en tus movimientos, te pide confirmarlo.' },
  { icono: 'calendario', titulo: 'Renovaciones anuales', texto: 'Seguros, Prime y otros cobros largos, 14 días antes: a tiempo de decidir si te compensa.' },
  { icono: 'sube', titulo: 'Subidas de precio', texto: 'Cuando una suscripción te cobra más que antes, con lo que supone al año.' },
  { icono: 'baja', titulo: 'Ingresos fijos', texto: 'El día que debería entrar tu nómina u otro ingreso fijo, para confirmar que ha llegado.' },
]

export default function AjustesAvisos({ permiso, silenciado, ios, pidiendo, onActivar, onSilenciar, recordatoriosEmail = null, onAbrirCuenta, onCerrar }) {
  const e = estadoNotificaciones(permiso, silenciado, { ios })
  return (
    <Panel titulo="Avisos de Palanca" subtitulo="Qué te avisamos y por dónde" onCerrar={onCerrar} etiqueta="Ajustes de avisos">
      <div className="v5-avisos-ajustes">
        <section aria-label="Qué te avisamos">
          <h3 className="v5-avisos-h">Qué te avisamos</h3>
          <ul className="v5-avisos-tipos">
            {TIPOS.map((t) => (
              <li key={t.titulo}>
                <span className="v5-avisos-tipo-icono" aria-hidden="true">
                  <Icono nombre={t.icono} tam={16} />
                </span>
                <span>
                  <b>{t.titulo}</b>
                  <small>{t.texto}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Por dónde te llegan">
          <h3 className="v5-avisos-h">Por dónde te llegan</h3>
          <ul className="v5-avisos-canales">
            <li>
              <span>
                <b>Dentro de Palanca</b>
                <small>En la tarjeta «Avisos» de Inicio, siempre.</small>
              </span>
              <span className="v5-insignia bien">Siempre</span>
            </li>
            <li>
              <span>
                <b>Notificaciones en este dispositivo</b>
                <small>{e.explicacion}</small>
                {(e.clave === 'activas' || e.clave === 'sin-activar') && <small className="v5-tenue">Por ahora llegan cuando abres Palanca; con la app cerrada aún no (lo estamos preparando).</small>}
              </span>
              <span className={`v5-insignia ${e.tono}`} data-estado={e.clave}>
                {e.etiqueta}
              </span>
            </li>
            {recordatoriosEmail !== null && (
              <li>
                <span>
                  <b>Email</b>
                  <small>{recordatoriosEmail ? 'Recibes recordatorios por email. Se cambia en Tu cuenta.' : 'Desactivado. Puedes activarlo en Tu cuenta.'}</small>
                </span>
                {onAbrirCuenta ? (
                  <button type="button" className="v5-enlace" onClick={onAbrirCuenta}>
                    Tu cuenta
                  </button>
                ) : (
                  <span className={`v5-insignia ${recordatoriosEmail ? 'bien' : 'neutro'}`}>{recordatoriosEmail ? 'Activado' : 'Desactivado'}</span>
                )}
              </li>
            )}
          </ul>
        </section>

        <div className="v5-avisos-acciones">
          {e.accion === 'activar' && (
            <button type="button" className="v5-boton primario" onClick={onActivar} disabled={pidiendo}>
              {pidiendo ? 'Esperando tu permiso…' : 'Activar notificaciones'}
            </button>
          )}
          {e.accion === 'silenciar' && (
            <button type="button" className="v5-boton" onClick={() => onSilenciar(true)}>
              Pausar en este dispositivo
            </button>
          )}
          {e.accion === 'reanudar' && (
            <button type="button" className="v5-boton primario" onClick={() => onSilenciar(false)}>
              Reanudar notificaciones
            </button>
          )}
          <button type="button" className="v5-boton fantasma" onClick={onCerrar}>
            {e.accion === 'activar' ? 'Ahora no' : 'Cerrar'}
          </button>
        </div>
      </div>
    </Panel>
  )
}
