import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

function initializeAnalytics() {
  if (typeof window === "undefined") {
    return;
  }

  const gtmId = import.meta.env.VITE_GTM_ID
  const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID

  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = []
  }

  if (gtmId) {
    const gtmScript = document.createElement("script")
    gtmScript.async = true
    gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`
    document.head.appendChild(gtmScript)
    window.dataLayer.push({ event: "gtm_loaded", gtmId })
  }

  if (gaMeasurementId) {
    const gaScript = document.createElement("script")
    gaScript.async = true
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`
    document.head.appendChild(gaScript)

    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
    window.gtag("js", new Date())
    window.gtag("config", gaMeasurementId)
  }
}

initializeAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
