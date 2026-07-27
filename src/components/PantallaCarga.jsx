// Splash de arranque: se muestra mientras se comprueba la sesión y el perfil,
// para no dejar la pantalla en negro en el cold load. Sobrio, con la marca y un
// indicador de progreso indeterminado. La animación la neutraliza el bloque
// global de prefers-reduced-motion (index.css).
export default function PantallaCarga() {
  return (
    <div className="pantalla-carga" role="status" aria-live="polite" aria-label="Cargando Palanca">
      <span className="pantalla-carga-logo">Palanca</span>
      <span className="pantalla-carga-barra" aria-hidden="true">
        <span className="pantalla-carga-barra-fill" />
      </span>
    </div>
  )
}
