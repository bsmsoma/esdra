import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { getCustomerByUid, submitDataRightsRequest } from "../firebase";
import styles from "./DataRights.module.scss";

const REQUEST_TYPES = [
    { value: "", label: "Selecione o tipo de solicitação..." },
    { value: "access", label: "Acesso — quero saber quais dados vocês têm sobre mim (art. 18, I e II)" },
    { value: "correction", label: "Correção — meus dados estão incorretos ou desatualizados (art. 18, III)" },
    { value: "deletion", label: "Exclusão — quero que meus dados sejam apagados (art. 18, VI)" },
    { value: "portability", label: "Portabilidade — quero receber meus dados em formato portável (art. 18, V)" },
    { value: "revoke_consent", label: "Revogação de consentimento — quero retirar meu consentimento (art. 18, IX)" },
    { value: "info_sharing", label: "Compartilhamento — quero saber com quem meus dados foram compartilhados (art. 18, VII)" },
    { value: "opposition", label: "Oposição — me oponho a um tratamento específico dos meus dados (art. 18, II)" },
    { value: "other", label: "Outro" },
];

export default function DataRights() {
    const { user } = useAuth();
    const [form, setForm] = useState({ requestType: "", name: "", email: "", cpf: "", description: "", confirm: false });
    const [status, setStatus] = useState("idle"); // idle | loading | success | error
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(function prefillIfLoggedIn() {
        if (!user) return;
        async function load() {
            try {
                const customer = await getCustomerByUid(user.uid);
                setForm(function (prev) {
                    return {
                        ...prev,
                        name: customer ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() : prev.name,
                        email: customer?.email || user.email || prev.email,
                    };
                });
            } catch {
                // pré-preenchimento é melhor-esforço
            }
        }
        load();
    }, [user]);

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setForm(function (prev) {
            return { ...prev, [name]: type === "checkbox" ? checked : value };
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.requestType || !form.name || !form.email || !form.description || !form.confirm) return;

        setStatus("loading");
        setErrorMsg("");

        try {
            await submitDataRightsRequest({
                requestType: form.requestType,
                name: form.name,
                email: form.email,
                cpf: form.cpf,
                description: form.description,
                uid: user?.uid || null,
            });
            setStatus("success");
        } catch (err) {
            setErrorMsg("Não foi possível enviar sua solicitação. Tente novamente ou entre em contato por e-mail.");
            setStatus("error");
        }
    }

    if (status === "success") {
        return (
            <div className={styles.page}>
                <div className={styles.successBox}>
                    <span className={styles.successIcon} aria-hidden="true">✓</span>
                    <h1>Solicitação recebida</h1>
                    <p>
                        Recebemos sua solicitação e responderemos em até <strong>15 dias úteis</strong> no
                        e-mail <strong>{form.email}</strong>.
                    </p>
                    <p>
                        Caso não receba resposta nesse prazo, entre em contato diretamente em{" "}
                        <a href="mailto:privacidade@esdraaromas.com.br">privacidade@esdraaromas.com.br</a>.
                    </p>
                    <Link to="/" className={styles.backLink}>Voltar para a loja</Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Exercício de Direitos — LGPD</h1>
                <p>
                    Use este formulário para exercer seus direitos como titular de dados pessoais,
                    conforme o art. 18 da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
                    Respondemos em até <strong>15 dias úteis</strong>.
                </p>
                <p>
                    Também pode enviar sua solicitação diretamente para{" "}
                    <a href="mailto:privacidade@esdraaromas.com.br">privacidade@esdraaromas.com.br</a>.{" "}
                    <Link to="/politica-de-privacidade">Leia nossa Política de Privacidade.</Link>
                </p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <div className={styles.field}>
                    <label htmlFor="requestType">Tipo de solicitação <span aria-hidden="true">*</span></label>
                    <select
                        id="requestType"
                        name="requestType"
                        value={form.requestType}
                        onChange={handleChange}
                        required
                        className={styles.input}
                    >
                        {REQUEST_TYPES.map(function (t) {
                            return <option key={t.value} value={t.value}>{t.label}</option>;
                        })}
                    </select>
                </div>

                <div className={styles.row}>
                    <div className={styles.field}>
                        <label htmlFor="name">Nome completo <span aria-hidden="true">*</span></label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={form.name}
                            onChange={handleChange}
                            required
                            autoComplete="name"
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="email">E-mail <span aria-hidden="true">*</span></label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                            className={styles.input}
                        />
                    </div>
                </div>

                <div className={styles.field}>
                    <label htmlFor="cpf">
                        CPF <span className={styles.optional}>(opcional — ajuda a identificar sua conta)</span>
                    </label>
                    <input
                        id="cpf"
                        name="cpf"
                        type="text"
                        value={form.cpf}
                        onChange={handleChange}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        className={`${styles.input} ${styles.inputNarrow}`}
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="description">Descreva sua solicitação <span aria-hidden="true">*</span></label>
                    <textarea
                        id="description"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        required
                        rows={5}
                        placeholder="Descreva com detalhes o que você está solicitando..."
                        className={styles.textarea}
                    />
                </div>

                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        name="confirm"
                        checked={form.confirm}
                        onChange={handleChange}
                        required
                        className={styles.checkbox}
                    />
                    <span>
                        Confirmo que sou o titular dos dados informados acima e que esta solicitação
                        é feita em meu próprio nome.
                    </span>
                </label>

                {status === "error" && (
                    <p className={styles.errorMsg} role="alert">{errorMsg}</p>
                )}

                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={status === "loading" || !form.requestType || !form.name || !form.email || !form.description || !form.confirm}
                >
                    {status === "loading" ? "Enviando..." : "Enviar solicitação"}
                </button>
            </form>
        </div>
    );
}
