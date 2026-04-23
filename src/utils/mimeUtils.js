/**
 * Normaliza MIME para o que as Cloud Functions aceitam (ex.: image/jpg → image/jpeg).
 */
export function normalizeFileContentType(mime, fileName = "") {
    let t = String(mime || "")
        .trim()
        .toLowerCase();
    if (!t && fileName) {
        const ext = fileName.split(".").pop()?.toLowerCase() || "";
        if (ext === "jpg" || ext === "jpeg") {
            t = "image/jpeg";
        } else if (ext === "png") {
            t = "image/png";
        } else if (ext === "webp") {
            t = "image/webp";
        } else if (ext === "mp4") {
            t = "video/mp4";
        } else if (ext === "webm") {
            t = "video/webm";
        } else if (ext === "mov") {
            t = "video/quicktime";
        }
    }
    if (t === "image/jpg") {
        t = "image/jpeg";
    }
    return t;
}
