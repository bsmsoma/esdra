import styles from "./BannerTop.module.scss";

export default function BannerTop() {
    return (
        <div className={styles.bannerTop} role="status" aria-live="polite">
            <p className={styles.bannerText}>
                ESDRA: Velas aromáticas | Sabonetes artesanais | Difusores | Kits de autocuidado
            </p>
        </div>
    );
}
