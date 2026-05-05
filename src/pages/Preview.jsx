import React from "react";
import { toast } from "react-toastify";
import styles from "./Preview.module.scss";

// ─── Toast samples ────────────────────────────────────────────────────────────

const TOAST_SAMPLES = [
    { type: "success", label: "Produto adicionado ao carrinho." },
    { type: "error",   label: "Ops! Algo deu errado. Tente novamente." },
    { type: "warning", label: "Estoque limitado para este item." },
    { type: "info",    label: "Seu pedido está a caminho." },
];

function ToastSample({ type, label }) {
    return (
        <div className={`Toastify__toast Toastify__toast-theme--light Toastify__toast--${type}`} style={{ position: "static" }}>
            <div className="Toastify__toast-icon">
                <svg viewBox="0 0 24 24" width="100%" height="100%" fill={`var(--toastify-icon-color-${type})`}>
                    <path d="M12 0a12 12 0 1012 12A12.014 12.014 0 0012 0zm6.927 8.2l-6.845 9.289a1.011 1.011 0 01-1.43.188l-4.888-3.908a1 1 0 111.25-1.562l4.076 3.261 6.227-8.451a1 1 0 111.61 1.183z" />
                </svg>
            </div>
            {label}
            <button className="Toastify__close-button Toastify__close-button--light" type="button" aria-label="fechar">
                <svg aria-hidden="true" viewBox="0 0 14 16">
                    <path fillRule="evenodd" d="M7.71 8.23l3.75 3.75-1.48 1.48-3.75-3.75-3.75 3.75L1 11.98l3.75-3.75L1 4.48 2.48 3l3.75 3.75L9.98 3l1.48 1.48-3.75 3.75z" />
                </svg>
            </button>
            <div className="Toastify__progress-bar--wrp">
                <div className={`Toastify__progress-bar--bg Toastify__progress-bar-theme--light Toastify__progress-bar--${type}`} />
                <div
                    className={`Toastify__progress-bar Toastify__progress-bar-theme--light Toastify__progress-bar--${type}`}
                    style={{ transform: "scaleX(0.6)", transformOrigin: "left" }}
                />
            </div>
        </div>
    );
}

// ─── Preview page ─────────────────────────────────────────────────────────────

export default function Preview() {
    return (
        <div className={styles.page}>
            <header className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Preview</h1>
                <p className={styles.pageSubtitle}>Sandbox de componentes — só visível em dev</p>
            </header>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Toasts — estático</h2>
                <div className={styles.toastList}>
                    {TOAST_SAMPLES.map(function(t) {
                        return <ToastSample key={t.type} {...t} />;
                    })}
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Toasts — real</h2>
                <div className={styles.triggerRow}>
                    <button className={styles.triggerBtn} onClick={function() { toast.success("Produto adicionado ao carrinho."); }}>success</button>
                    <button className={styles.triggerBtn} onClick={function() { toast.error("Ops! Algo deu errado. Tente novamente."); }}>error</button>
                    <button className={styles.triggerBtn} onClick={function() { toast.warning("Estoque limitado para este item."); }}>warning</button>
                    <button className={styles.triggerBtn} onClick={function() { toast.info("Seu pedido está a caminho."); }}>info</button>
                </div>
            </section>
        </div>
    );
}
