import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import './index.css'

Sentry.init({
    dsn: 'http://099c48066d8143b797340cd552d80a58@37.60.240.199:8765/6',
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.01,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Sentry.ErrorBoundary fallback={<p style={{padding:20,color:'red'}}>Une erreur est survenue. Rechargez la page.</p>}>
            <App />
        </Sentry.ErrorBoundary>
    </React.StrictMode>,
)
