import { useRouteError, isRouteErrorResponse, Link } from "react-router";
import styles from "./RouteError.module.scss";

export default function RouteError() {
    const error = useRouteError();

    let title = "Algo deu errado";
    let message = "Ocorreu um erro inesperado. Tente novamente em instantes.";

    if (isRouteErrorResponse(error)) {
        if (error.status === 404) {
            title = "Página não encontrada";
            message = "A página que você procura não existe ou foi removida.";
        } else if (error.status === 403) {
            title = "Acesso negado";
            message = "Você não tem permissão para acessar esta página.";
        } else if (error.status === 401) {
            title = "Não autenticado";
            message = "Faça login para continuar.";
        }
    } else if (
        error?.code === "permission-denied" ||
        error?.message?.includes("Missing or insufficient permissions")
    ) {
        title = "Sem permissão";
        message = "Não foi possível carregar esta página. Faça login e tente novamente.";
    } else if (error?.message?.includes("não encontrado")) {
        title = "Não encontrado";
        message = error.message;
    }

    return (
        <div className={styles.wrap}>
            <div className={styles.inner}>
                <span className={styles.code} aria-hidden="true">!</span>
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <Link to="/" className={styles.btnPrimary}>
                        Voltar ao início
                    </Link>
                    <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={function() { window.location.reload(); }}
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        </div>
    );
}
