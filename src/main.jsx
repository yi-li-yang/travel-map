import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './vp/fonts.css'
import './vp/tokens.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
