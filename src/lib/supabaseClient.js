import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Se mira ANTES de crear el cliente: Supabase borra el fragmento (#access_token…
// &type=recovery) al leer la sesión del enlace «Restablecer contraseña».
export const llegoConRecuperacion = typeof location !== 'undefined' && /(^|[#&])type=recovery(&|$)/.test(location.hash || '')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
