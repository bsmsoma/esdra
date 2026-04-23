/**
 * Utility functions for handling prices in Brazilian format (R$ 349,90)
 */

/**
 * Formats a number to Brazilian currency display format
 * @param {number} value - The numeric value to format
 * @returns {string} Formatted price string (e.g., "349,90")
 */
export function formatPrice(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return "0,00";
    }
    
    return Number(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * Formats a number to full Brazilian currency format with R$ symbol
 * @param {number} value - The numeric value to format
 * @returns {string} Formatted currency string (e.g., "R$ 349,90")
 */
export function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return "R$ 0,00";
    }
    
    return Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

/**
 * Parses a Brazilian format price string to a number
 * Handles both comma (Brazilian) and dot (international) as decimal separator
 * @param {string} value - The price string to parse (e.g., "349,90" or "349.90")
 * @returns {number|null} The numeric value, or null if empty
 */
export function parsePrice(value) {
    if (!value || value === "") {
        return null;
    }
    
    // Convert to string if not already
    const strValue = String(value).trim();
    
    // Remove currency symbol and spaces
    let cleanValue = strValue.replace(/R\$\s?/g, "").trim();
    
    // If empty after cleaning, return null
    if (cleanValue === "") {
        return null;
    }
    
    // Remove thousand separators (dots in Brazilian format when followed by 3 digits)
    // But keep dots that are decimal separators
    // Brazilian: 1.234,56 -> 1234.56
    // Check if it has comma (Brazilian decimal separator)
    if (cleanValue.includes(",")) {
        // Remove dots (thousand separators in BR format)
        cleanValue = cleanValue.replace(/\./g, "");
        // Replace comma with dot for parseFloat
        cleanValue = cleanValue.replace(",", ".");
    }
    
    const parsed = parseFloat(cleanValue);
    
    return isNaN(parsed) ? null : parsed;
}

/**
 * Formats a price for display in an input field (Brazilian format without R$)
 * @param {number} value - The numeric value
 * @returns {string} Formatted string for input display (e.g., "349,90")
 */
export function formatPriceForInput(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return "";
    }
    
    return formatPrice(value);
}

