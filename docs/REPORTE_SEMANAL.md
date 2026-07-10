# Reporte semanal por email

Estado: **generador de contenido listo**; falta conectar el envío (requiere
infraestructura externa: Supabase Edge Function + cron + proveedor de email).

## Qué hay hecho

`src/lib/reporteSemanal.js` genera el contenido del resumen semanal por usuario
a partir de sus movimientos. Es JS puro (sin React/DOM), así que la misma
función sirve en el cliente y en una Edge Function de Supabase.

- `generarReporteSemanal(movimientos, hoy?)` → objeto con periodo (lunes→domingo
  de la semana anterior), ingresos/gastos/ahorro/invertido de esa semana, la
  comparativa de gasto con la semana previa, un **insight personalizado** y los
  textos listos: `asunto`, `textoPlano`.
- `reporteAHtml(reporte)` → cuerpo HTML del email con los colores de Palanca.

Reutiliza `totalesDe` de `movimientosUtils` (regla única de cálculo). Espera
movimientos con `{ tipo, importe, fecha, categoria: { nombre } }`.

## Qué falta para enviarlo (pasos, cuando se quiera activar)

1. **Proveedor de email**: crear cuenta en Resend / Postmark / SendGrid y
   obtener una API key. Guardarla como secret en Supabase
   (`supabase secrets set EMAIL_API_KEY=...`).
2. **Edge Function** `reporte-semanal` (plantilla abajo): por cada perfil con
   email, lee sus movimientos, llama a `generarReporteSemanal` y envía el email.
3. **Cron**: programar la función los lunes por la mañana con
   `pg_cron`/`Scheduled Functions` de Supabase.
4. **Preferencia de baja**: añadir columna `perfiles.reporte_semanal boolean`
   (default true) y respetarla; incluir enlace de baja en el email.

## Plantilla de Edge Function (Deno)

```ts
// supabase/functions/reporte-semanal/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
// Copiar reporteSemanal.js + las utilidades que usa (totalesDe, formatearEuros,
// esInversion) a la función, o publicarlas como módulo compartido.

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service role: salta RLS
  )

  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('usuario_id, email')
    .not('email', 'is', null)

  for (const p of perfiles ?? []) {
    const { data: movimientos } = await supabase
      .from('movimientos')
      .select('tipo, importe, fecha, categoria:categorias(nombre)')
      .eq('usuario_id', p.usuario_id)

    const reporte = generarReporteSemanal(movimientos ?? [])
    // Nada que contar esta semana → no enviamos (evita spam).
    if (reporte.ingresos + reporte.gastos + reporte.invertido === 0) continue

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('EMAIL_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Palanca <hola@tu-dominio>',
        to: p.email,
        subject: reporte.asunto,
        html: reporteAHtml(reporte),
      }),
    })
  }

  return new Response('ok')
})
```

## Nota

El generador ya está cubierto por la lógica de la app y probado con datos
reales. Cuando se decida activar el envío, el único trabajo pendiente es la
infraestructura (función + cron + proveedor), no la lógica de contenido.
