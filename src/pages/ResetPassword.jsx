import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { auth, verifyPasswordResetCode, confirmPasswordReset } from "../firebase";
import { getAuthErrorMessage } from "../utils/authErrors";
import styles from "./ResetPassword.module.scss";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const oobCode = searchParams.get("oobCode");
    const mode = searchParams.get("mode");

    const [verifiedEmail, setVerifiedEmail] = useState(null);
    const [codeError, setCodeError] = useState(null);
    const [codeLoading, setCodeLoading] = useState(true);

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState(null);

    useEffect(function verifyCode() {
        if (mode !== "resetPassword" || !oobCode) {
            setCodeError("Link inválido ou expirado. Solicite um novo link de recuperação.");
            setCodeLoading(false);
            return;
        }

        verifyPasswordResetCode(auth, oobCode)
            .then(function (email) {
                setVerifiedEmail(email);
            })
            .catch(function (error) {
                setCodeError(getAuthErrorMessage(error.code) || "Link inválido ou expirado. Solicite um novo link de recuperação.");
            })
            .finally(function () {
                setCodeLoading(false);
            });
    }, [oobCode, mode]);

    async function handleSubmit(event) {
        event.preventDefault();
        setFormError(null);

        if (password !== confirmPassword) {
            setFormError("As senhas não coincidem.");
            return;
        }

        if (password.length < 6) {
            setFormError("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        setIsLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode, password);
            navigate("/login?message=Senha redefinida com sucesso. Faça login para continuar.", { replace: true });
        } catch (error) {
            setFormError(getAuthErrorMessage(error.code) || "Não foi possível redefinir a senha. Solicite um novo link.");
        } finally {
            setIsLoading(false);
        }
    }

    if (codeLoading) {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <p className={styles.subtitle}>Verificando link...</p>
                </div>
            </div>
        );
    }

    if (codeError) {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <h1 className={styles.title}>Link inválido</h1>
                    <div className={styles.errorMessage} role="alert">
                        <p>{codeError}</p>
                    </div>
                    <button
                        type="button"
                        className={styles.backLink}
                        onClick={function () { navigate("/login"); }}
                    >
                        ← Voltar ao login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Nova senha</h1>
                <p className={styles.subtitle}>
                    Criando nova senha para{" "}
                    <span className={styles.email}>{verifiedEmail}</span>
                </p>

                <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {formError && (
                        <div className={styles.errorMessage} role="alert">
                            <p>{formError}</p>
                        </div>
                    )}

                    <div className={styles.passwordWrapper}>
                        <input
                            className={styles.input}
                            type={showPassword ? "text" : "password"}
                            placeholder="Nova senha"
                            aria-label="Nova senha"
                            value={password}
                            onChange={function (e) { setPassword(e.target.value); }}
                            required
                            minLength={6}
                            autoFocus
                        />
                        <span
                            className={styles.eyeIcon}
                            onClick={function () { setShowPassword(!showPassword); }}
                            role="button"
                            tabIndex={0}
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                            {showPassword ? <FaEye /> : <FaEyeSlash />}
                        </span>
                    </div>

                    <div className={styles.passwordWrapper}>
                        <input
                            className={styles.input}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirmar nova senha"
                            aria-label="Confirmar nova senha"
                            value={confirmPassword}
                            onChange={function (e) { setConfirmPassword(e.target.value); }}
                            required
                            minLength={6}
                        />
                        <span
                            className={styles.eyeIcon}
                            onClick={function () { setShowConfirmPassword(!showConfirmPassword); }}
                            role="button"
                            tabIndex={0}
                            aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                            {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                        </span>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isLoading}
                    >
                        {isLoading ? "Salvando..." : "Salvar nova senha"}
                    </button>
                </form>

                <button
                    type="button"
                    className={styles.backLink}
                    onClick={function () { navigate("/login"); }}
                >
                    ← Voltar ao login
                </button>
            </div>
        </div>
    );
}
