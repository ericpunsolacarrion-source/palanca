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
  sube: 'M7 17 17 7M9 7h8v8',
  baja: 'M7 7l10 10M17 9v8H9',
  ojo: 'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  ojoOculto: 'M3.5 3.5l17 17M10 5.8a9.7 9.7 0 0 1 2-.3c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 6.9C4 8.6 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.2-1M9.9 10a2.5 2.5 0 0 0 3.6 3.5',
  mas: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  chevron: 'M9.5 6l6 6-6 6',
  check: 'M5.5 12.5l4 4 9-9',
  calendario: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM4 10h16M8 4v4M16 4v4',
  candado: 'M7.5 11V8a4.5 4.5 0 0 1 9 0v3M5.5 11h13v9h-13zM12 14.5v2',
  importar: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14',
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

// Marca "La P que crece": dos barras ascendentes y la tercera ya es la "P" de
// Palanca (tu dinero creciendo). Geometría sobria (esquinas casi rectas,
// proporciones exactas) y ritmo de color: las barras ganan intensidad hacia la
// "P". Dentro de la app va en índigo sobre oscuro; el icono de la app es la
// misma figura en blanco sobre índigo (public/favicon.svg, pwa-*.png).
// Detalle en docs/marca/README.md.
const MARCA_SVG = {
  barras: [
    { x: 3, y: 13.5, h: 7, opacidad: 0.45 },
    { x: 8, y: 9.5, h: 11, opacidad: 0.72 },
  ],
  pAsta: { x: 13, y: 3.5, w: 3.2, h: 17 },
  pBucle: 'M14.6 3.5h2.6a4.5 4.5 0 0 1 0 9h-2.6v-3.2h2.6a1.3 1.3 0 0 0 0-2.6h-2.6Z',
}

export function Marca({ tam = 22, color = 'var(--accent-2)', className = '' }) {
  const { barras, pAsta, pBucle } = MARCA_SVG
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} className={`marca ${className}`} aria-hidden="true">
      {barras.map((b) => (
        <rect key={b.x} x={b.x} y={b.y} width="3.2" height={b.h} rx="0.6" fill={color} opacity={b.opacidad} />
      ))}
      <rect x={pAsta.x} y={pAsta.y} width={pAsta.w} height={pAsta.h} rx="0.6" fill={color} />
      <path d={pBucle} fill={color} />
    </svg>
  )
}
