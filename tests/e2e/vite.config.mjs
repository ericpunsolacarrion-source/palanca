// Servidor de pruebas en el navegador: la app real con Supabase y la IA simulados.
// Lo arranca tests/e2e/ejecutar.mjs (npm run e2e). Nada sale a internet.
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import react from '@vitejs/plugin-react'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.resolve(AQUI, '../..')
const NL = String.fromCharCode(10)

export default {
  root: RAIZ,
  configFile: false,
  cacheDir: path.join(RAIZ, 'node_modules/.vite-e2e'),
  logLevel: 'warn',
  plugins: [
    react(),
    {
      name: 'fulcro-simulado',
      configureServer(srv) {
        srv.middlewares.use('/api/consultor', async (req, res) => {
          if (req.method === 'GET') {
            res.setHeader('content-type', 'application/json')
            return res.end(JSON.stringify({ activo: true }))
          }
          for await (const _ of req) void _
          res.setHeader('content-type', 'application/x-ndjson')
          const txt = ['Vas **bien** este mes.', '', 'Donde más se te va:', '- **Vivienda**: 750 €', '- **Comida**: 105,55 €', '', 'Un paso pequeño: revisa en **Fijos** tus suscripciones.'].join(NL)
          for (const trozo of txt.match(/.{1,18}/gs)) {
            res.write(JSON.stringify({ t: 'texto', d: trozo }) + NL)
            await new Promise((r) => setTimeout(r, 20))
          }
          res.write(JSON.stringify({ t: 'fin', restantes: 4 }) + NL)
          res.end()
        })
      },
    },
    {
      name: 'capturas-simuladas',
      configureServer(srv) {
        srv.middlewares.use('/api/leer-capturas', async (req, res) => {
          res.setHeader('content-type', 'application/json')
          if (req.method === 'GET') return res.end(JSON.stringify({ activo: true }))
          let body = ''
          for await (const c of req) body += c
          const b = JSON.parse(body)
          res.end(JSON.stringify({ movimientos: [{ fecha: b.hoy, concepto: 'Mercadona', importe: -32.15, captura: 1 }], avisos: [] }))
        })
      },
    },
    {
      name: 'supabase-simulado',
      enforce: 'pre',
      resolveId(id) {
        if (id.endsWith('supabaseClient')) return path.join(AQUI, 'mockSupabase.js')
        if (id === 'virtual:pwa-register') return '\0pwa'
      },
      load(id) {
        if (id === '\0pwa') return 'export const registerSW = () => () => {}'
      },
    },
  ],
  server: { port: Number(process.env.E2E_PUERTO || 5175), strictPort: true, fs: { allow: [RAIZ] } },
}
