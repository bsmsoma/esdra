/**
 * Logs apenas em desenvolvimento (Vite: import.meta.env.DEV).
 * Evita ruído e vazamento de detalhes em produção.
 */
const isDev = import.meta.env.DEV;

export function debug(...args) {
    if (isDev) {
        console.log(...args);
    }
}
