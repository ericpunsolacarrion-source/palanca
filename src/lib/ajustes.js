import { supabase } from './supabaseClient'
import { CATEGORIA_AJUSTE } from './categorias'
import { hoyIso } from './movimientosUtils'

// Encuentra o crea la categoría "Ajuste" del tipo indicado (ingreso/gasto).
async function categoriaAjusteId(usuarioId, tipo) {
  const { data } = await supabase
    .from('categorias')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('tipo', tipo)
    .eq('nombre', CATEGORIA_AJUSTE)
    .maybeSingle()
  if (data?.id) return data.id
  const { data: creada } = await supabase
    .from('categorias')
    .insert({ usuario_id: usuarioId, tipo, nombre: CATEGORIA_AJUSTE })
    .select('id')
    .single()
  return creada?.id ?? null
}

// Crea un movimiento de AJUSTE (saldo inicial o reconciliación). El signo lo da
// el tipo: 'ingreso' suma liquidez, 'gasto' la resta. Visible y explicado.
export async function crearAjuste(usuarioId, { importe, tipo, nota, fecha }) {
  const monto = Math.abs(Number(importe))
  if (!(monto > 0)) return true // nada que ajustar
  const catId = await categoriaAjusteId(usuarioId, tipo)
  const { error } = await supabase.from('movimientos').insert({
    usuario_id: usuarioId,
    tipo,
    categoria_id: catId,
    fuente_id: null,
    importe: monto,
    fecha: fecha || hoyIso(),
    es_fijo: false,
    nota: nota || null,
  })
  return !error
}
