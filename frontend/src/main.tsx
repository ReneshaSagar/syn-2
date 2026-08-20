import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import VisualTestPage from './VisualTest.tsx'

const isVisualTest = window.location.search.includes('visual-test');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isVisualTest ? <VisualTestPage /> : <App />}
  </StrictMode>,
)
