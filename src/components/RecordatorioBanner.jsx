export default function RecordatorioBanner({ dias, onIrAMovimientos }) {
  if (dias === null || dias < 2) return null

  return (
    <div className="recordatorio fade-in-up">
      <span>
        Llevas <strong>{dias} días</strong> sin registrar movimientos. ¿Ha entrado o salido
        algo de dinero?
      </span>
      <button type="button" onClick={onIrAMovimientos}>
        Registrar ahora
      </button>
    </div>
  )
}
