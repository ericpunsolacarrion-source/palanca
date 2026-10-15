// FRASES para recordatorios (app y email). ESTADO: NO SE USAN. A Eric no le
// convencen: pendiente diseñar o elegir otras (docs/PENDIENTES.md). Se activan
// con CON_FRASE en recordatorios.js. Regla: SOLO citas con fuente comprobable:
// nada de atribuciones dudosas de internet ("Einstein dijo…"). Si se añade
// una, con su obra. Módulo puro: lo usan la app y las funciones de /api.

export const FRASES = [
  { texto: 'No es pobre el que tiene poco, sino el que mucho desea.', autor: 'Séneca', obra: 'Cartas a Lucilio' },
  { texto: 'Mientras se aplaza, la vida pasa.', autor: 'Séneca', obra: 'Cartas a Lucilio' },
  { texto: 'No es que tengamos poco tiempo, sino que perdemos mucho.', autor: 'Séneca', obra: 'Sobre la brevedad de la vida' },
  { texto: 'Ningún viento es favorable para quien no sabe a qué puerto se dirige.', autor: 'Séneca', obra: 'Cartas a Lucilio' },
  { texto: 'Cuidado con los pequeños gastos: una pequeña vía de agua hunde un gran barco.', autor: 'Benjamin Franklin', obra: 'El camino hacia la riqueza' },
  { texto: 'Si quieres saber el valor del dinero, intenta pedirlo prestado.', autor: 'Benjamin Franklin', obra: 'El camino hacia la riqueza' },
  { texto: 'El tiempo es dinero.', autor: 'Benjamin Franklin', obra: 'Consejos a un joven comerciante' },
  { texto: 'Un viaje de mil li comienza con un solo paso.', autor: 'Lao Tse', obra: 'Tao Te King' },
  { texto: 'Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto, sino un hábito.', autor: 'Will Durant', obra: 'resumiendo a Aristóteles en Historia de la filosofía' },
  { texto: 'Ser rico consiste más en usar que en poseer.', autor: 'Aristóteles', obra: 'Retórica' },
  { texto: 'No son las cosas las que nos perturban, sino las opiniones que tenemos sobre ellas.', autor: 'Epicteto', obra: 'Enquiridión' },
  { texto: 'No vivas como si fueras a vivir diez mil años.', autor: 'Marco Aurelio', obra: 'Meditaciones' },
  { texto: 'Caminante, no hay camino, se hace camino al andar.', autor: 'Antonio Machado', obra: 'Campos de Castilla' },
  {
    texto: 'Ingresos anuales, veinte libras; gastos anuales, diecinueve libras con diecinueve chelines y seis peniques: resultado, felicidad. Ingresos anuales, veinte libras; gastos anuales, veinte libras y seis peniques: resultado, miseria.',
    autor: 'Charles Dickens',
    obra: 'David Copperfield',
  },
  { texto: 'Grano a grano, llena la gallina el buche.', autor: 'Refrán español', obra: null },
  { texto: 'Quien guarda, halla.', autor: 'Refrán español', obra: null },
]

// Misma frase todo el día para la misma persona; cambia cada día y entre
// personas (no todos reciben la misma a la vez).
export function fraseDelDia(semilla = '', fechaIso = new Date().toISOString().slice(0, 10)) {
  let h = 2166136261
  for (const c of `${semilla}|${fechaIso}`) {
    h ^= c.codePointAt(0)
    h = Math.imul(h, 16777619)
  }
  return FRASES[(h >>> 0) % FRASES.length]
}

export const firmaDe = (f) => (f.obra ? `${f.autor}, ${f.obra}` : f.autor)
