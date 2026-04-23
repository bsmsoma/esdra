/**
 * Cache utility for Firestore data
 * Stores data in sessionStorage with timestamp to avoid unnecessary reads
 * 
 * Compatible with React Router 7 loaders
 * Handles Firestore Timestamp serialization
 * Safe for SPA applications (not SSR compatible)
 */

const CACHE_PREFIX = "firestore_cache_";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Checks if sessionStorage is available
 * @returns {boolean} True if sessionStorage is available
 */
function isStorageAvailable() {
    try {
        const test = "__storage_test__";
        sessionStorage.setItem(test, test);
        sessionStorage.removeItem(test);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Serializes Firestore data for storage
 * Converts Firestore Timestamps to ISO strings
 * @param {*} data - Data to serialize
 * @returns {*} Serialized data
 */
function serializeForStorage(data) {
    if (data === null || data === undefined) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(function (item) {
            return serializeForStorage(item);
        });
    }

    if (typeof data === "object" && data.constructor === Object) {
        const serialized = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                // Check if it's a Firestore Timestamp
                if (value && typeof value === "object" && value.toDate && typeof value.toDate === "function") {
                    // Convert Firestore Timestamp to ISO string
                    serialized[key] = {
                        __firestore_timestamp: true,
                        seconds: value.seconds,
                        nanoseconds: value.nanoseconds,
                    };
                } else {
                    serialized[key] = serializeForStorage(value);
                }
            }
        }
        return serialized;
    }

    return data;
}

/**
 * Deserializes stored data back to original format
 * Converts ISO strings back to Firestore Timestamps (if needed)
 * @param {*} data - Data to deserialize
 * @returns {*} Deserialized data
 */
function deserializeFromStorage(data) {
    if (data === null || data === undefined) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(function (item) {
            return deserializeFromStorage(item);
        });
    }

    if (typeof data === "object" && data.constructor === Object) {
        // Check if it's a serialized Firestore Timestamp
        if (data.__firestore_timestamp === true) {
            // Return as plain object - Firestore will handle it if needed
            // For now, we'll keep it as object since we're not using Timestamps in components
            return data;
        }

        const deserialized = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                deserialized[key] = deserializeFromStorage(data[key]);
            }
        }
        return deserialized;
    }

    return data;
}

/**
 * Generates a cache key from URL and parameters
 * @param {string} baseKey - Base key (e.g., 'products', 'home', 'product-details')
 * @param {Object} params - Parameters to include in the key
 * @returns {string} Cache key
 */
function generateCacheKey(baseKey, params = {}) {
    const paramsString = Object.keys(params)
        .sort()
        .map(function (key) {
            return `${key}=${params[key]}`;
        })
        .join("&");
    
    return paramsString 
        ? `${CACHE_PREFIX}${baseKey}_${paramsString}` 
        : `${CACHE_PREFIX}${baseKey}`;
}

/**
 * Gets cached data if it exists and is still valid
 * @param {string} key - Cache key
 * @returns {Object|null} Cached data or null if not found/expired
 */
function getCachedData(key) {
    // Check if storage is available
    if (!isStorageAvailable()) {
        return null;
    }

    try {
        const cached = sessionStorage.getItem(key);
        if (!cached) {
            return null;
        }

        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();
        const age = now - timestamp;

        // Check if cache is still valid
        if (age < CACHE_DURATION) {
            // Deserialize Firestore Timestamps
            return deserializeFromStorage(data);
        }

        // Cache expired, remove it
        sessionStorage.removeItem(key);
        return null;
    } catch (error) {
        console.error("Erro ao ler cache:", error);
        // Remove corrupted cache entry
        try {
            sessionStorage.removeItem(key);
        } catch (removeError) {
            // Ignore removal errors
        }
        return null;
    }
}

/**
 * Stores data in cache with current timestamp
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 */
function setCachedData(key, data) {
    // Check if storage is available
    if (!isStorageAvailable()) {
        return;
    }

    try {
        // Serialize Firestore Timestamps before storing
        const serializedData = serializeForStorage(data);
        const cacheEntry = {
            data: serializedData,
            timestamp: Date.now(),
        };
        sessionStorage.setItem(key, JSON.stringify(cacheEntry));
    } catch (error) {
        console.error("Erro ao salvar cache:", error);
        // If storage is full, try to clear old entries
        if (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED") {
            clearExpiredCache();
            try {
                const serializedData = serializeForStorage(data);
                const cacheEntry = {
                    data: serializedData,
                    timestamp: Date.now(),
                };
                sessionStorage.setItem(key, JSON.stringify(cacheEntry));
            } catch (retryError) {
                console.error("Erro ao salvar cache após limpeza:", retryError);
                // If still failing, try to clear more aggressively
                try {
                    clearAllCache();
                } catch (clearError) {
                    console.error("Erro ao limpar todo o cache:", clearError);
                }
            }
        }
    }
}

/**
 * Clears expired cache entries
 */
function clearExpiredCache() {
    if (!isStorageAvailable()) {
        return;
    }

    try {
        const keys = Object.keys(sessionStorage);
        const now = Date.now();
        
        keys.forEach(function (key) {
            if (key.startsWith(CACHE_PREFIX)) {
                try {
                    const cached = sessionStorage.getItem(key);
                    if (cached) {
                        const { timestamp } = JSON.parse(cached);
                        const age = now - timestamp;
                        if (age >= CACHE_DURATION) {
                            sessionStorage.removeItem(key);
                        }
                    }
                } catch (error) {
                    // Invalid cache entry, remove it
                    sessionStorage.removeItem(key);
                }
            }
        });
    } catch (error) {
        console.error("Erro ao limpar cache expirado:", error);
    }
}

/**
 * Clears all cache entries
 */
function clearAllCache() {
    if (!isStorageAvailable()) {
        return;
    }

    try {
        const keys = Object.keys(sessionStorage);
        keys.forEach(function (key) {
            if (key.startsWith(CACHE_PREFIX)) {
                sessionStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error("Erro ao limpar todo o cache:", error);
    }
}

/**
 * Invalidates cache for a specific key pattern
 * @param {string} pattern - Pattern to match (e.g., 'products' will invalidate all product caches)
 */
function invalidateCache(pattern) {
    if (!isStorageAvailable()) {
        return;
    }

    try {
        const keys = Object.keys(sessionStorage);
        const searchKey = `${CACHE_PREFIX}${pattern}`;
        
        keys.forEach(function (key) {
            if (key.startsWith(searchKey)) {
                sessionStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error("Erro ao invalidar cache:", error);
    }
}

/**
 * Wrapper function for loaders that adds caching
 * @param {string} baseKey - Base cache key
 * @param {Function} fetchFunction - Function that fetches data from Firestore
 * @param {Object} params - Parameters for cache key generation
 * @returns {Promise<*>} Cached or fresh data
 */
async function withCache(baseKey, fetchFunction, params = {}) {
    const cacheKey = generateCacheKey(baseKey, params);
    
    // Try to get from cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData !== null) {
        return cachedData;
    }

    // Cache miss or expired, fetch from Firestore
    const freshData = await fetchFunction();
    
    // Store in cache
    setCachedData(cacheKey, freshData);
    
    return freshData;
}

export {
    generateCacheKey,
    getCachedData,
    setCachedData,
    clearExpiredCache,
    clearAllCache,
    invalidateCache,
    withCache,
    isStorageAvailable,
    serializeForStorage,
    deserializeFromStorage,
    CACHE_DURATION,
};

