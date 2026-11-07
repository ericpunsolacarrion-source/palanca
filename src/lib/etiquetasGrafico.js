// Colocación de etiquetas externas de un gráfico sin solapes (pura, testeable).
// items: [{ id, x, ancho, prioridad }] — x es el centro deseado (px).
// Coloca primero las de más prioridad; cada una busca el hueco libre más
// cercano a su x (desplazándose como mucho `maxDesplazamiento`) dentro de
// [min, max]. Si no cabe, se omite (su marcador sigue en el gráfico).
// Devuelve [{ id, x (centro final), izq, der }] ordenado por x.
export function colocarEtiquetas(items, { min, max, separacion = 6, maxDesplazamiento = 90, paso = 4 } = {}) {
  const puestas = []
  const libre = (izq, der) => izq >= min && der <= max && puestas.every((p) => der + separacion <= p.izq || izq >= p.der + separacion)
  for (const it of [...items].sort((a, b) => b.prioridad - a.prioridad || a.x - b.x)) {
    const medio = it.ancho / 2
    for (let d = 0; d <= maxDesplazamiento; d += paso) {
      const opciones = d === 0 ? [it.x] : [it.x - d, it.x + d]
      const ok = opciones.find((c) => libre(c - medio, c + medio))
      if (ok !== undefined) {
        puestas.push({ id: it.id, x: ok, izq: ok - medio, der: ok + medio })
        break
      }
      // Pegada al borde si su x cae fuera.
      const c = Math.min(Math.max(it.x, min + medio), max - medio)
      if (d === 0 && c !== it.x && libre(c - medio, c + medio)) {
        puestas.push({ id: it.id, x: c, izq: c - medio, der: c + medio })
        break
      }
    }
  }
  return puestas.sort((a, b) => a.x - b.x)
}
