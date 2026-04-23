/**
 * Maps Firebase Auth error codes to user-friendly messages in Portuguese.
 * Used in Login and Register to explain what went wrong without exposing technical codes.
 *
 * @see https://firebase.google.com/docs/reference/js/auth#autherrorcodes
 */

const AUTH_ERROR_MESSAGES = {
    // Invalid or incorrect credentials (wrong email, wrong password, or user not found)
    "auth/invalid-credential":
        "E-mail ou senha incorretos. Verifique os dados e tente novamente.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/user-disabled": "Esta conta foi desativada. Entre em contato com o suporte.",
    "auth/user-not-found": "Nenhuma conta encontrada com este e-mail.",
    "auth/wrong-password": "Senha incorreta. Tente novamente.",

    // Rate limiting and security
    "auth/too-many-requests":
        "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "auth/requires-recent-login":
        "Por segurança, faça login novamente antes de continuar.",

    // Network and popup (e.g. Google sign-in)
    "auth/network-request-failed":
        "Falha na conexão. Verifique sua internet e tente novamente.",
    "auth/popup-closed-by-user":
        "Login cancelado. Feche a janela ou tente novamente.",
    "auth/cancelled-popup-request":
        "Uma nova janela de login foi aberta. Use a janela mais recente.",
    "auth/popup-blocked":
        "A janela de login foi bloqueada. Libere pop-ups para este site.",

    // Registration / account linking
    "auth/email-already-in-use":
        "Este e-mail já está em uso. Tente fazer login ou use outro e-mail.",
    "auth/weak-password": "A senha é fraca. Use pelo menos 6 caracteres.",
    "auth/account-exists-with-different-credential":
        "Já existe uma conta com este e-mail usando outro método de login.",
    "auth/credential-already-in-use":
        "Estas credenciais já estão vinculadas a outra conta.",

    // Generic fallback
    "auth/internal-error":
        "Ocorreu um erro interno. Tente novamente em instantes.",
};

/**
 * Returns a user-friendly message for a Firebase Auth error.
 * Falls back to a generic message if the code is unknown.
 *
 * @param {string} code - Firebase error code (e.g. "auth/invalid-credential")
 * @returns {string} Message in Portuguese for the UI
 */
export function getAuthErrorMessage(code) {
    if (!code || typeof code !== "string") {
        return "Não foi possível concluir o login. Tente novamente.";
    }
    return (
        AUTH_ERROR_MESSAGES[code] ||
        "Algo deu errado. Verifique seus dados e tente novamente."
    );
}
