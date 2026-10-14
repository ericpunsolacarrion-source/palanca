// Set de iconos propio de Palanca: rejilla de 24 px, trazo 1,6, terminaciones
// redondeadas, sin rellenos (salvo la marca). Un solo lenguaje visual en toda
// la app; heredan el color del texto (currentColor). Ver docs/DISENO.md.

const TRAZOS = {
  inicio: 'M4 10.2 12 4l8 6.2V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
  movimientos: 'M7.5 4v15.5M7.5 4 4.5 7M7.5 4l3 3M16.5 20V4.5M16.5 20l-3-3M16.5 20l3-3',
  fijos: 'M16.5 3.5 19.5 6.5l-3 3M4.5 11.5v-1a4 4 0 0 1 4-4h11M7.5 20.5l-3-3 3-3M19.5 12.5v1a4 4 0 0 1-4 4h-11',
  presupuesto: 'M4 17.5a8 8 0 1 1 16 0M12 17.5l3.6-4.6M3.5 17.5h17',
  inversion: 'M3.5 17 9 11.5l4 4L20.5 8M15 8h5.5v5.5',
  simulador: 'M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1M15 5v4M9 10v4M17 15v4',
  cuenta: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20c.8-3.4 3.7-5.5 7.5-5.5s6.7 2.1 7.5 5.5',
  cerrar: 'M6 6l12 12M18 6 6 18',
  consultor: 'M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-7.5L7 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5ZM8 10.5h.01M12 10.5h.01M16 10.5h.01',
}

export default function Icono({ nombre, tam = 22, className = '', ...resto }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tam}
      height={tam}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icono ${className}`}
      aria-hidden="true"
      {...resto}
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  )
}

// Marca: una palanca (barra inclinada) sobre su fulcro (triángulo). El fulcro
// solo, sin barra, es el icono de "Fulcro", el consultor: misma familia.
export function Marca({ tam = 22, soloFulcro = false, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} className={`marca ${className}`} aria-hidden="true">
      {!soloFulcro && (
        <path d="M2.5 16 21.5 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      )}
      <path
        d={soloFulcro ? 'M12 6.5 18.5 18h-13Z' : 'M11 13.3 15 20.2H7Z'}
        fill="var(--accent-2)"
        stroke="var(--accent-2)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
