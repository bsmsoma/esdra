const CONSENT_KEY = "esdra_analytics_consent";
let initialized = false;

export function getConsentStatus() {
    try {
        return localStorage.getItem(CONSENT_KEY);
    } catch {
        return null;
    }
}

export function loadAnalytics() {
    if (initialized || typeof window === "undefined") return;
    initialized = true;

    const gtmId = import.meta.env.VITE_GTM_ID;
    const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

    if (!Array.isArray(window.dataLayer)) {
        window.dataLayer = [];
    }

    if (gtmId) {
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
        document.head.appendChild(script);
        window.dataLayer.push({ event: "gtm_loaded", gtmId });
    }

    if (gaMeasurementId) {
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
        document.head.appendChild(script);
        window.gtag = function gtag() { window.dataLayer.push(arguments); };
        window.gtag("js", new Date());
        window.gtag("config", gaMeasurementId);
    }
}

export function grantConsent() {
    try {
        localStorage.setItem(CONSENT_KEY, "true");
    } catch { /* ignorar erros de storage privado */ }
    loadAnalytics();
}

export function revokeConsent() {
    try {
        localStorage.setItem(CONSENT_KEY, "false");
    } catch { /* ignorar */ }
}
