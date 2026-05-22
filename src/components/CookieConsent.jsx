import { useState, useEffect } from "react";
import { Link } from "react-router";
import { getConsentStatus, grantConsent, revokeConsent } from "../utils/analytics-loader";
import styles from "./CookieConsent.module.scss";

export default function CookieConsent() {
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);

    useEffect(function checkConsent() {
        if (getConsentStatus() === null) {
            setVisible(true);
        }
    }, []);

    function dismiss() {
        setLeaving(true);
    }

    function handleAnimationEnd() {
        if (leaving) setVisible(false);
    }

    function handleAccept() {
        grantConsent();
        dismiss();
    }

    function handleReject() {
        revokeConsent();
        dismiss();
    }

    if (!visible) return null;

    return (
        <div
            className={`${styles.banner} ${leaving ? styles.leaving : styles.entering}`}
            onAnimationEnd={handleAnimationEnd}
            role="dialog"
            aria-label="Aviso de cookies"
            aria-live="polite"
        >
            <div className={styles.content}>
                <p className={styles.text}>
                    Usamos cookies de analytics para entender como você usa nossa loja e melhorar sua
                    experiência. Você pode aceitar ou recusar.{" "}
                    <Link to="/politica-de-privacidade" className={styles.link}>
                        Saiba mais
                    </Link>
                    .
                </p>
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.rejectButton}
                        onClick={handleReject}
                    >
                        Recusar
                    </button>
                    <button
                        type="button"
                        className={styles.acceptButton}
                        onClick={handleAccept}
                    >
                        Aceitar cookies
                    </button>
                </div>
            </div>
        </div>
    );
}
