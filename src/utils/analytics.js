function getWindowSafe() {
    if (typeof window === "undefined") {
        return null;
    }
    return window;
}

function normalizeValue(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function trackEvent(eventName, payload = {}) {
    const currentWindow = getWindowSafe();
    if (!currentWindow || !eventName) {
        return;
    }

    if (!Array.isArray(currentWindow.dataLayer)) {
        currentWindow.dataLayer = [];
    }

    currentWindow.dataLayer.push({
        event: eventName,
        ...payload,
    });

    if (typeof currentWindow.gtag === "function") {
        currentWindow.gtag("event", eventName, payload);
    }
}

export function mapItemsForAnalytics(items = []) {
    return items.map(function mapItem(item, index) {
        return {
            item_id: String(item.productCode || item.productId || ""),
            item_name: item.productName || "",
            item_variant: item.size || "",
            item_category: item.type || "sale",
            index,
            price: normalizeValue(item.price || item.unitPrice),
            quantity: normalizeValue(item.quantity || 1),
        };
    });
}

