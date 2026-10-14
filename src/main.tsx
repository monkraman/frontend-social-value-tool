import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyTheme, getInitialTheme } from './constants/theme'
import App from './App.tsx'

// Apply initial stored theme (Dark or Light)
applyTheme(getInitialTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
