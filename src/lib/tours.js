// Recorridos guiados de Palanca. Cada paso lleva a una pestaña (y, si hace
// falta, pulsa una subpestaña), resalta una pieza de la pantalla y explica para
// qué sirve. Se ejecutan siempre sobre los DATOS DE EJEMPLO: se ve todo lleno y
// nunca se enseña el dinero de nadie.
//
// Campos de un paso:
//  pestana   pestaña de la barra inferior
//  capitulo  (solo avanzado) agrupa pasos; se puede saltar entre capítulos
//  titulo / texto
//  mas       (opcional) "hasta dónde llega": una línea extra con lo avanzado
//  clic      (opcional) { sel, texto } botón a pulsar al llegar (subpestañas)
//  resaltar  (opcional) { sel, texto } pieza a resaltar; si no, el botón de la pestaña
//  fulcro    (opcional) pregunta que se le hace a Fulcro en directo
//  arriba    (opcional) la tarjeta del recorrido va arriba (para no tapar)

export const TOUR_RAPIDO = [
  {
    pestana: 'dashboard',
    titulo: 'Tu dinero, de un vistazo',
    texto: 'Lo que tienes, cómo va el mes y lo último que ha pasado. El ojo de arriba oculta las cifras si tienes a alguien al lado.',
  },
  {
    pestana: 'movimientos',
    titulo: 'Apunta en dos toques',
    texto: 'Un gasto o un ingreso en segundos. O trae tu último año del banco (extracto o capturas) y lo ordenamos por ti.',
  },
  {
    pestana: 'suscripciones',
    titulo: 'Suscripciones y recibos, bajo control',
    texto: 'Cuánto pagas al mes y al año. El día de cada cobro te avisamos para confirmarlo, y te decimos si algo sube de precio.',
  },
  {
    pestana: 'presupuesto',
    titulo: 'Tu plan',
    texto: 'Decide cuánto quieres ahorrar y te decimos cuánto puedes gastar al día. En Simuladores: objetivos, hipoteca o cuándo podrías dejar de trabajar.',
  },
  {
    pestana: 'inversiones',
    titulo: 'Lo que inviertes, aparte',
    texto: 'Invertir no es gastar: lo separamos para que veas cuánto llevas aportado y cómo crece.',
  },
  {
    pestana: 'dashboard',
    titulo: 'Y si tienes dudas, Fulcro',
    texto: 'Tu asistente lee tus números y te responde en claro: "¿en qué se me va el dinero?", "¿llego a mi objetivo?".',
    resaltar: { sel: '.consultor-fab' },
    arriba: true,
  },
]

const SUB = (texto) => ({ sel: '.sub-tabs button', texto })
const TAB = (texto) => ({ sel: '[role="tab"], .sub-tabs button', texto })

export const TOUR_AVANZADO = [
  // 1. Inicio
  {
    capitulo: 'Inicio',
    pestana: 'dashboard',
    clic: TAB('Resumen'),
    resaltar: { sel: '.hp' },
    titulo: 'Tu patrimonio, al céntimo',
    texto: 'Lo que tienes de verdad: disponible + invertido, y cómo ha cambiado en los últimos meses.',
    mas: 'Con "Ajustar saldo" lo cuadras con tu banco en un toque (suma también tu cuenta de ahorro). Si algo no cuadra, queda un ajuste visible: nada se esconde.',
  },
  {
    capitulo: 'Inicio',
    pestana: 'dashboard',
    resaltar: { sel: '.ini-trio' },
    titulo: 'Cómo va el mes',
    texto: 'Cuánto has ahorrado, qué parte de lo que entra y en qué se te va. Los avisos te recuerdan el cobro de hoy o un seguro que renueva pronto.',
    mas: 'Invertir cuenta como ahorro, no como gasto. Traer dinero de tu cuenta de ahorro o una devolución tampoco engordan tus ingresos: las cifras dicen la verdad.',
  },
  {
    capitulo: 'Inicio',
    pestana: 'dashboard',
    clic: TAB('Análisis'),
    titulo: 'Análisis mes a mes',
    texto: 'Desliza entre meses y compara: ingresos, gasto, ahorro y en qué categorías subes o bajas respecto a lo normal.',
    mas: 'Te avisa si este mes vas gastando más de lo habitual a estas alturas, antes de que sea tarde.',
  },
  {
    capitulo: 'Inicio',
    pestana: 'dashboard',
    clic: TAB('Resumen'),
    resaltar: { sel: '.app-ojo' },
    titulo: 'Modo discreto',
    texto: 'El ojo de arriba oculta todas las cifras de todas las pantallas. Para mirar la app en el metro o enseñarla sin enseñar tu dinero.',
  },

  // 2. Movimientos
  {
    capitulo: 'Movimientos',
    pestana: 'movimientos',
    clic: SUB('Nuevo'),
    titulo: 'Apuntar sin pensar',
    texto: 'Gasto, ingreso o inversión en dos toques. Te sugiere la categoría y los importes que más repites.',
    mas: 'Crea tus "gastos rápidos" (el café, el menú del mediodía) y apúntalos con un solo toque.',
  },
  {
    capitulo: 'Movimientos',
    pestana: 'movimientos',
    clic: SUB('Historial'),
    resaltar: { sel: '.hist-buscar' },
    titulo: 'Todo tu historial, con buscador',
    texto: 'Busca por comercio, categoría o importe ("mercadona", "13,99"). Filtra ingresos, gastos o inversión.',
    mas: 'Corrige un comercio o su categoría una vez y Palanca te ofrece aplicarlo a todos sus movimientos. Lo recuerda para siempre.',
  },
  {
    capitulo: 'Movimientos',
    pestana: 'movimientos',
    clic: SUB('Importar'),
    titulo: 'Trae tu último año del banco',
    texto: 'El extracto de tu banco (Excel o CSV de BBVA, Santander, CaixaBank, ING, Revolut…) o capturas de la app. En dos minutos, un año ordenado.',
    mas: 'Agrupa por comercio aunque el banco escriba "ALIPAM23": se lo dices una vez y en el siguiente extracto sale solo como Mercadona. Y nunca duplica lo que ya tenías.',
  },
  {
    capitulo: 'Movimientos',
    pestana: 'movimientos',
    clic: SUB('Historial'),
    titulo: 'Las cuentas que no fallan',
    texto: 'Traspasos a tu ahorro y de vuelta, aportar y retirar de una inversión, devoluciones, intereses… cada cosa cuenta donde debe.',
    mas: 'Todo se calcula en céntimos exactos y con las mismas reglas en toda la app: el inicio, el análisis y Fulcro dicen siempre la misma cifra.',
  },

  // 3. Fijos
  {
    capitulo: 'Fijos',
    pestana: 'suscripciones',
    resaltar: { sel: '.tb-hero' },
    titulo: 'Lo que te cuesta vivir cada mes',
    texto: 'Suscripciones y recibos con su coste real al mes y al año (una anual de 120 € cuenta 10 €/mes), y un calendario de los próximos 30 días.',
  },
  {
    capitulo: 'Fijos',
    pestana: 'suscripciones',
    resaltar: { sel: '.cc-cab' },
    titulo: 'Cada cobro, en su día',
    texto: 'El día del cobro te pide confirmarlo con un toque. Si ya está en tus movimientos (por ejemplo, importado del banco), sale pagado solo: nunca se cuenta dos veces.',
    mas: 'Detecta cargos periódicos que no tenías apuntados y te avisa si una suscripción sube de precio.',
  },
  {
    capitulo: 'Fijos',
    pestana: 'suscripciones',
    resaltar: { sel: '.pa' },
    titulo: 'Tu plan de ahorro',
    texto: 'Qué recibos puedes negociar (luz, móvil, seguros, banco, gimnasio), cuánto podrías ahorrar y el mejor momento para hacerlo.',
    mas: 'Te prepara el guion de la llamada con tus datos y, cuando lo consigues, suma lo que ahorras al año.',
  },

  // 4. Plan
  {
    capitulo: 'Plan',
    pestana: 'presupuesto',
    clic: TAB('Presupuesto'),
    titulo: 'Tu presupuesto',
    texto: 'Elige cuánto quieres ahorrar (o un gasto máximo) y te dice cuánto te queda y cuánto puedes gastar al día hasta fin de mes.',
    mas: 'Planifica los próximos meses (una boda, unas vacaciones) y compara después el plan con lo que pasó.',
  },
  {
    capitulo: 'Plan',
    pestana: 'presupuesto',
    clic: TAB('Simuladores'),
    titulo: 'Simuladores',
    texto: 'Cuánto tardas en llegar a un objetivo, qué da el interés compuesto, cuánto pagarías de hipoteca y cuándo podrías dejar de trabajar.',
    mas: 'Empiezan con un caso ya calculado con tus números: solo tienes que mover lo que quieras probar.',
  },

  // 5. Inversión
  {
    capitulo: 'Inversión',
    pestana: 'inversiones',
    titulo: 'Tu inversión, aparte',
    texto: 'Cuánto llevas aportado, en qué plataformas y tu media al mes. Invertir no es gastar: no penaliza tu ahorro.',
    mas: 'Aporta o retira: si vendes o rescatas, el dinero vuelve a tu liquidez sin contarse como ingreso, y tu patrimonio no se infla.',
  },

  // 6. Fulcro
  {
    capitulo: 'Fulcro',
    pestana: 'dashboard',
    fulcro: '¿Cuánto he gastado en gasolina los últimos 3 meses?',
    titulo: 'Pregúntale a Fulcro',
    texto: 'Las preguntas de datos se responden al momento con tus números. Mira la respuesta aquí debajo.',
  },
  {
    capitulo: 'Fulcro',
    pestana: 'dashboard',
    resaltar: { sel: '.consultor-fab' },
    arriba: true,
    titulo: 'Y te ayuda a decidir',
    texto: 'Pregúntale lo que harías a un amigo que sabe de dinero: "¿cómo puedo ahorrar más?", "¿me compensa amortizar?", "¿llego a mi objetivo?".',
    mas: 'Fulcro ve un resumen de tus números (nunca tus movimientos uno a uno ni tus datos personales) y te responde en claro, con tu situación real.',
  },

  // 7. Tus datos
  {
    capitulo: 'Tus datos',
    pestana: 'dashboard',
    resaltar: { sel: '.app-cuenta:not(.app-ojo)' },
    titulo: 'Tus datos son tuyos',
    texto: 'Desde "Tu cuenta" descargas todo cuando quieras (CSV para Excel o JSON) y lo puedes volver a importar tal cual.',
    mas: 'Decides si recibir recordatorios y si compartir estadísticas de uso. Y si te vas, lo borras todo de verdad, en un toque.',
  },
  {
    capitulo: 'Tus datos',
    pestana: 'dashboard',
    final: true,
    titulo: 'Ya lo has visto todo',
    texto: 'Empieza con algo pequeño: apunta un gasto o trae el extracto de tu banco. Palanca hace el resto.',
  },
]

// Capítulos en orden, con el índice de su primer paso.
export function capitulosDe(pasos) {
  const res = []
  pasos.forEach((p, i) => {
    if (p.capitulo && res.at(-1)?.nombre !== p.capitulo) res.push({ nombre: p.capitulo, inicio: i })
  })
  return res
}

// Elemento de la pantalla para un { sel, texto } (texto opcional: contiene).
export function buscarElemento(obj) {
  if (!obj?.sel || typeof document === 'undefined') return null
  const todos = [...document.querySelectorAll(obj.sel)]
  return (obj.texto ? todos.find((el) => el.textContent.trim().startsWith(obj.texto)) : todos[0]) ?? null
}
