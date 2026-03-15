import React from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  return (
    <div style={{fontFamily: 'system-ui, Arial, sans-serif', padding: 24}}>
      <h1>MAP Frontend</h1>
      <p>Vite dev server is running — frontend entry loaded.</p>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
