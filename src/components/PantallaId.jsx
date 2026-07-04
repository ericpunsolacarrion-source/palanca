import { useState } from 'react'

export default function PantallaId({ onEntrar }) {
  const [valor, setValor] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onEntrar(valor)
  }

  return (
    <div className="pantalla-id">
      <h1>Palanca</h1>
      <p>Estructura tus finanzas desde el inicio.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="usuario-id">Tu ID de usuario</label>
        <input
          id="usuario-id"
          type="text"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="ej. eric2026"
          autoFocus
        />
        <p className="ayuda">
          Elige un ID único (sin espacios). Escribe el mismo ID en cualquier
          dispositivo para acceder a tus mismos datos. Guárdalo en un sitio
          seguro: si lo pierdes, no podrás recuperar tus movimientos.
        </p>
        <button type="submit">Entrar</button>
      </form>
    </div>
  )
}
