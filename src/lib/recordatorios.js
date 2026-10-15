// RECORDATORIOS POR EMAIL: a quién escribir, cuándo y qué decir. Lógica pura
// (sin red): la usa la función programada api/recordatorios.js y los tests.
// Los datos de cada persona vienen de recordatorios_candidatos() (SQL).
//
// Principios (producto y LSSI):
// - Pocos y útiles: como máximo 1 email cada 3 días, y como mucho 2 por cada
//   racha sin entrar (a los 3-6 días y a los 14-21). Después, silencio.
// - Sin importes ni datos financieros en el email (puede leerlo cualquiera).
// - Cada email lleva el remitente identificado y la baja en un clic.
// - Frases motivadoras: APAGADAS (CON_FRASE) hasta rediseñarlas (docs/PENDIENTES.md).
// - Frecuencia y reglas: PROVISIONALES, pendientes de decidir con Eric.
import { fraseDelDia, firmaDe } from './frases.js'

export const CON_FRASE = false

export const TIPOS = ['prueba_termina', 'sin_empezar', 'inactivo', 'te_echamos', 'invitacion_premium']

const dia = (iso) => Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`) / 86400000
const diasEntre = (desde, hasta) => Math.round(dia(hasta) - dia(desde))
// Fecha (Madrid) de un timestamp del registro de envíos.
const diaDe = (ts) => (ts ? new Date(ts).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' }) : null)

/**
 * Devuelve el tipo de recordatorio que toca hoy a esta persona, o null.
 * f: { alta, ultima, dias30, movs, plan, plan_hasta, ultimo_envio, envios: {tipo: ts} }
 * opciones.premiumActivo: solo entonces se invita a Premium (aún no hay precio).
 */
export function elegirRecordatorio(f, hoy, { premiumActivo = false } = {}) {
  const envios = f.envios ?? {}
  const ultimoEnvio = diaDe(f.ultimo_envio)
  if (ultimoEnvio && diasEntre(ultimoEnvio, hoy) < 3) return null

  const enviadoDesde = (tipo, desdeIso) => {
    const d = diaDe(envios[tipo])
    return d != null && (desdeIso == null || d >= desdeIso)
  }
  const haceDias = (iso) => (iso ? diasEntre(iso, hoy) : null)

  // 1. Fin de la prueba de Premium (1-2 días antes).
  if (f.plan === 'prueba' && f.plan_hasta) {
    const quedan = diasEntre(hoy, f.plan_hasta)
    const hace10 = new Date((dia(hoy) - 10) * 86400000).toISOString().slice(0, 10)
    if (quedan >= 1 && quedan <= 2 && !enviadoDesde('prueba_termina', hace10)) return 'prueba_termina'
  }

  // 2. Se dio de alta y no ha apuntado nada (una sola vez, a los 2-6 días).
  if ((f.movs ?? 0) === 0) {
    const d = haceDias(f.alta)
    if (d >= 2 && d <= 6 && !enviadoDesde('sin_empezar')) return 'sin_empezar'
    return null
  }

  // 3. Racha sin entrar: uno a los 3-6 días y otro a los 14-21 (cada racha empieza en su último día activo).
  const inactivo = haceDias(f.ultima)
  if (inactivo != null && f.ultima) {
    if (inactivo >= 3 && inactivo <= 6 && !enviadoDesde('inactivo', f.ultima)) return 'inactivo'
    if (inactivo >= 14 && inactivo <= 21 && !enviadoDesde('te_echamos', f.ultima)) return 'te_echamos'
  }

  // 4. Usuario enganchado en Gratis: invitación a Premium (como mucho cada 60 días).
  if (premiumActivo && f.plan === 'gratis' && (f.dias30 ?? 0) >= 8 && haceDias(f.alta) >= 21 && inactivo != null && inactivo <= 2) {
    const hace60 = new Date((dia(hoy) - 60) * 86400000).toISOString().slice(0, 10)
    if (!enviadoDesde('invitacion_premium', hace60)) return 'invitacion_premium'
  }
  return null
}

const escapar = (t) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const primerNombre = (n) => String(n ?? '').trim().split(/\s+/)[0] || ''
const fechaCorta = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' })

// Beneficios de Premium que se citan en los emails (ver docs/PREMIUM.md).
export const BENEFICIOS_PREMIUM = [
  'Fulcro sin límite: pregúntale lo que quieras de tus finanzas',
  'Importar con capturas del móvil, sin descargar extractos',
  'Plan de ahorro completo: avisos antes de cada renovación y guiones para negociar',
]

function contenido(tipo, f, hoy) {
  const nombre = primerNombre(f.nombre)
  const hola = nombre ? `Hola, ${nombre}:` : 'Hola:'
  const inactivo = f.ultima ? diasEntre(f.ultima, hoy) : null
  switch (tipo) {
    case 'inactivo':
      return {
        asunto: nombre ? `${nombre}, dos minutos para ponerte al día` : 'Dos minutos para ponerte al día',
        previa: `Hace ${inactivo} días que no apuntas nada.`,
        parrafos: [
          hola,
          `Hace ${inactivo} días que no apuntas nada en Palanca. No pasa nada: ponerte al día lleva dos minutos.`,
          'Y si prefieres no escribir, sube el extracto de tu banco: añadimos solo lo nuevo.',
        ],
        boton: 'Ponerme al día',
      }
    case 'te_echamos':
      return {
        asunto: 'Tu dinero sigue aquí',
        previa: 'Retomarlo es más fácil de lo que parece.',
        parrafos: [
          hola,
          `Hace ${inactivo} días que no pasas por Palanca. Si lo dejaste porque apuntar a mano cansa, prueba a subir el extracto del banco: en un minuto tienes el mes ordenado, sin escribir nada.`,
          'Si Palanca no es para ti, puedes darte de baja abajo y no te escribiremos más.',
        ],
        boton: 'Traer mi extracto',
      }
    case 'sin_empezar':
      return {
        asunto: 'Tu primer paso en Palanca (2 minutos)',
        previa: 'Sube el extracto de tu banco y te enseñamos tu último año.',
        parrafos: [
          hola,
          'Te diste de alta en Palanca, pero aún no has apuntado nada. Lo más rápido: descarga el extracto de tu banco (Excel o CSV) y súbelo.',
          'Ordenamos tu último año y te enseñamos en qué se te va el dinero y qué recibos podrías bajar.',
        ],
        boton: 'Subir mi extracto',
      }
    case 'prueba_termina':
      return {
        asunto: `Tu prueba de Premium termina el ${fechaCorta(f.plan_hasta)}`,
        previa: 'Si no haces nada, pasas a Gratis sin perder ningún dato.',
        parrafos: [
          hola,
          `Tu prueba de Premium termina el ${fechaCorta(f.plan_hasta)}. Si quieres seguir, entra en Tu cuenta. Si no, pasarás a Gratis automáticamente y no perderás ningún dato.`,
        ],
        lista: BENEFICIOS_PREMIUM,
        boton: 'Seguir con Premium',
      }
    case 'invitacion_premium':
      return {
        asunto: nombre ? `${nombre}, llevas ${f.dias30} días cuidando tu dinero` : `Llevas ${f.dias30} días cuidando tu dinero`,
        previa: 'Eso ya es un hábito. Esto es lo que añade Premium.',
        parrafos: [hola, `Este mes has entrado en Palanca ${f.dias30} días. Eso ya es un hábito. Con Premium vas un paso más allá:`],
        lista: BENEFICIOS_PREMIUM,
        boton: 'Ver Premium',
      }
    default:
      throw new Error(`Tipo de recordatorio desconocido: ${tipo}`)
  }
}

/**
 * Compone el email: { asunto, html, texto }.
 * enlaces: { app, baja }  (baja = URL de baja firmada de esta persona)
 * remitente: { nombre, email } para el pie (LSSI: identificar al prestador).
 */
export function componerEmail(tipo, f, hoy, { app, baja }, remitente) {
  const c = contenido(tipo, f, hoy)
  const frase = CON_FRASE ? fraseDelDia(f.uid ?? '', hoy) : null
  const url = `${app}${app.includes('?') ? '&' : '?'}desde=email_${tipo}`

  const texto = [
    ...c.parrafos,
    ...(c.lista ? c.lista.map((l) => `- ${l}`) : []),
    '',
    ...(frase ? [`«${frase.texto}» (${firmaDe(frase)})`, ''] : []),
    `${c.boton}: ${url}`,
    '',
    '--',
    `Recibes este email porque tienes cuenta en Palanca. Darte de baja de los recordatorios: ${baja}`,
    `${remitente.nombre} · ${remitente.email}`,
  ].join('\n')

  const p = (t) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#1f2330">${escapar(t)}</p>`
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapar(c.asunto)}</title></head>
<body style="margin:0;padding:0;background:#f4f5f9">
<span style="display:none;max-height:0;overflow:hidden">${escapar(c.previa)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:28px 24px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<tr><td>
<div style="font-weight:700;font-size:18px;color:#151823;margin-bottom:20px">Palanca</div>
${c.parrafos.map(p).join('\n')}
${c.lista ? `<ul style="margin:0 0 14px;padding-left:20px;color:#1f2330;font-size:16px;line-height:1.55">${c.lista.map((l) => `<li>${escapar(l)}</li>`).join('')}</ul>` : ''}
${frase ? `<div style="margin:20px 0;padding:2px 0 2px 14px;border-left:3px solid #c9cdf6">
<p style="margin:0;font-size:15px;line-height:1.5;font-style:italic;color:#3a4050">«${escapar(frase.texto)}»</p>
<p style="margin:4px 0 0;font-size:12px;color:#7a8193">${escapar(firmaDe(frase))}</p>
</div>` : '<div style="height:6px"></div>'}
<a href="${escapar(url)}" style="display:inline-block;background:#5b67e8;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:12px 20px;border-radius:10px">${escapar(c.boton)}</a>
</td></tr></table>
<p style="max-width:520px;margin:16px auto 0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#7a8193">
Recibes este email porque tienes cuenta en Palanca. <a href="${escapar(baja)}" style="color:#7a8193">Darte de baja de los recordatorios</a>.<br>
${escapar(remitente.nombre)} · ${escapar(remitente.email)}
</p>
</td></tr></table>
</body></html>`

  return { asunto: c.asunto, html, texto }
}
