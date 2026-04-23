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
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import {
    auth,
    createOrUpdateCustomer,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    googleProvider,
} from "../firebase";
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
    const redirectTo = new URL(request.url).searchParams.get("redirectTo");

    try {
        await signInWithEmailAndPassword(auth, user, password);

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

    function showRegisterPanel() {
        setGoogleError(null);
        setIsActive(true);
    }

    function showLoginPanel() {
        setGoogleError(null);
        setIsActive(false);
    }

    async function handleGoogleLogin(event) {
        event.preventDefault();
        setGoogleError(null);
        setIsLoading(true);

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const userCredential = result.user;

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

                        {(loginFetcher.data || googleError) && (
                            <div className={styles.errorMessage} role="alert">
                                <p>
                                    {loginFetcher.data?.message || googleError}
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
