/**
 * Normaliza um token de tamanho: números inteiros (calçados) ou label simbólico ("unico", etc.).
 * @param {string|number|null|undefined} raw
 * @returns {number|string|null}
 */
export function normalizeProductSizeToken(raw) {
    if (raw == null || raw === "") {
        return null;
    }
    if (typeof raw === "number") {
        return Number.isNaN(raw) ? null : raw;
    }
    if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (trimmed === "") {
            return null;
        }
        const n = parseInt(trimmed, 10);
        if (!Number.isNaN(n) && /^-?\d+$/.test(trimmed)) {
            return n;
        }
        return trimmed;
    }
    return null;
}

/**
 * @param {Array<string|number>} sizes
 * @returns {Array<number|string>}
 */
export function normalizeProductSizeList(sizes) {
    if (!Array.isArray(sizes)) {
        return [];
    }
    return sizes
        .map(normalizeProductSizeToken)
        .filter(function (x) {
            return x != null;
        });
}

function sortSizeTokens(a, b) {
    const aNum = typeof a === "number";
    const bNum = typeof b === "number";
    if (aNum && bNum) {
        return a - b;
    }
    if (aNum && !bNum) {
        return -1;
    }
    if (!aNum && bNum) {
        return 1;
    }
    return String(a).localeCompare(String(b), "pt-BR");
}

/**
 * @param {Array<string|number>} sizes
 * @returns {Array<number|string>}
 */
export function normalizeAndSortSizeList(sizes) {
    const list = normalizeProductSizeList(sizes);
    return [...list].sort(sortSizeTokens);
}

/**
 * Rótulo amigável para exibição (detalhe do produto, WhatsApp, etc.).
 * @param {string|number|null|undefined} token
 * @returns {string}
 */
export function formatSizeLabelForDisplay(token) {
    if (token == null) {
        return "";
    }
    if (typeof token === "string" && token.toLowerCase() === "unico") {
        return "Único";
    }
    return String(token);
}

/**
 * Texto da coluna "Tamanho" no dashboard (evita NaN para labels simbólicos).
 * @param {Array<string|number>|null|undefined} sizes
 * @returns {string}
 */
export function formatSizesDisplayForAdmin(sizes) {
    if (!sizes || sizes.length === 0) {
        return "-";
    }

    const normalized = normalizeProductSizeList(sizes);
    if (normalized.length === 0) {
        return "-";
    }

    const numericOnly = normalized.filter(function (s) {
        return typeof s === "number";
    });
    const nonNumeric = normalized.filter(function (s) {
        return typeof s === "string";
    });

    if (nonNumeric.length > 0 && numericOnly.length === 0) {
        return nonNumeric
            .map(function (s) {
                return formatSizeLabelForDisplay(s);
            })
            .join(", ");
    }

    if (numericOnly.length === normalized.length) {
        if (numericOnly.length === 1) {
            return numericOnly[0].toString();
        }

        const sortedSizes = [...numericOnly].sort(function (a, b) {
            return a - b;
        });

        if (sortedSizes.length >= 5) {
            const min = sortedSizes[0];
            const max = sortedSizes[sortedSizes.length - 1];

            const isConsecutive = sortedSizes.every(function (size, index) {
                if (index === 0) {
                    return true;
                }
                return size - sortedSizes[index - 1] === 2;
            });

            if (isConsecutive && sortedSizes.length >= 8) {
                return "Todas";
            }

            return `${min} - ${max}`;
        }

        return sortedSizes.join(", ");
    }

    return normalized
        .map(function (s) {
            return formatSizeLabelForDisplay(s);
        })
        .join(", ");
}
