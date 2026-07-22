import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// NOTE: StrictMode is intentionally omitted to avoid double-invoking 3D asset
// loaders (R3F loaders are not idempotent across the dev double-mount).
createRoot(document.getElementById('root')!).render(<App />)
