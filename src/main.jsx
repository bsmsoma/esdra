import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import { getConsentStatus, loadAnalytics } from './utils/analytics-loader.js'

// Só carrega analytics se o usuário já concedeu consentimento anteriormente.
// Caso contrário, o componente CookieConsent fará isso ao aceitar.
if (getConsentStatus() === "true") {
  loadAnalytics()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
