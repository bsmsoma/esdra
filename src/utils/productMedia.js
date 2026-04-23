/**
 * Garante índice de capa válido para o array de URLs de imagem.
 */
export function clampProductCoverIndex(rawIndex, imageCount) {
    if (!imageCount || imageCount < 1) {
        return 0;
    }
    const n = Number(rawIndex);
    const base = Number.isFinite(n) ? Math.floor(n) : 0;
    return Math.min(Math.max(0, base), imageCount - 1);
}

/**
 * Resolve a URL da imagem de capa para exibição (ou null se inexistente).
 */
export function getProductCoverImageUrl(product) {
    const images = product?.images;
    if (!Array.isArray(images) || images.length === 0) {
        return null;
    }
    const idx = clampProductCoverIndex(product?.coverIndex, images.length);
    const url = images[idx];
    if (typeof url !== "string" || url.length === 0) {
        return null;
    }
    return url;
}
