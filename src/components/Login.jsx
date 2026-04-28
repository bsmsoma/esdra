import React, { useEffect, useRef, useState } from "react";
import styles from "./Login.module.scss";
import {
    Link,
    redirect,
    useFetcher,
    useLocation,
    useSearchParams,
    useNavigate,
} from "react-router";
import { FaEye, FaEyeSlash, FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import {
    auth,
    createOrUpdateCustomer,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    googleProvider,
    appleProvider,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    sendPasswordResetEmail,
} from "../firebase";

function isMobileBrowser() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

const REMEMBER_ME_KEY = "esdra_remember_me_expiry";

function setRememberMeExpiry() {
    localStorage.setItem(REMEMBER_ME_KEY, String(Date.now() + 7 * 86400000));
}

function clearRememberMeExpiry() {
    localStorage.removeItem(REMEMBER_ME_KEY);
}
import { getAuthErrorMessage } from "../utils/authErrors";
import { isUserAdmin, waitForAuth } from "../contexts/AuthContext";

// Single place for "where to send the user after login" logic.
function getRedirectPathAfterLogin(admin, redirectTo) {
    if (redirectTo) {
        if (redirectTo === "/dashboard" && !admin) {
            return "/";
        }
        return redirectTo;
    }
    return admin ? "/dashboard" : "/";
}

export async function loginAction({ request }) {
    const formData = await request.formData();
    const user = formData.get("user");
    const password = formData.get("password");
    const remember = formData.get("rememberpassword") === "on";
    const redirectTo = new URL(request.url).searchParams.get("redirectTo");

    try {
        await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
        await signInWithEmailAndPassword(auth, user, password);

        if (remember) {
            setRememberMeExpiry();
        } else {
            clearRememberMeExpiry();
        }

        const authenticatedUser = await waitForAuth();
        if (!authenticatedUser) {
            return {
                message: "Erro ao autenticar. Tente novamente.",
                code: "auth/internal-error",
            };
        }

        const admin = await isUserAdmin(authenticatedUser);
        return redirect(getRedirectPathAfterLogin(admin, redirectTo));
    } catch (error) {
        return {
            message: getAuthErrorMessage(error.code),
            code: error.code,
        };
    }
}

export async function loginLoader() {
    const user = await waitForAuth();
    if (user) {
        const admin = await isUserAdmin(user);
        return redirect(getRedirectPathAfterLogin(admin, null));
    }
    return null;
}

export async function registerAction({ request }) {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const phone = formData.get("phone");
    const redirectTo =
        new URL(request.url).searchParams.get("redirectTo") || "/account";

    if (password !== confirmPassword) {
        return {
            message: "As senhas não coincidem.",
            code: "password_mismatch",
        };
    }

    if (!password || password.length < 6) {
        return {
            message: "A senha deve ter pelo menos 6 caracteres.",
            code: "password_too_short",
        };
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );
        const user = userCredential.user;

        await createOrUpdateCustomer(user.uid, {
            email: email,
            firstName: firstName,
            lastName: lastName,
            phone: phone || "",
            addresses: [],
            preferences: {
                newsletter: false,
                smsNotifications: false,
                emailNotifications: true,
            },
        });

        return redirect(redirectTo);
    } catch (error) {
        return {
            message: getAuthErrorMessage(error.code) || error.message,
            code: error.code,
        };
    }
}

export async function registerLoader() {
    const user = await waitForAuth();
    if (user) {
        return redirect("/account");
    }
    return null;
}

export default function Login() {
    const location = useLocation();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [googleError, setGoogleError] = useState(null);
    const [appleError, setAppleError] = useState(null);
    const [isForgot, setIsForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotStatus, setForgotStatus] = useState(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const message = searchParams.get("message");
    const formRef = useRef(null);
    const registerFormRef = useRef(null);
    const loginFetcher = useFetcher();
    const registerFetcher = useFetcher();
    const [isActive, setIsActive] = useState(false);

    useEffect(function syncToggleWithRoute() {
        if (location.pathname === "/register") {
            setIsActive(true);
            return;
        }
        setIsActive(false);
    }, [location.pathname]);

    useEffect(function syncLoadingWithFetchers() {
        const submitting =
            loginFetcher.state !== "idle" || registerFetcher.state !== "idle";
        if (submitting) {
            setIsLoading(true);
            return;
        }
        setIsLoading(false);
    }, [loginFetcher.state, registerFetcher.state, isActive]);

    useEffect(function handleRedirectResult() {
        if (!isMobileBrowser()) return;
        setIsLoading(true);
        getRedirectResult(auth)
            .then(async (result) => {
                if (!result) return;
                setRememberMeExpiry();
                await waitForAuth();
                const admin = await isUserAdmin(result.user);
                const redirectTo = searchParams.get("redirectTo") || undefined;
                navigate(getRedirectPathAfterLogin(admin, redirectTo));
            })
            .catch((error) => {
                if (error.code !== "auth/no-auth-event") {
                    setGoogleError(getAuthErrorMessage(error.code));
                }
            })
            .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function showRegisterPanel() {
        setGoogleError(null);
        setAppleError(null);
        setIsActive(true);
    }

    function showLoginPanel() {
        setGoogleError(null);
        setAppleError(null);
        setIsForgot(false);
        setForgotStatus(null);
        setForgotEmail("");
        setIsActive(false);
    }

    function showForgotPanel() {
        setGoogleError(null);
        setAppleError(null);
        setForgotStatus(null);
        setIsForgot(true);
    }

    async function handleForgotSubmit(event) {
        event.preventDefault();
        setForgotStatus(null);
        setIsLoading(true);

        try {
            await sendPasswordResetEmail(auth, forgotEmail, {
                url: window.location.origin + "/login",
                handleCodeInApp: false,
            });
            setForgotStatus({ type: "success", message: "Link enviado! Verifique sua caixa de entrada (e a pasta de spam)." });
        } catch (error) {
            setForgotStatus({ type: "error", message: getAuthErrorMessage(error.code) });
        } finally {
            setIsLoading(false);
        }
    }

    async function handleGoogleLogin(event) {
        event.preventDefault();
        setGoogleError(null);
        setIsLoading(true);

        try {
            await setPersistence(auth, browserLocalPersistence);

            if (isMobileBrowser()) {
                await signInWithRedirect(auth, googleProvider);
                return; // page will reload; result handled in useEffect above
            }

            const result = await signInWithPopup(auth, googleProvider);
            const userCredential = result.user;
            setRememberMeExpiry();

            await waitForAuth();
            const admin = await isUserAdmin(userCredential);
            const redirectTo = searchParams.get("redirectTo") || undefined;
            navigate(getRedirectPathAfterLogin(admin, redirectTo));
        } catch (error) {
            const friendlyMessage = getAuthErrorMessage(error.code);
            setGoogleError(friendlyMessage);
            setIsLoading(false);
        }
    }

    async function handleAppleLogin(event) {
        event.preventDefault();
        setAppleError(null);
        setIsLoading(true);

        try {
            await setPersistence(auth, browserLocalPersistence);

            if (isMobileBrowser()) {
                await signInWithRedirect(auth, appleProvider);
                return;
            }

            const result = await signInWithPopup(auth, appleProvider);
            const userCredential = result.user;
            setRememberMeExpiry();

            await waitForAuth();
            const admin = await isUserAdmin(userCredential);
            const redirectTo = searchParams.get("redirectTo") || undefined;
            navigate(getRedirectPathAfterLogin(admin, redirectTo));
        } catch (error) {
            const friendlyMessage = getAuthErrorMessage(error.code);
            setAppleError(friendlyMessage);
            setIsLoading(false);
        }
    }

    return (
        <div className={styles.page}>
            <div
                className={styles.container}
                data-active={isActive ? "true" : "false"}
            >
                {/* Sign Up */}
                <div className={`${styles.formContainer} ${styles.signUp}`}>
                    <registerFetcher.Form
                        method="post"
                        action="/register"
                        ref={registerFormRef}
                        className={styles.form}
                        onKeyDown={function handleEnterSubmitRegister(event) {
                            if (event.key !== "Enter" || isLoading) return;
                            if (
                                registerFormRef.current &&
                                typeof registerFormRef.current.requestSubmit ===
                                    "function"
                            ) {
                                event.preventDefault();
                                registerFormRef.current.requestSubmit();
                            }
                        }}
                    >
                        <h1 className={styles.title}>Criar conta</h1>

                        {(registerFetcher.data || googleError) && (
                            <div className={styles.errorMessage} role="alert">
                                <p>
                                    {registerFetcher.data?.message ||
                                        googleError}
                                </p>
                            </div>
                        )}

                        <input
                            className={styles.input}
                            type="text"
                            placeholder="Nome"
                            name="firstName"
                            id="firstName"
                            aria-label="Nome"
                            required
                        />
                        <input
                            className={styles.input}
                            type="text"
                            placeholder="Sobrenome"
                            name="lastName"
                            id="lastName"
                            aria-label="Sobrenome"
                            required
                        />
                        <input
                            className={styles.input}
                            type="email"
                            placeholder="E-mail"
                            name="email"
                            id="email"
                            aria-label="E-mail"
                            required
                        />
                        <input
                            className={styles.input}
                            type="tel"
                            placeholder="Telefone (opcional)"
                            name="phone"
                            id="phone"
                            aria-label="Telefone"
                        />

                        <div className={styles.passwordWrapper}>
                            <input
                                className={styles.input}
                                type={showPassword ? "text" : "password"}
                                name="password"
                                id="registerPassword"
                                placeholder="Senha"
                                aria-label="Senha"
                                required
                                minLength={6}
                            />
                            <span
                                className={styles.eyeIcon}
                                onClick={function togglePassword() {
                                    setShowPassword(!showPassword);
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={
                                    showPassword
                                        ? "Ocultar senha"
                                        : "Mostrar senha"
                                }
                            >
                                {showPassword ? <FaEye /> : <FaEyeSlash />}
                            </span>
                        </div>

                        <div className={styles.passwordWrapper}>
                            <input
                                className={styles.input}
                                type={
                                    showConfirmPassword
                                        ? "text"
                                        : "password"
                                }
                                name="confirmPassword"
                                id="registerConfirmPassword"
                                placeholder="Confirmar senha"
                                aria-label="Confirmar senha"
                                required
                                minLength={6}
                            />
                            <span
                                className={styles.eyeIcon}
                                onClick={function toggleConfirmPassword() {
                                    setShowConfirmPassword(
                                        !showConfirmPassword
                                    );
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={
                                    showConfirmPassword
                                        ? "Ocultar senha"
                                        : "Mostrar senha"
                                }
                            >
                                {showConfirmPassword ? (
                                    <FaEye />
                                ) : (
                                    <FaEyeSlash />
                                )}
                            </span>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitButton}
                            aria-label="Criar conta"
                            disabled={isLoading}
                        >
                            {isLoading ? "Criando conta..." : "Criar conta"}
                        </button>

                        <p className={styles.registerPrompt}>
                            Já tem uma conta?{" "}
                            <button
                                type="button"
                                className={styles.registerLinkButton}
                                onClick={showLoginPanel}
                            >
                                Fazer login
                            </button>
                        </p>
                    </registerFetcher.Form>
                </div>

                {/* Sign In */}
                <div className={`${styles.formContainer} ${styles.signIn}`}>
                    {isForgot ? (
                        <form
                            onSubmit={handleForgotSubmit}
                            className={styles.form}
                        >
                            <h1 className={styles.title}>Recuperar senha</h1>

                            <p className={styles.forgotSubtitle}>
                                Informe seu e-mail e enviaremos um link para
                                redefinir sua senha.
                            </p>

                            {forgotStatus?.type === "success" && (
                                <div className={styles.successMessage} role="status">
                                    <p>{forgotStatus.message}</p>
                                </div>
                            )}
                            {forgotStatus?.type === "error" && (
                                <div className={styles.errorMessage} role="alert">
                                    <p>{forgotStatus.message}</p>
                                </div>
                            )}

                            <input
                                className={styles.input}
                                type="email"
                                placeholder="E-mail"
                                aria-label="E-mail para recuperação"
                                value={forgotEmail}
                                onChange={function (e) { setForgotEmail(e.target.value); }}
                                required
                                autoFocus
                            />

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isLoading || forgotStatus?.type === "success"}
                            >
                                {isLoading ? "Enviando..." : "Enviar link"}
                            </button>

                            <button
                                type="button"
                                className={styles.registerLinkButton}
                                onClick={showLoginPanel}
                            >
                                ← Voltar ao login
                            </button>
                        </form>
                    ) : (
                        <loginFetcher.Form
                            method="post"
                            action="/login"
                            ref={formRef}
                            className={styles.form}
                            onKeyDown={function handleEnterSubmitLogin(event) {
                                if (event.key !== "Enter" || isLoading) return;
                                if (
                                    formRef.current &&
                                    typeof formRef.current.requestSubmit ===
                                        "function"
                                ) {
                                    event.preventDefault();
                                    formRef.current.requestSubmit();
                                }
                            }}
                        >
                            <h1 className={styles.title}>Entrar</h1>

                            {(loginFetcher.data || googleError || appleError) && (
                                <div className={styles.errorMessage} role="alert">
                                    <p>
                                        {loginFetcher.data?.message || googleError || appleError}
                                    </p>
                                </div>
                            )}
                            {message && !loginFetcher.data && !googleError && (
                                <div className={styles.errorMessage} role="alert">
                                    <p>{message}</p>
                                </div>
                            )}

                            <input
                                className={styles.input}
                                type="text"
                                placeholder="E-mail ou usuário"
                                name="user"
                                id="loginUser"
                                aria-label="E-mail ou usuário"
                                required
                            />
                            <div className={styles.passwordWrapper}>
                                <input
                                    className={styles.input}
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    id="loginPassword"
                                    placeholder="Senha"
                                    aria-label="Senha"
                                    required
                                />
                                <span
                                    className={styles.eyeIcon}
                                    onClick={function togglePassword() {
                                        setShowPassword(!showPassword);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={
                                        showPassword
                                            ? "Ocultar senha"
                                            : "Mostrar senha"
                                    }
                                >
                                    {showPassword ? <FaEye /> : <FaEyeSlash />}
                                </span>
                            </div>

                            <button
                                type="button"
                                className={styles.forgotLink}
                                onClick={showForgotPanel}
                            >
                                Esqueceu a senha?
                            </button>

                            <div className={styles.rememberRow}>
                                <input
                                    className={styles.checkbox}
                                    type="checkbox"
                                    name="rememberpassword"
                                    id="rememberpassword"
                                    aria-label="Lembrar senha por 7 dias"
                                />
                                <label htmlFor="rememberpassword">
                                    Lembrar-me por 7 dias
                                </label>
                            </div>

                            <button
                                type="submit"
                                className={styles.submitButton}
                                aria-label="Entrar"
                                disabled={isLoading}
                            >
                                {isLoading ? "Entrando..." : "Entrar"}
                            </button>

                            <span className={styles.dividerText}>ou</span>

                            <button
                                type="button"
                                className={styles.googleButton}
                                onClick={handleGoogleLogin}
                                aria-label="Entrar com Google"
                                disabled={isLoading}
                            >
                                <FcGoogle className={styles.googleIcon} />
                                Continuar com Google
                            </button>

                            {/* Apple Sign-In — ativar após configurar provider no Firebase Console
                            <button
                                type="button"
                                className={styles.appleButton}
                                onClick={handleAppleLogin}
                                aria-label="Entrar com Apple"
                                disabled={isLoading}
                            >
                                <FaApple className={styles.appleIcon} />
                                Continuar com Apple
                            </button>
                            */}

                            <p className={styles.registerPrompt}>
                                Não tem conta?{" "}
                                <button
                                    type="button"
                                    className={styles.registerLinkButton}
                                    onClick={showRegisterPanel}
                                >
                                    Criar conta
                                </button>
                            </p>
                        </loginFetcher.Form>
                    )}
                </div>

                {/* Toggle: decorative panel without image background */}
                <div className={styles.toggleContainer}>
                    <div className={styles.toggle}>
                        <div
                            className={`${styles.togglePanel} ${styles.toggleLeft}`}
                        >
                            <h1 className={styles.toggleTitle}>
                                Bem-vindo de volta
                            </h1>
                            <p className={styles.toggleText}>
                                Acesse sua conta e continue sua experiência
                                conosco.
                            </p>
                            <button
                                type="button"
                                className={styles.hiddenButton}
                                onClick={showLoginPanel}
                            >
                                Entrar
                            </button>
                        </div>
                        <div
                            className={`${styles.togglePanel} ${styles.toggleRight}`}
                        >
                            <h1 className={styles.toggleTitle}>
                                Sua jornada começa aqui
                            </h1>
                            <p className={styles.toggleText}>
                                Crie sua conta e descubra uma curadoria pensada
                                para momentos especiais.
                            </p>
                            <button
                                type="button"
                                className={styles.hiddenButton}
                                onClick={showRegisterPanel}
                            >
                                Criar conta
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
