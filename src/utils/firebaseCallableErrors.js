/**
 * Tenta extrair texto útil de httpsCallable (HttpsError às vezes manda em `details`).
 */
function formatErrorDetails(details) {
    if (details == null) {
        return null;
    }
    if (typeof details === "string") {
        const s = details.trim();
        return s.length > 0 ? s : null;
    }
    if (typeof details === "object") {
        if (typeof details.message === "string" && details.message.trim()) {
            return details.message.trim();
        }
        try {
            const json = JSON.stringify(details);
            if (json && json !== "{}" && json.length < 500) {
                return json;
            }
        } catch {
            /* ignore */
        }
    }
    return null;
}

function isTechnicalInfraMessage(text) {
    const s = String(text || "").toLowerCase();
    return (
        s.includes("createuploadsession:") ||
        s.includes("signblob") ||
        s.includes("serviceaccounttokencreator") ||
        s.includes("iam.serviceaccounts") ||
        s.includes("cloud function") ||
        s.includes("cloudfunctions") ||
        s.includes("cors") ||
        s.includes("preflight") ||
        s.includes("storage.googleapis.com")
    );
}

/**
 * Mensagem útil para o usuário quando httpsCallable falha.
 * Código `internal` quase não traz `message` útil no cliente; `details` às vezes ajuda.
 */
export function getCallableErrorMessage(error, fallback) {
    const fb = fallback || "Operação falhou.";
    if (!error) {
        return fb;
    }

    const fromDetails = formatErrorDetails(error.details);
    if (fromDetails) {
        if (isTechnicalInfraMessage(fromDetails)) {
            return "Não foi possível concluir o upload agora. Tente novamente em instantes.";
        }
        return fromDetails;
    }

    const msg = String(error.message || "").trim();
    const code = String(error.code || "");

    const isInternal =
        code === "functions/internal" || /^internal$/i.test(msg);

    if (isInternal) {
        return "Não foi possível concluir o upload agora. Tente novamente em instantes.";
    }

    if (isTechnicalInfraMessage(msg)) {
        return "Não foi possível concluir o upload agora. Tente novamente em instantes.";
    }

    return msg || fb;
}
