import { useAuth } from "../contexts/AuthContext";
import { getCustomerByUid, createOrUpdateCustomer } from "../firebase";
import { useEffect, useState, useRef } from "react";
import { Form, useActionData, redirect } from "react-router";
import styles from "./Profile.module.scss";

/**
 * Formats a phone string to (DDD) XXXXX-XXXX (cell) or (DDD) XXXX-XXXX (landline).
 * Accepts raw digits or already formatted strings.
 */
function formatPhoneWithDdd(phone) {
    if (!phone || typeof phone !== "string") return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 0) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export async function updateProfileAction({ request }) {
    const formData = await request.formData();
    const uid = formData.get("uid");
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const phone = formData.get("phone");
    const document = formData.get("document");
    const emailRaw = formData.get("email");
    const emailTrimmed =
        emailRaw != null && String(emailRaw).trim() !== ""
            ? String(emailRaw).trim()
            : null;

    try {
        const payload = {
            firstName: firstName,
            lastName: lastName,
            phone: formatPhoneWithDdd(phone || "") || "",
            document: String(document || "").trim(),
        };
        if (emailTrimmed) {
            payload.email = emailTrimmed;
        }

        await createOrUpdateCustomer(uid, payload);

        return redirect("/account/profile?message=Perfil atualizado com sucesso!&type=success");
    } catch (error) {
        return {
            error: error.message,
        };
    }
}

export default function Profile() {
    const { user } = useAuth();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const actionData = useActionData();
    const phoneInputRef = useRef(null);

    useEffect(function loadCustomer() {
        async function fetchCustomer() {
            if (user) {
                try {
                    const customerData = await getCustomerByUid(user.uid);
                    setCustomer(customerData);
                } catch (error) {
                    console.error("Erro ao carregar dados do cliente:", error);
                } finally {
                    setLoading(false);
                }
            }
        }
        fetchCustomer();
    }, [user]);

    if (loading) {
        return <div className={styles.loading}>Carregando...</div>;
    }

    if (!customer) {
        return <div className={styles.error}>Erro ao carregar dados do perfil</div>;
    }

    return (
        <div className={styles.profile}>
            <h1 className={styles.title}>Meu Perfil</h1>

            {actionData?.error && (
                <div className={styles.errorMessage}>
                    {actionData.error}
                </div>
            )}

            <Form method="post" className={styles.form}>
                <input type="hidden" name="uid" value={user.uid} />

                <div className={styles.formGroup}>
                    <label htmlFor="email">E-mail:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        defaultValue={customer.email || user.email || ""}
                        required
                        readOnly
                        aria-readonly="true"
                        className={styles.input}
                        title="O e-mail vem da sua conta e não pode ser alterado aqui"
                    />
                    <p className={styles.helpText}>O e-mail não pode ser alterado</p>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="firstName">Nome:</label>
                    <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        defaultValue={customer.firstName || ""}
                        required
                        className={styles.input}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="lastName">Sobrenome:</label>
                    <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        defaultValue={customer.lastName || ""}
                        required
                        className={styles.input}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="document">Documento (CPF):</label>
                    <input
                        type="text"
                        id="document"
                        name="document"
                        defaultValue={customer.document || ""}
                        placeholder="000.000.000-00"
                        required
                        className={styles.input}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="phone">Telefone:</label>
                    <input
                        ref={phoneInputRef}
                        type="tel"
                        id="phone"
                        name="phone"
                        defaultValue={formatPhoneWithDdd(customer.phone || "")}
                        placeholder="(00) 00000-0000"
                        className={styles.input}
                        onBlur={function formatPhoneOnBlur() {
                            const el = phoneInputRef.current;
                            if (!el) return;
                            el.value = formatPhoneWithDdd(el.value);
                        }}
                    />
                </div>

                <button type="submit" className={styles.submitButton}>
                    Salvar Alterações
                </button>
            </Form>
        </div>
    );
}
